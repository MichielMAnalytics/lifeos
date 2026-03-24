import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    from: v.optional(v.string()),
    to: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let results = await ctx.db
      .query("journals")
      .withIndex("by_userId_entryDate", (q) => q.eq("userId", userId))
      .collect();

    // Apply date range filters in JS
    if (args.from !== undefined) {
      results = results.filter((j) => j.entryDate >= args.from!);
    }
    if (args.to !== undefined) {
      results = results.filter((j) => j.entryDate <= args.to!);
    }

    // Sort by entryDate descending
    results.sort((a, b) => (a.entryDate > b.entryDate ? -1 : 1));

    return { data: results, count: results.length };
  },
});

// ── getByDate ─────────────────────────────────────────

export const getByDate = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const entry = await ctx.db
      .query("journals")
      .withIndex("by_userId_entryDate", (q) =>
        q.eq("userId", userId).eq("entryDate", args.date),
      )
      .unique();

    return entry;
  },
});

// ── upsert ────────────────────────────────────────────

export const upsert = mutation({
  args: {
    date: v.string(),
    mit: v.optional(v.string()),
    p1: v.optional(v.string()),
    p2: v.optional(v.string()),
    notes: v.optional(v.string()),
    wins: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("journals")
      .withIndex("by_userId_entryDate", (q) =>
        q.eq("userId", userId).eq("entryDate", args.date),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      // Update existing entry
      const updates: Record<string, unknown> = { updatedAt: now };
      if (args.mit !== undefined) updates.mit = args.mit;
      if (args.p1 !== undefined) updates.p1 = args.p1;
      if (args.p2 !== undefined) updates.p2 = args.p2;
      if (args.notes !== undefined) updates.notes = args.notes;
      if (args.wins !== undefined) updates.wins = args.wins;

      await ctx.db.patch(existing._id, updates);
      const updated = await ctx.db.get(existing._id);

      await ctx.db.insert("mutationLog", {
        userId,
        action: "update",
        tableName: "journals",
        recordId: existing._id,
        beforeData: existing,
        afterData: updated,
      });

      return updated;
    } else {
      // Create new entry
      const entryId = await ctx.db.insert("journals", {
        userId,
        entryDate: args.date,
        mit: args.mit,
        p1: args.p1,
        p2: args.p2,
        notes: args.notes,
        wins: args.wins ?? [],
        updatedAt: now,
      });

      const entry = await ctx.db.get(entryId);

      await ctx.db.insert("mutationLog", {
        userId,
        action: "create",
        tableName: "journals",
        recordId: entryId,
        beforeData: null,
        afterData: entry,
      });

      return entry;
    }
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _list = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("journals")
      .withIndex("by_userId_entryDate", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const _getByDate = internalQuery({
  args: { userId: v.id("users"), entryDate: v.string() },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("journals")
      .withIndex("by_userId_entryDate", (q) =>
        q.eq("userId", args.userId).eq("entryDate", args.entryDate),
      )
      .unique();
    return entry;
  },
});

export const _upsert = internalMutation({
  args: {
    userId: v.id("users"),
    entryDate: v.string(),
    mit: v.optional(v.string()),
    p1: v.optional(v.string()),
    p2: v.optional(v.string()),
    notes: v.optional(v.string()),
    wins: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("journals")
      .withIndex("by_userId_entryDate", (q) =>
        q.eq("userId", args.userId).eq("entryDate", args.entryDate),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (args.mit !== undefined) updates.mit = args.mit;
      if (args.p1 !== undefined) updates.p1 = args.p1;
      if (args.p2 !== undefined) updates.p2 = args.p2;
      if (args.notes !== undefined) updates.notes = args.notes;
      if (args.wins !== undefined) updates.wins = args.wins;

      await ctx.db.patch(existing._id, updates);
      const updated = await ctx.db.get(existing._id);

      await ctx.db.insert("mutationLog", {
        userId: args.userId,
        action: "update",
        tableName: "journals",
        recordId: existing._id,
        beforeData: existing,
        afterData: updated,
      });

      return { ...updated, _wasCreated: false };
    } else {
      const entryId = await ctx.db.insert("journals", {
        userId: args.userId,
        entryDate: args.entryDate,
        mit: args.mit,
        p1: args.p1,
        p2: args.p2,
        notes: args.notes,
        wins: args.wins ?? [],
        updatedAt: now,
      });

      const entry = await ctx.db.get(entryId);

      await ctx.db.insert("mutationLog", {
        userId: args.userId,
        action: "create",
        tableName: "journals",
        recordId: entryId,
        beforeData: null,
        afterData: entry,
      });

      return { ...entry, _wasCreated: true };
    }
  },
});
