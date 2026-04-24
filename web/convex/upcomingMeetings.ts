// Upcoming meetings — the future-facing companion to the past-meetings
// `meetings` table. Mirror of a calendar event from Google (when wired)
// or a manually added entry. While Google Workspace is gated, mock rows
// keep the UI useful for testing.

import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

// ── list ──────────────────────────────────────────────
// Default window: now → +30 days. Past meetings live in the `meetings`
// table — anything in the upcoming list with `endedAt < now` is filtered
// out so we never resurface "yesterday's meeting" on the upcoming tab.

export const list = query({
  args: {
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const now = Date.now();
    const rows = await ctx.db
      .query("upcomingMeetings")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", userId))
      .order("asc")
      .take(limit * 3); // overfetch a bit since we filter past
    return rows.filter((r) => r.endedAt > now).slice(0, limit);
  },
});

export const get = query({
  args: { id: v.id("upcomingMeetings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) return null;
    return row;
  },
});

// ── create (manual entry) ─────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    startedAt: v.float64(),
    endedAt: v.float64(),
    attendees: v.array(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const id = await ctx.db.insert("upcomingMeetings", {
      userId,
      source: "manual",
      title: args.title.trim(),
      description: args.description,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
      attendees: args.attendees,
      location: args.location,
      updatedAt: Date.now(),
    });
    const row = await ctx.db.get(id);
    await ctx.db.insert("mutationLog", {
      userId, action: "create", tableName: "upcomingMeetings",
      recordId: id, beforeData: null, afterData: row,
    });
    return row;
  },
});

// ── seedMock ──────────────────────────────────────────
// Inserts 5 fake upcoming meetings the user can experiment with while
// Google Calendar is gated. Picks attendee names from the user's existing
// past meetings (if any) so the prep auto-discovery actually finds
// related context. Falls back to generic placeholders for new accounts.

const PLACEHOLDER_ATTENDEES = [
  ["Alex", "Jordan"],
  ["Sam", "Taylor", "Morgan"],
  ["Casey", "Riley"],
  ["Quinn", "Avery"],
  ["Pat", "Drew", "Hayden"],
];

const PLACEHOLDER_TITLES = [
  "Weekly sync",
  "Q3 planning kickoff",
  "Product review",
  "1:1 catch-up",
  "Strategy off-site prep",
];

export const seedMock = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Pull up to 50 recent past meetings to harvest attendee names.
    const past = await ctx.db
      .query("meetings")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    // Frequency map of attendee names — most-collaborated-with people first.
    const counts = new Map<string, number>();
    for (const m of past) {
      for (const a of m.attendees ?? []) {
        if (!a || a.toLowerCase().includes("zumpolle")) continue; // skip the user
        counts.set(a, (counts.get(a) ?? 0) + 1);
      }
    }
    const topAttendees = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 8);

    const now = Date.now();
    const day = 86_400_000;
    const hour = 3_600_000;

    // Five spread across the next two weeks. Times chosen to look like a
    // realistic week: morning standups, afternoon syncs, an off-site.
    const events = [
      { offsetMs: day + 9 * hour, durationMs: 30 * 60_000, attendeesIdx: 0 },
      { offsetMs: 2 * day + 14 * hour, durationMs: 60 * 60_000, attendeesIdx: 1 },
      { offsetMs: 4 * day + 10 * hour, durationMs: 45 * 60_000, attendeesIdx: 2 },
      { offsetMs: 7 * day + 11 * hour, durationMs: 30 * 60_000, attendeesIdx: 3 },
      { offsetMs: 10 * day + 15 * hour, durationMs: 90 * 60_000, attendeesIdx: 4 },
    ];

    const inserted: Id<"upcomingMeetings">[] = [];
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const start = startOfDay(now) + e.offsetMs;
      const end = start + e.durationMs;
      // Pick 2-3 attendees for this event from the top harvested list, with
      // the user's name baked in too (mirrors how Granola records meetings).
      const wantCount = (e.attendeesIdx % 3) + 2;
      const harvested = topAttendees.slice(e.attendeesIdx * 2, e.attendeesIdx * 2 + wantCount);
      const attendees = harvested.length >= 2
        ? ["Kemp Zumpolle", ...harvested]
        : ["Kemp Zumpolle", ...PLACEHOLDER_ATTENDEES[e.attendeesIdx]];

      const id = await ctx.db.insert("upcomingMeetings", {
        userId,
        source: "mock",
        title: PLACEHOLDER_TITLES[i],
        startedAt: start,
        endedAt: end,
        attendees,
        description: undefined,
        updatedAt: Date.now(),
      });
      inserted.push(id);
    }
    return { inserted: inserted.length };
  },
});

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("upcomingMeetings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Upcoming meeting not found");
    // Delete the linked prep too so we don't orphan it.
    const prep = await ctx.db
      .query("meetingPreps")
      .withIndex("by_upcomingMeetingId", (q) => q.eq("upcomingMeetingId", args.id))
      .unique();
    if (prep) await ctx.db.delete(prep._id);
    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "delete", tableName: "upcomingMeetings",
      recordId: args.id, beforeData: existing, afterData: null,
    });
    return { id: args.id };
  },
});

