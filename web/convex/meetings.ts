// Meetings table — synced from Granola via the Personal API.
//
// Public surface:
//   list / get   — read-only views for the dashboard and CLI.
//   remove       — manual removal (does NOT propagate to Granola).
//
// Sync surface (internal only): the Granola sync action calls
// `_upsertFromGranola` for each note it pulls down. We dedupe by
// `(userId, granolaId)` so re-syncing the same note updates instead
// of duplicating.

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    const rows = await ctx.db
      .query("meetings")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
    return rows.map((meeting) => ({
      _id: meeting._id,
      _creationTime: meeting._creationTime,
      userId: meeting.userId,
      granolaId: meeting.granolaId,
      title: meeting.title,
      summary: meeting.summary,
      transcriptTruncated: meeting.transcriptTruncated,
      attendees: meeting.attendees,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      granolaUrl: meeting.granolaUrl,
      syncedAt: meeting.syncedAt,
    }));
  },
});

// ── get ───────────────────────────────────────────────

export const get = query({
  args: {
    id: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const meeting = await ctx.db.get(args.id);
    if (!meeting || meeting.userId !== userId) return null;
    return meeting;
  },
});

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("meetings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Meeting not found");
    }

    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "meetings",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });
    return { id: args.id };
  },
});

// ══════════════════════════════════════════════════════
// Internal — used by HTTP layer and Granola sync action
// ══════════════════════════════════════════════════════

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const results = await ctx.db
      .query("meetings")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
    return { data: results, count: results.length };
  },
});

export const _get = internalQuery({
  args: {
    userId: v.id("users"),
    id: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.id);
    if (!meeting || meeting.userId !== args.userId) return null;
    return meeting;
  },
});

export const _findByGranolaId = internalQuery({
  args: {
    userId: v.id("users"),
    granolaId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"meetings"> | null> => {
    const existing = await ctx.db
      .query("meetings")
      .withIndex("by_userId_granolaId", (q) =>
        q.eq("userId", args.userId).eq("granolaId", args.granolaId),
      )
      .unique();
    return existing;
  },
});

// Idempotent upsert keyed on (userId, granolaId). Re-running a sync of the
// same note updates the row in place — never duplicates.
export const _upsertFromGranola = internalMutation({
  args: {
    userId: v.id("users"),
    granolaId: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    transcript: v.optional(v.string()),
    transcriptTruncated: v.optional(v.boolean()),
    attendees: v.optional(v.array(v.string())),
    startedAt: v.optional(v.float64()),
    endedAt: v.optional(v.float64()),
    granolaUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ id: Id<"meetings">; created: boolean }> => {
    const existing = await ctx.db
      .query("meetings")
      .withIndex("by_userId_granolaId", (q) =>
        q.eq("userId", args.userId).eq("granolaId", args.granolaId),
      )
      .unique();

    const now = Date.now();
    const payload = {
      userId: args.userId,
      granolaId: args.granolaId,
      title: args.title,
      summary: args.summary,
      transcript: args.transcript,
      transcriptTruncated: args.transcriptTruncated,
      attendees: args.attendees,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
      granolaUrl: args.granolaUrl,
      syncedAt: now,
    };

    if (existing) {
      await ctx.db.replace(existing._id, payload);
      return { id: existing._id, created: false };
    }

    // Sync upserts intentionally don't write to mutationLog — `lifeos undo`
    // only handles create/update/complete/delete actions, and the recovery
    // story for "I undid a Granola sync" is "wait an hour for the next
    // sync", which is not what the user wants. Manual `meetings.remove`
    // still logs and remains undoable.
    const id = await ctx.db.insert("meetings", payload);
    return { id, created: true };
  },
});

export const _remove = internalMutation({
  args: { userId: v.id("users"), id: v.id("meetings") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Meeting not found");
    }
    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "meetings",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });
    return { id: args.id };
  },
});
