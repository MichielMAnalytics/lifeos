// Google Calendar wrapper. Thin layer over the v3 API:
//   GET  /calendar/v3/calendars/{id}/events  → list events in a window
//   POST /calendar/v3/calendars/{id}/events  → create
//   PATCH /calendar/v3/calendars/{id}/events/{eventId} → update
//   DELETE /calendar/v3/calendars/{id}/events/{eventId} → delete
//
// All API calls go through `getAccessToken` from `googleAuth.ts` which
// transparently refreshes if the cached access token is expired. Returns
// a uniform shape so the dashboard + CLI can render without per-call
// branching.

"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { getAccessToken } from "./googleAuth";

const CAL_API = "https://www.googleapis.com/calendar/v3";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  startMs?: number;
  endMs?: number;
  allDay?: boolean;
  attendees?: Array<{ email: string; name?: string; responseStatus?: string }>;
  htmlLink?: string;
  hangoutLink?: string;
  status?: string;
}

interface GoogleEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
  htmlLink?: string;
  hangoutLink?: string;
  status?: string;
}

function mapEvent(e: GoogleEvent): CalendarEvent {
  const startStr = e.start?.dateTime ?? e.start?.date;
  const endStr = e.end?.dateTime ?? e.end?.date;
  const startMs = startStr ? Date.parse(startStr) : undefined;
  const endMs = endStr ? Date.parse(endStr) : undefined;
  return {
    id: e.id ?? "",
    summary: e.summary ?? "(no title)",
    description: e.description,
    location: e.location,
    startMs: Number.isFinite(startMs) ? startMs : undefined,
    endMs: Number.isFinite(endMs) ? endMs : undefined,
    allDay: !!e.start?.date,
    attendees: e.attendees?.map((a) => ({
      email: a.email ?? "",
      name: a.displayName,
      responseStatus: a.responseStatus,
    })),
    htmlLink: e.htmlLink,
    hangoutLink: e.hangoutLink,
    status: e.status,
  };
}

// ── list ──────────────────────────────────────────────
// Default window: now → +7 days. Caps at 100 events.

export const list = action({
  args: {
    calendarId: v.optional(v.string()),
    timeMin: v.optional(v.float64()), // epoch ms
    timeMax: v.optional(v.float64()),
    limit: v.optional(v.float64()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; events: CalendarEvent[] } | { ok: false; reason: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await listEvents(ctx, userId, args);
  },
});

async function listEvents(
  ctx: { runQuery: (...args: any[]) => Promise<any>; runMutation: (...args: any[]) => Promise<any> },
  userId: Id<"users">,
  args: { calendarId?: string; timeMin?: number; timeMax?: number; limit?: number },
): Promise<{ ok: true; events: CalendarEvent[] } | { ok: false; reason: string }> {
  const token = await getAccessToken(ctx, userId);
  if (!token) return { ok: false, reason: "not-connected" };

  const calendarId = args.calendarId ?? "primary";
  const timeMin = args.timeMin ?? Date.now();
  const timeMax = args.timeMax ?? timeMin + 7 * 86_400_000;
  const maxResults = Math.min(Math.max(args.limit ?? 100, 1), 250);

  const url = new URL(`${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("timeMin", new Date(timeMin).toISOString());
  url.searchParams.set("timeMax", new Date(timeMax).toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", String(maxResults));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: `auth-${res.status}` };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[googleCalendar.list]", res.status, body.slice(0, 200));
    return { ok: false, reason: `google-${res.status}` };
  }
  const data = (await res.json()) as { items?: GoogleEvent[] };
  return { ok: true, events: (data.items ?? []).map(mapEvent) };
}

// Internal version for HTTP routes / CLI (callers authenticate via API key).
export const _listForUser = internalAction({
  args: {
    userId: v.id("users"),
    calendarId: v.optional(v.string()),
    timeMin: v.optional(v.float64()),
    timeMax: v.optional(v.float64()),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    return await listEvents(ctx, userId, rest);
  },
});

// ── create ────────────────────────────────────────────

export const create = action({
  args: {
    calendarId: v.optional(v.string()),
    summary: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    startMs: v.float64(),
    endMs: v.float64(),
    attendees: v.optional(v.array(v.string())), // emails
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; event: CalendarEvent } | { ok: false; reason: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await createEvent(ctx, userId, args);
  },
});

async function createEvent(
  ctx: { runQuery: (...args: any[]) => Promise<any>; runMutation: (...args: any[]) => Promise<any> },
  userId: Id<"users">,
  args: {
    calendarId?: string;
    summary: string;
    description?: string;
    location?: string;
    startMs: number;
    endMs: number;
    attendees?: string[];
  },
): Promise<{ ok: true; event: CalendarEvent } | { ok: false; reason: string }> {
  const token = await getAccessToken(ctx, userId);
  if (!token) return { ok: false, reason: "not-connected" };
  const calendarId = args.calendarId ?? "primary";
  const body = {
    summary: args.summary,
    description: args.description,
    location: args.location,
    start: { dateTime: new Date(args.startMs).toISOString() },
    end: { dateTime: new Date(args.endMs).toISOString() },
    attendees: args.attendees?.map((email) => ({ email })),
  };
  const res = await fetch(
    `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[googleCalendar.create]", res.status, text.slice(0, 200));
    return { ok: false, reason: `google-${res.status}` };
  }
  const data = (await res.json()) as GoogleEvent;
  return { ok: true, event: mapEvent(data) };
}

export const _createForUser = internalAction({
  args: {
    userId: v.id("users"),
    calendarId: v.optional(v.string()),
    summary: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    startMs: v.float64(),
    endMs: v.float64(),
    attendees: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, ...rest } = args;
    return await createEvent(ctx, userId, rest);
  },
});

// ── update ────────────────────────────────────────────

export const update = action({
  args: {
    eventId: v.string(),
    calendarId: v.optional(v.string()),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    startMs: v.optional(v.float64()),
    endMs: v.optional(v.float64()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; event: CalendarEvent } | { ok: false; reason: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const token = await getAccessToken(ctx, userId);
    if (!token) return { ok: false, reason: "not-connected" };
    const calendarId = args.calendarId ?? "primary";
    const body: Record<string, unknown> = {};
    if (args.summary !== undefined) body.summary = args.summary;
    if (args.description !== undefined) body.description = args.description;
    if (args.location !== undefined) body.location = args.location;
    if (args.startMs !== undefined) body.start = { dateTime: new Date(args.startMs).toISOString() };
    if (args.endMs !== undefined) body.end = { dateTime: new Date(args.endMs).toISOString() };
    const res = await fetch(
      `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(args.eventId)}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[googleCalendar.update]", res.status, text.slice(0, 200));
      return { ok: false, reason: `google-${res.status}` };
    }
    const data = (await res.json()) as GoogleEvent;
    return { ok: true, event: mapEvent(data) };
  },
});

// ── remove ────────────────────────────────────────────

export const remove = action({
  args: {
    eventId: v.string(),
    calendarId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const token = await getAccessToken(ctx, userId);
    if (!token) return { ok: false, reason: "not-connected" };
    const calendarId = args.calendarId ?? "primary";
    const res = await fetch(
      `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(args.eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok && res.status !== 410) {
      const text = await res.text().catch(() => "");
      console.error("[googleCalendar.remove]", res.status, text.slice(0, 200));
      return { ok: false, reason: `google-${res.status}` };
    }
    return { ok: true };
  },
});
