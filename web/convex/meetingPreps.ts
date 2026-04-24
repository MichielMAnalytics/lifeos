// Meeting preps — one-pager attached to an upcoming meeting. Holds the
// user's editable agenda + notes plus auto-discovered context (related
// past meetings, open tasks, active goals) and LLM-generated talking
// points. Exactly one prep per upcoming meeting; calling `create` on a
// meeting that already has a prep returns the existing row.

import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

// ── list / get ────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const rows = await ctx.db
      .query("meetingPreps")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
    return rows;
  },
});

export const get = query({
  args: { id: v.id("meetingPreps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) return null;
    return row;
  },
});

export const getByUpcomingId = query({
  args: { upcomingMeetingId: v.id("upcomingMeetings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const row = await ctx.db
      .query("meetingPreps")
      .withIndex("by_upcomingMeetingId", (q) => q.eq("upcomingMeetingId", args.upcomingMeetingId))
      .unique();
    if (!row || row.userId !== userId) return null;
    return row;
  },
});

// ── create / update ───────────────────────────────────

export const create = mutation({
  args: { upcomingMeetingId: v.id("upcomingMeetings") },
  handler: async (ctx, args): Promise<Doc<"meetingPreps">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const upcoming = await ctx.db.get(args.upcomingMeetingId);
    if (!upcoming || upcoming.userId !== userId) throw new Error("Upcoming meeting not found");

    // Idempotent — return existing prep if one already exists.
    const existing = await ctx.db
      .query("meetingPreps")
      .withIndex("by_upcomingMeetingId", (q) => q.eq("upcomingMeetingId", args.upcomingMeetingId))
      .unique();
    if (existing) return existing;

    const id = await ctx.db.insert("meetingPreps", {
      userId,
      upcomingMeetingId: args.upcomingMeetingId,
      title: upcoming.title,
      relatedMeetingIds: [],
      relatedTaskIds: [],
      relatedGoalIds: [],
      updatedAt: Date.now(),
    });
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Prep insert lost");
    await ctx.db.insert("mutationLog", {
      userId, action: "create", tableName: "meetingPreps",
      recordId: id, beforeData: null, afterData: row,
    });
    return row;
  },
});

export const updateAgenda = mutation({
  args: { id: v.id("meetingPreps"), agenda: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Prep not found");
    await ctx.db.patch(args.id, { agenda: args.agenda, updatedAt: Date.now() });
    return await ctx.db.get(args.id);
  },
});

export const updateNotes = mutation({
  args: { id: v.id("meetingPreps"), notes: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Prep not found");
    await ctx.db.patch(args.id, { notes: args.notes, updatedAt: Date.now() });
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("meetingPreps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Prep not found");
    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "delete", tableName: "meetingPreps",
      recordId: args.id, beforeData: existing, afterData: null,
    });
    return { id: args.id };
  },
});

// ── refreshContext (auto-discovery) ──────────────────
// Walks the user's past meetings, open tasks, and active goals to find
// rows whose attendees overlap with the upcoming meeting's attendees.
// Match is case-insensitive substring on attendee names. Tops out at 5
// meetings, 10 tasks, 5 goals so the prep stays scannable.