// ══════════════════════════════════════════════════════
// Internal — used by HTTP layer + CLI
// ══════════════════════════════════════════════════════

export const _list = internalQuery({
  args: { userId: v.id("users"), limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const now = Date.now();
    const rows = await ctx.db
      .query("upcomingMeetings")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", args.userId))
      .order("asc")
      .take(limit * 3);
    const data = rows.filter((r) => r.endedAt > now).slice(0, limit);
    return { data, count: data.length };
  },
});

export const _get = internalQuery({
  args: { userId: v.id("users"), id: v.id("upcomingMeetings") },
  handler: async (ctx, args): Promise<Doc<"upcomingMeetings"> | null> => {
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== args.userId) return null;
    return row;
  },
});

// Internal twin of `seedMock` so the HTTP layer can call it without an
// auth session. Same logic as the public mutation above.
export const _seedMock = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{ inserted: number }> => {
    const past = await ctx.db
      .query("meetings")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
    const counts = new Map<string, number>();
    for (const m of past) {
      for (const a of m.attendees ?? []) {
        if (!a || a.toLowerCase().includes("zumpolle")) continue;
        counts.set(a, (counts.get(a) ?? 0) + 1);
      }
    }
    const topAttendees = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 8);

    const now = Date.now();
    const day = 86_400_000;
    const hour = 3_600_000;
    const events = [
      { offsetMs: day + 9 * hour, durationMs: 30 * 60_000, attendeesIdx: 0 },
      { offsetMs: 2 * day + 14 * hour, durationMs: 60 * 60_000, attendeesIdx: 1 },
      { offsetMs: 4 * day + 10 * hour, durationMs: 45 * 60_000, attendeesIdx: 2 },
      { offsetMs: 7 * day + 11 * hour, durationMs: 30 * 60_000, attendeesIdx: 3 },
      { offsetMs: 10 * day + 15 * hour, durationMs: 90 * 60_000, attendeesIdx: 4 },
    ];

    const inserted: Id<"upcomingMeetings">[] = [];
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const start = startOfDay(now) + e.offsetMs;
      const end = start + e.durationMs;
      const wantCount = (e.attendeesIdx % 3) + 2;
      const harvested = topAttendees.slice(e.attendeesIdx * 2, e.attendeesIdx * 2 + wantCount);
      const attendees = harvested.length >= 2
        ? ["Kemp Zumpolle", ...harvested]
        : ["Kemp Zumpolle", ...PLACEHOLDER_ATTENDEES[e.attendeesIdx]];

      const id = await ctx.db.insert("upcomingMeetings", {
        userId: args.userId,
        source: "mock",
        title: PLACEHOLDER_TITLES[i],
        startedAt: start,
        endedAt: end,
        attendees,
        description: undefined,
        updatedAt: Date.now(),
      });
      inserted.push(id);
    }
    return { inserted: inserted.length };
  },
});
