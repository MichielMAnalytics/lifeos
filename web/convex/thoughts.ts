import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const results = await ctx.db
      .query("thoughts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return results;
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    content: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const thoughtId = await ctx.db.insert("thoughts", {
      userId,
      content: args.content,
      title: args.title,
    });

    const thought = await ctx.db.get(thoughtId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "thoughts",
      recordId: thoughtId,
      beforeData: null,
      afterData: thought,
    });

    return thought;
  },
});

// ── update ────────────────────────────────────────────

export const update = mutation({
  args: {
    id: v.id("thoughts"),
    content: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Thought not found");
    const updates: Record<string, unknown> = {};
    if (args.content !== undefined) updates.content = args.content;
    if (args.title !== undefined) updates.title = args.title;
    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "update", tableName: "thoughts",
      recordId: args.id, beforeData: existing, afterData: updated,
    });
    return updated;
  },
});

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: {
    id: v.id("thoughts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Thought not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "thoughts",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("thoughts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return { data: results, count: results.length };
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thoughtId = await ctx.db.insert("thoughts", {
      userId: args.userId,
      content: args.content,
      title: args.title,
    });

    const thought = await ctx.db.get(thoughtId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "thoughts",
      recordId: thoughtId,
      beforeData: null,
      afterData: thought,
    });

    return thought;
  },
});

export const _update = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("thoughts"),
    content: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) throw new Error("Thought not found");
    const updates: Record<string, unknown> = {};
    if (args.content !== undefined) updates.content = args.content;
    if (args.title !== undefined) updates.title = args.title;
    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);
    await ctx.db.insert("mutationLog", {
      userId: args.userId, action: "update", tableName: "thoughts",
      recordId: args.id, beforeData: existing, afterData: updated,
    });
    return updated;
  },
});

export const _remove = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("thoughts"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Thought not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "thoughts",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});