export const refreshContext = mutation({
  args: { id: v.id("meetingPreps") },
  handler: async (ctx, args): Promise<Doc<"meetingPreps">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const prep = await ctx.db.get(args.id);
    if (!prep || prep.userId !== userId) throw new Error("Prep not found");
    const upcoming = await ctx.db.get(prep.upcomingMeetingId);
    if (!upcoming) throw new Error("Upcoming meeting gone — delete and recreate the prep");

    const attendeeNeedles = upcoming.attendees
      .map((a) => a.toLowerCase().trim())
      .filter((a) => a && !a.includes("zumpolle")); // skip self when matching

    // Past meetings — bounded scan by date desc, filter by attendee overlap.
    const recent = await ctx.db
      .query("meetings")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
    const relatedMeetings = recent
      .filter((m) =>
        m.attendees?.some((a) =>
          attendeeNeedles.some((n) => a.toLowerCase().includes(n)),
        ),
      )
      .slice(0, 5)
      .map((m) => m._id);

    // Open tasks — substring match against title + notes for any attendee.
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) => q.eq("userId", userId).eq("status", "todo"))
      .take(500);
    const relatedTasks = tasks
      .filter((t) => {
        const haystack = `${t.title} ${t.notes ?? ""}`.toLowerCase();
        return attendeeNeedles.some((n) => haystack.includes(n));
      })
      .slice(0, 10)
      .map((t) => t._id);

    // Active goals — light context, just include the top 5 active.
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_userId_status", (q) => q.eq("userId", userId).eq("status", "active"))
      .take(50);
    const relatedGoals = goals.slice(0, 5).map((g) => g._id);

    await ctx.db.patch(args.id, {
      relatedMeetingIds: relatedMeetings,
      relatedTaskIds: relatedTasks,
      relatedGoalIds: relatedGoals,
      contextRefreshedAt: Date.now(),
      updatedAt: Date.now(),
    });
    const after = await ctx.db.get(args.id);
    if (!after) throw new Error("Prep gone after patch");
    return after;
  },
});

// ── viewWithContext ──────────────────────────────────
// Convenience read for the prep peek — returns the prep PLUS the
// hydrated related rows so the UI doesn't fan out a query per id.

export const viewWithContext = query({
  args: { id: v.id("meetingPreps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const prep = await ctx.db.get(args.id);
    if (!prep || prep.userId !== userId) return null;
    const upcoming = await ctx.db.get(prep.upcomingMeetingId);

    const meetings = await Promise.all(
      prep.relatedMeetingIds.map(async (id) => {
        const m = await ctx.db.get(id);
        if (!m || m.userId !== userId) return null;
        return {
          _id: m._id,
          title: m.title,
          startedAt: m.startedAt,
          attendees: m.attendees,
          summary: m.summary,
        };
      }),
    );
    const tasks = await Promise.all(
      prep.relatedTaskIds.map(async (id) => {
        const t = await ctx.db.get(id);
        if (!t || t.userId !== userId) return null;
        return { _id: t._id, title: t.title, status: t.status, dueDate: t.dueDate };
      }),
    );
    const goals = await Promise.all(
      prep.relatedGoalIds.map(async (id) => {
        const g = await ctx.db.get(id);
        if (!g || g.userId !== userId) return null;
        return { _id: g._id, title: g.title, status: g.status, targetDate: g.targetDate };
      }),
    );

    return {
      prep,
      upcoming,
      relatedMeetings: meetings.filter((m) => m !== null),
      relatedTasks: tasks.filter((t) => t !== null),
      relatedGoals: goals.filter((g) => g !== null),
    };
  },
});

// ══════════════════════════════════════════════════════
// Internal — for HTTP / CLI / generator action
// ══════════════════════════════════════════════════════

export const _get = internalQuery({
  args: { userId: v.id("users"), id: v.id("meetingPreps") },
  handler: async (ctx, args): Promise<Doc<"meetingPreps"> | null> => {
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== args.userId) return null;
    return row;
  },
});

export const _list = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("meetingPreps")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(200);
    return { data: rows, count: rows.length };
  },
});

export const _viewWithContext = internalQuery({
  args: { userId: v.id("users"), id: v.id("meetingPreps") },
  handler: async (ctx, args) => {
    const prep = await ctx.db.get(args.id);
    if (!prep || prep.userId !== args.userId) return null;
    const upcoming = await ctx.db.get(prep.upcomingMeetingId);
    const meetings = await Promise.all(
      prep.relatedMeetingIds.map(async (id) => {
        const m = await ctx.db.get(id);
        if (!m || m.userId !== args.userId) return null;
        return { _id: m._id, title: m.title, startedAt: m.startedAt, attendees: m.attendees, summary: m.summary };
      }),
    );
    const tasks = await Promise.all(
      prep.relatedTaskIds.map(async (id) => {
        const t = await ctx.db.get(id);
        if (!t || t.userId !== args.userId) return null;
        return { _id: t._id, title: t.title, status: t.status };
      }),
    );
    return {
      prep,
      upcoming,
      relatedMeetings: meetings.filter((m): m is NonNullable<typeof m> => m !== null),
      relatedTasks: tasks.filter((t): t is NonNullable<typeof t> => t !== null),
    };
  },
});

