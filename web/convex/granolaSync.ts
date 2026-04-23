// Granola sync — pulls meeting notes from each user's Granola account
// using the Personal API and upserts them into the `meetings` table.
//
// Why polling (not webhooks): Granola has no first-party webhooks. The
// only push-based path goes through Zapier/Unified.to, which would put
// a third-party in the data path and add cost. Polling at hourly cadence
// is well below the 5 req/s sustained rate limit and is plenty real-time
// for "ask the bot about my last meeting".
//
// Architecture mirrors the Telegram dispatcher:
//   - `connectGranola` (public action): user pastes their `grn_…` API key,
//     we verify it against /v1/notes, write to GCP Secret Manager as
//     `byok-{userId}-granola`, and stamp `users.granolaConnectedAt`.
//   - `disconnectGranola` (public action): blank the secret, clear the
//     stamps. Existing meeting rows stay (the user can clean them up
//     manually from the dashboard if they want).
//   - `triggerSync` (public action): manual "Sync now" button — runs
//     the same logic as the cron tick for the current user.
//   - `tick` (internal action, cron-driven): iterates connected users
//     and syncs each.
//
// All Granola HTTP calls funnel through `syncOneUser` so retries, error
// shaping, and pagination live in one place.

"use node";

import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readByokSecret, writeByokSecret } from "./k8s";
import type { Id } from "./_generated/dataModel";

// Granola's Personal API lives on the `public-api` subdomain. `api.granola.ai`
// returns 404 — that's their internal/private endpoint, not the documented one.
const GRANOLA_API = "https://public-api.granola.ai";
const TRANSCRIPT_MAX_BYTES = 800_000; // headroom under Convex's 1MB doc cap

interface GranolaTranscriptSegment {
  speaker?: string;
  text?: string;
  // Granola also returns timestamps and ids; we only need speaker + text
  // for the joined transcript. Anything else is ignored.
}

interface GranolaOwner {
  name?: string;
  email?: string;
}

interface GranolaNote {
  id: string;
  title?: string;
  summary?: string;
  transcript?: GranolaTranscriptSegment[];
  owner?: GranolaOwner;
  attendees?: GranolaOwner[];
  start_time?: string;     // ISO
  end_time?: string;       // ISO
  url?: string;
}

interface GranolaListResponse {
  notes?: GranolaNote[];
  hasMore?: boolean;
  cursor?: string | null;
}

// ── connectGranola ───────────────────────────────────
// Public action: validates the supplied API key by hitting /v1/notes,
// writes it to Secret Manager on success, and stamps the user row. The
// key never reaches Convex storage — we only persist the connection
// timestamp so the dashboard can render "connected" without round-tripping
// to GCP on every render.

export const connectGranola = action({
  args: { apiKey: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const apiKey = args.apiKey.trim();
    if (!apiKey) return { ok: false, reason: "empty-key" };
    if (!apiKey.startsWith("grn_")) {
      return { ok: false, reason: "bad-prefix" };
    }

    // Probe before persisting — otherwise we'd cache a broken key.
    const probe = await fetchGranolaNotes(apiKey, undefined, 1);
    if (!probe.ok) {
      return { ok: false, reason: probe.reason };
    }

    await writeByokSecret(userId, "granola", apiKey);
    await ctx.runMutation(internal.granolaHelpers._markConnected, { userId });
    return { ok: true };
  },
});

// ── disconnectGranola ────────────────────────────────

export const disconnectGranola = action({
  args: {},
  handler: async (ctx): Promise<{ ok: true }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Tombstone the secret (writeByokSecret with "DELETED" — readByokSecret
    // returns null for that sentinel). We don't delete the secret resource
    // itself because GCP versioning makes that costly to undo.
    await writeByokSecret(userId, "granola", "DELETED");
    await ctx.runMutation(internal.granolaHelpers._markDisconnected, { userId });
    return { ok: true };
  },
});

// ── triggerSync (manual "Sync now" from dashboard) ───

export const triggerSync = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ ok: true; created: number; updated: number } | { ok: false; reason: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await syncOneUser(ctx, userId);
  },
});

