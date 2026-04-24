// Google Calendar sync. Pulls events for a connected user and upserts
// them into `upcomingMeetings` with source="google".
//
// Strategy:
//   • First sync (no stored syncToken) → full fetch of the next 30 days
//     with timeMin/timeMax. Store nextSyncToken from the final page so
//     later runs are incremental.
//   • Subsequent syncs → pass syncToken. Google returns only changed /
//     cancelled events since that token. Cancelled events arrive as
//     tombstones (status:"cancelled") and we delete the row.
//   • On 410 Gone (token expired, typically after ~30 days of inactivity
//     or calendar settings change) → drop the token, do a fresh full
//     sync on the next run.
//
// The sync is idempotent (`_upsertFromGoogle` matches by external id),
// so re-running is cheap.

"use node";

import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getValidAccessToken } from "./googleAuth";
import type { Doc, Id } from "./_generated/dataModel";

const CALENDAR_ID = "primary";
const SYNC_WINDOW_DAYS = 30;
// 50 pages × 250 events = 12,500 events per run. Well above a realistic
// 30-day calendar. If we ever hit this cap we log a warning and refuse
// to persist the partial syncToken (see the MAX_PAGES branch below) so
// the next cron run retries from the same point rather than skipping
// events on the un-fetched pages.
const MAX_PAGES = 50;

type GoogleEventDateTime = { dateTime?: string; date?: string; timeZone?: string };

interface GoogleEvent {
  id: string;
  status?: string; // "confirmed" | "tentative" | "cancelled"
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  attendees?: Array<{ displayName?: string; email?: string; self?: boolean }>;
}

interface EventsListResponse {
  items: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

/** Convert a Google event time (dateTime or date) to epoch ms. All-day
 * events use `date` which is a YYYY-MM-DD string — we treat them as
 * starting at local midnight UTC to keep sortability simple. */
function toEpochMs(edt: GoogleEventDateTime | undefined): number | undefined {
  if (!edt) return undefined;
  if (edt.dateTime) {
    const ms = Date.parse(edt.dateTime);
    return Number.isFinite(ms) ? ms : undefined;
  }
  if (edt.date) {
    const ms = Date.parse(`${edt.date}T00:00:00Z`);
    return Number.isFinite(ms) ? ms : undefined;
  }
  return undefined;
}

function formatAttendee(a: {
  displayName?: string;
  email?: string;
  self?: boolean;
}): string | null {
  if (a.self) return null; // the user themselves — UI strips this already
  return a.displayName || a.email || null;
}

/** Public: trigger a sync for the authenticated user right now. Used
 * by the "Sync now" button on the Settings panel. */
export const syncNow = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; reason?: string; stats?: Stats }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await syncForUser(ctx, userId);
  },
});

/** Internal: cron-callable sync for a specific user. */
export const _syncUser = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{ ok: boolean; reason?: string; stats?: Stats }> => {
    return await syncForUser(ctx, args.userId);
  },
});

/** Internal: iterate every connected user and run a sync. Called from
 * the hourly cron tick. */
export const _syncAllConnected = internalAction({
  args: {},
  handler: async (ctx): Promise<{ attempted: number; ok: number; failed: number }> => {
    const userIds = (await ctx.runQuery(
      internal.googleAuthHelpers._listConnectedUserIds,
      {},
    )) as Id<"users">[];
    let ok = 0;
    let failed = 0;
    for (const uid of userIds) {
      try {
        const r = await syncForUser(ctx, uid);
        if (r.ok) ok++;
        else failed++;
      } catch (e) {
        console.warn("[googleCalendar.cron] user sync threw", uid, e);
        failed++;
      }
    }
    return { attempted: userIds.length, ok, failed };
  },
});

// ── core per-user sync ───────────────────────────────

interface Stats {
  pages: number;
  inserted: number;
  updated: number;
  deleted: number;
  fullSync: boolean;
}