export const _setTalkingPoints = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("meetingPreps"),
    talkingPoints: v.string(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) throw new Error("Prep not found");
    await ctx.db.patch(args.id, {
      talkingPoints: args.talkingPoints,
      talkingPointsSource: args.source,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

// CLI/HTTP variants — same logic as the public versions above but accept
// a userId argument so they can be called from the http layer.

export const _createForUpcoming = internalMutation({
  args: { userId: v.id("users"), upcomingMeetingId: v.id("upcomingMeetings") },
  handler: async (ctx, args): Promise<Doc<"meetingPreps">> => {
    const upcoming = await ctx.db.get(args.upcomingMeetingId);
    if (!upcoming || upcoming.userId !== args.userId) throw new Error("Upcoming meeting not found");
    const existing = await ctx.db
      .query("meetingPreps")
      .withIndex("by_upcomingMeetingId", (q) => q.eq("upcomingMeetingId", args.upcomingMeetingId))
      .unique();
    if (existing) return existing;
    const id = await ctx.db.insert("meetingPreps", {
      userId: args.userId,
      upcomingMeetingId: args.upcomingMeetingId,
      title: upcoming.title,
      relatedMeetingIds: [],
      relatedTaskIds: [],
      relatedGoalIds: [],
      updatedAt: Date.now(),
    });
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Prep insert lost");
    await ctx.db.insert("mutationLog", {
      userId: args.userId, action: "create", tableName: "meetingPreps",
      recordId: id, beforeData: null, afterData: row,
    });
    return row;
  },
});

export const _patch = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("meetingPreps"),
    agenda: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) throw new Error("Prep not found");
    const patch: { agenda?: string; notes?: string; updatedAt: number } = { updatedAt: Date.now() };
    if (args.agenda !== undefined) patch.agenda = args.agenda;
    if (args.notes !== undefined) patch.notes = args.notes;
    await ctx.db.patch(args.id, patch);
    return await ctx.db.get(args.id);
  },
});

export const _remove = internalMutation({
  args: { userId: v.id("users"), id: v.id("meetingPreps") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) throw new Error("Prep not found");
    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId: args.userId, action: "delete", tableName: "meetingPreps",
      recordId: args.id, beforeData: existing, afterData: null,
    });
    return { id: args.id };
  },
});

export const _refreshContext = internalMutation({
  args: { userId: v.id("users"), id: v.id("meetingPreps") },
  handler: async (ctx, args): Promise<Doc<"meetingPreps">> => {
    const prep = await ctx.db.get(args.id);
    if (!prep || prep.userId !== args.userId) throw new Error("Prep not found");
    const upcoming = await ctx.db.get(prep.upcomingMeetingId);
    if (!upcoming) throw new Error("Upcoming meeting gone — delete and recreate the prep");

    const attendeeNeedles = upcoming.attendees
      .map((a) => a.toLowerCase().trim())
      .filter((a) => a && !a.includes("zumpolle"));

    const recent = await ctx.db
      .query("meetings")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(200);
    const relatedMeetings = recent
      .filter((m) =>
        m.attendees?.some((a) =>
          attendeeNeedles.some((n) => a.toLowerCase().includes(n)),
        ),
      )
      .slice(0, 5)
      .map((m) => m._id);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "todo"))
      .take(500);
    const relatedTasks = tasks
      .filter((t) => {
        const haystack = `${t.title} ${t.notes ?? ""}`.toLowerCase();
        return attendeeNeedles.some((n) => haystack.includes(n));
      })
      .slice(0, 10)
      .map((t) => t._id);

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "active"))
      .take(50);
    const relatedGoals = goals.slice(0, 5).map((g) => g._id);

    await ctx.db.patch(args.id, {
      relatedMeetingIds: relatedMeetings,
      relatedTaskIds: relatedTasks,
      relatedGoalIds: relatedGoals,
      contextRefreshedAt: Date.now(),
      updatedAt: Date.now(),
    });
    const after = await ctx.db.get(args.id);
    if (!after) throw new Error("Prep gone after patch");
    return after;
  },
});