// ── _syncUser (internal — used by HTTP route for the CLI) ─

export const _syncUser = internalAction({
  args: { userId: v.id("users") },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; created: number; updated: number } | { ok: false; reason: string }> => {
    return await syncOneUser(ctx, args.userId);
  },
});

// ── tick (cron-driven) ───────────────────────────────

export const tick = internalAction({
  args: {},
  handler: async (ctx) => {
    let succeeded = 0;
    let failed = 0;
    let cursor: string | null = null;

    // Walk the users table in pages — every connected user gets synced per
    // tick, no matter how large the table grows. Sequential per-user calls
    // keep us well under Granola's 5 req/s sustained rate limit.
    do {
      const page: { userIds: Id<"users">[]; isDone: boolean; continueCursor: string } =
        await ctx.runQuery(internal.granolaHelpers._listConnectedUserIdsPage, {
          cursor,
        });

      for (const userId of page.userIds) {
        const res = await syncOneUser(ctx, userId);
        if (res.ok) succeeded++;
        else failed++;
      }

      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor !== null);

    return { succeeded, failed };
  },
});

// ── shared sync routine ──────────────────────────────

async function syncOneUser(
  ctx: ActionCtx,
  userId: Id<"users">,
): Promise<{ ok: true; created: number; updated: number } | { ok: false; reason: string }> {
  const apiKey = await readByokSecret(userId, "granola");
  if (!apiKey) {
    await ctx.runMutation(internal.granolaHelpers._markSyncResult, {
      userId,
      error: "no-key",
    });
    return { ok: false, reason: "no-key" };
  }

  let cursor: string | undefined;
  let created = 0;
  let updated = 0;
  let skippedBadNotes = 0;
  // Hard cap on pages per tick — guards a single tick from running for too
  // long if Granola misreports `hasMore` or returns very large pages. If we
  // hit the cap with `hasMore` still true we record the run as "partial"
  // rather than success, so the user sees status accurately and the next
  // tick a) resumes from a fresh top-of-list b) backfills older meetings
  // (Granola returns descending). 10 * 50 = 500 notes per tick at the
  // 5 req/s rate limit.
  const MAX_PAGES = 10;
  let stoppedEarly = false;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await fetchGranolaNotes(apiKey, cursor, 50);
      if (!res.ok) {
        await ctx.runMutation(internal.granolaHelpers._markSyncResult, {
          userId,
          error: res.reason,
        });
        return { ok: false, reason: res.reason };
      }

      for (const note of res.notes) {
        const upsert = mapNoteToUpsert(userId, note);
        if (!upsert) {
          // Malformed/missing required fields — skip but keep going so
          // one bad note doesn't sink the whole user's sync.
          skippedBadNotes++;
          continue;
        }
        try {
          const result = (await ctx.runMutation(
            internal.meetings._upsertFromGranola,
            upsert,
          )) as { created: boolean };
          if (result.created) created++;
          else updated++;
        } catch (err) {
          console.error("[granolaSync] upsert failed for note", note?.id, err);
          skippedBadNotes++;
        }
      }

      if (!res.hasMore || !res.cursor) break;
      cursor = res.cursor;
      if (page === MAX_PAGES - 1) stoppedEarly = true;
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await ctx.runMutation(internal.granolaHelpers._markSyncResult, {
      userId,
      error: reason,
    });
    return { ok: false, reason };
  }

  // Partial success: tell the user explicitly so they aren't surprised when
  // older meetings keep showing up across multiple ticks.
  const errorTag = stoppedEarly
    ? `partial-${MAX_PAGES * 50}-of-many`
    : skippedBadNotes > 0
      ? `partial-${skippedBadNotes}-skipped`
      : undefined;
  await ctx.runMutation(internal.granolaHelpers._markSyncResult, {
    userId,
    error: errorTag,
  });
  return { ok: true, created, updated };
}

// ── Granola HTTP wire format ─────────────────────────

type FetchResult =
  | { ok: true; notes: GranolaNote[]; hasMore: boolean; cursor: string | null }
  | { ok: false; reason: string };