async function syncForUser(
  ctx: ActionCtx,
  userId: Id<"users">,
): Promise<{ ok: boolean; reason?: string; stats?: Stats }> {
  const tokenResult = await getValidAccessToken(userId);
  if (tokenResult === null || tokenResult === "invalid_grant") {
    // `invalid_grant` = refresh token revoked by the user on Google's
    // side (or expired). Flip our record to disconnected so the
    // Settings UI prompts reconnection and the cron stops hammering a
    // dead token every 15 minutes.
    if (tokenResult === "invalid_grant") {
      await ctx.runMutation(internal.googleAuthHelpers._markDisconnected, {
        userId,
      });
      return { ok: false, reason: "token-revoked" };
    }
    await ctx.runMutation(internal.googleAuthHelpers._markSynced, {
      userId,
      syncedAt: Date.now(),
      error: "not-connected",
    });
    return { ok: false, reason: "not-connected" };
  }
  const token = tokenResult;

  const existingState = (await ctx.runQuery(
    internal.googleAuthHelpers._getSyncState,
    { userId },
  )) as Doc<"googleCalendarSyncState"> | null;

  const now = Date.now();
  const timeMin = new Date(now).toISOString();
  const timeMax = new Date(now + SYNC_WINDOW_DAYS * 86400000).toISOString();

  const stats: Stats = {
    pages: 0,
    inserted: 0,
    updated: 0,
    deleted: 0,
    fullSync: !existingState?.syncToken,
  };

  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  const syncTokenParam = existingState?.syncToken;
  // Track external IDs we've upserted in THIS run so we can
  // mark-and-sweep stale Google events after a full resync. Skipped on
  // incremental syncs — those are already source-of-truth for deletes
  // via the `status:"cancelled"` tombstone path.
  const seenExternalIds: string[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        CALENDAR_ID,
      )}/events`,
    );
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("maxResults", "250");
    if (syncTokenParam) {
      // Incremental: syncToken is INCOMPATIBLE with timeMin/timeMax/
      // orderBy. We filter the 30-day window client-side during upsert.
      url.searchParams.set("syncToken", syncTokenParam);
    } else {
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("orderBy", "startTime");
    }
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 410) {
      // Sync token expired. Clear it and let the next run do a full sync.
      await ctx.runMutation(internal.googleAuthHelpers._upsertSyncState, {
        userId,
        calendarId: CALENDAR_ID,
        syncToken: undefined,
        lastFullSyncAt: undefined,
      });
      await ctx.runMutation(internal.googleAuthHelpers._markSynced, {
        userId,
        syncedAt: Date.now(),
        error: "sync-token-expired",
      });
      return { ok: false, reason: "sync-token-expired", stats };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      await ctx.runMutation(internal.googleAuthHelpers._markSynced, {
        userId,
        syncedAt: Date.now(),
        error: `${res.status} ${body.slice(0, 200)}`,
      });
      return { ok: false, reason: `http-${res.status}`, stats };
    }

    const data = (await res.json()) as EventsListResponse;
    stats.pages++;

    for (const evt of data.items) {
      if (!evt.id) continue;
      const cancelled = evt.status === "cancelled";
      if (cancelled) {
        const result = (await ctx.runMutation(
          internal.upcomingMeetings._upsertFromGoogle,
          {
            userId,
            externalId: evt.id,
            cancelled: true,
          },
        )) as { action: string };
        if (result.action === "deleted") stats.deleted++;
        continue;
      }

      const startMs = toEpochMs(evt.start);
      const endMs = toEpochMs(evt.end);
      if (startMs === undefined || endMs === undefined) continue;

      // Incremental sync returns events outside the 30-day window (any
      // modified event since the token). Skip those client-side so we
      // don't store ancient history in upcomingMeetings.
      if (syncTokenParam && (endMs < now || startMs > now + SYNC_WINDOW_DAYS * 86400000)) {
        continue;
      }

      const attendees = (evt.attendees ?? [])
        .map(formatAttendee)
        .filter((a): a is string => !!a);

      const result = (await ctx.runMutation(
        internal.upcomingMeetings._upsertFromGoogle,
        {
          userId,
          externalId: evt.id,
          cancelled: false,
          title: evt.summary ?? "(untitled)",
          description: evt.description,
          startedAt: startMs,
          endedAt: endMs,
          attendees,
          location: evt.location,
          htmlLink: evt.htmlLink,
        },
      )) as { action: string };
      if (result.action === "inserted") stats.inserted++;
      else if (result.action === "updated") stats.updated++;
      // Only track seen IDs during a full sync — that's when we'll
      // sweep. During incremental we only see *changes*, so an ID not
      // in this set doesn't mean it's stale.
      if (stats.fullSync) seenExternalIds.push(evt.id);
    }

    pageToken = data.nextPageToken;
    nextSyncToken = data.nextSyncToken;
    if (!pageToken) break;

    // MAX_PAGES hit but we still have more pages. Don't persist the
    // partial syncToken (Google only returns it on the last page
    // anyway, but belt-and-braces), and fail the run so the user /
    // cron can retry from the same point.
    if (page === MAX_PAGES - 1 && pageToken) {
      await ctx.runMutation(internal.googleAuthHelpers._markSynced, {
        userId,
        syncedAt: Date.now(),
        error: "hit-max-pages",
      });
      console.warn(
        "[googleCalendar] user",
        userId,
        "hit MAX_PAGES with pending pageToken — will retry next tick",
      );
      return { ok: false, reason: "max-pages", stats };
    }
  }

  // After a full resync drained every page, prune stale Google events
  // from our DB that no longer appear in the calendar. This catches
  // events the user deleted while our syncToken was gone / never set,
  // which the incremental tombstone path would have otherwise missed.
  if (stats.fullSync) {
    const pruneRes = (await ctx.runMutation(
      internal.upcomingMeetings._pruneStaleGoogleEvents,
      {
        userId,
        seenExternalIds,
        windowStart: now,
        windowEnd: now + SYNC_WINDOW_DAYS * 86400000,
      },
    )) as { deleted: number };
    stats.deleted += pruneRes.deleted;
  }

  // Only persist the new syncToken once we drained every page — a
  // partial persist would cause us to miss events in the unfetched
  // pages next run.
  if (nextSyncToken) {
    await ctx.runMutation(internal.googleAuthHelpers._upsertSyncState, {
      userId,
      calendarId: CALENDAR_ID,
      syncToken: nextSyncToken,
      lastFullSyncAt: stats.fullSync ? Date.now() : undefined,
    });
  }

  await ctx.runMutation(internal.googleAuthHelpers._markSynced, {
    userId,
    syncedAt: Date.now(),
    error: undefined,
  });

  return { ok: true, stats };
}