async function fetchGranolaNotes(
  apiKey: string,
  cursor: string | undefined,
  limit: number,
): Promise<FetchResult> {
  const url = new URL(`${GRANOLA_API}/v1/notes`);
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);
  url.searchParams.set("include", "transcript");

  // 30s per request — long enough for big transcripts, short enough that one
  // hung Granola call doesn't stall the whole cron tick (which iterates users
  // sequentially).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: err instanceof Error ? err.message : "network-error" };
  }
  clearTimeout(timeout);

  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: `auth-${res.status}` };
  }
  if (res.status === 429) {
    return { ok: false, reason: "rate-limited" };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[granolaSync] fetch failed", res.status, body);
    return { ok: false, reason: `granola-${res.status}` };
  }

  let data: GranolaListResponse;
  try {
    data = (await res.json()) as GranolaListResponse;
  } catch (err) {
    console.error("[granolaSync] JSON parse failed", err);
    return { ok: false, reason: "bad-response" };
  }

  return {
    ok: true,
    notes: Array.isArray(data.notes) ? data.notes : [],
    hasMore: !!data.hasMore,
    cursor: data.cursor ?? null,
  };
}

function mapNoteToUpsert(userId: Id<"users">, note: GranolaNote) {
  // Validate the only field we cannot synthesize. Granola schema drift or a
  // malformed page should skip this note rather than crash the whole sync.
  if (!note || typeof note.id !== "string" || note.id.trim().length === 0) {
    console.warn("[granolaSync] skipping note with missing id");
    return null;
  }

  const attendees = collectAttendees(note);
  const { value: safeTranscript, truncated } = truncateUtf8(
    joinTranscript(note.transcript),
    TRANSCRIPT_MAX_BYTES,
  );

  return {
    userId,
    granolaId: note.id,
    title: (typeof note.title === "string" && note.title.trim()
      ? note.title
      : "Untitled meeting"
    ).slice(0, 500),
    summary: typeof note.summary === "string" ? note.summary.slice(0, 50_000) : undefined,
    transcript: safeTranscript || undefined,
    transcriptTruncated: truncated || undefined,
    attendees: attendees.length > 0 ? attendees : undefined,
    startedAt: parseIso(note.start_time),
    endedAt: parseIso(note.end_time),
    granolaUrl: typeof note.url === "string" ? note.url : undefined,
  };
}

// UTF-8 byte-aware truncation. Convex caps documents at ~1MB UTF-8, so we
// must measure bytes, not JavaScript string length. After byte-slicing we
// also back off any trailing partial multi-byte char so the stored string
// is always valid UTF-8.
function truncateUtf8(value: string, maxBytes: number): { value: string; truncated: boolean } {
  if (!value) return { value: "", truncated: false };
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes <= maxBytes) return { value, truncated: false };

  const buf = Buffer.from(value, "utf8");
  let cut = maxBytes;
  // Walk back from the cut point until we land on a UTF-8 boundary
  // (continuation bytes are 0b10xxxxxx). At most 3 steps for a 4-byte
  // codepoint.
  while (cut > 0 && (buf[cut] & 0xc0) === 0x80) cut--;
  return { value: buf.slice(0, cut).toString("utf8"), truncated: true };
}

function collectAttendees(note: GranolaNote): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const candidates: GranolaOwner[] = [];
  if (note.owner) candidates.push(note.owner);
  if (Array.isArray(note.attendees)) candidates.push(...note.attendees);
  for (const c of candidates) {
    const label = (c.name?.trim() || c.email?.trim() || "").slice(0, 200);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length >= 50) break;
  }
  return out;
}

function joinTranscript(segments: GranolaTranscriptSegment[] | undefined): string {
  if (!Array.isArray(segments) || segments.length === 0) return "";
  const lines: string[] = [];
  for (const seg of segments) {
    const text = seg.text?.trim();
    if (!text) continue;
    const speaker = seg.speaker?.trim();
    lines.push(speaker ? `${speaker}: ${text}` : text);
  }
  return lines.join("\n");
}

function parseIso(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}
