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
      .query("visionBoard")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Sort by position ascending
    return results.sort((a, b) => a.position - b.position);
  },
});

// ── add ───────────────────────────────────────────────

export const add = mutation({
  args: {
    imageUrl: v.string(),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const id = await ctx.db.insert("visionBoard", {
      userId,
      imageUrl: args.imageUrl,
      caption: args.caption,
      position: Date.now(),
    });

    const row = await ctx.db.get(id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "visionBoard",
      recordId: id,
      beforeData: null,
      afterData: row,
    });

    return row;
  },
});

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: {
    id: v.id("visionBoard"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Image not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "visionBoard",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

// ── reorder ───────────────────────────────────────────

export const reorder = mutation({
  args: {
    items: v.array(
      v.object({
        id: v.id("visionBoard"),
        position: v.float64(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    for (const item of args.items) {
      const existing = await ctx.db.get(item.id);
      if (!existing || existing.userId !== userId) continue;
      await ctx.db.patch(item.id, { position: item.position });
    }

    return { updated: args.items.length };
  },
});

// ── Internal variants (for HTTP router) ──────────────

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("visionBoard")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      data: results.sort((a, b) => a.position - b.position),
      count: results.length,
    };
  },
});

export const _add = internalMutation({
  args: {
    userId: v.id("users"),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("visionBoard", {
      userId: args.userId,
      imageUrl: args.imageUrl,
      caption: args.caption,
      position: Date.now(),
    });

    const row = await ctx.db.get(id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "visionBoard",
      recordId: id,
      beforeData: null,
      afterData: row,
    });

    return row;
  },
});

export const _remove = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("visionBoard"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Image not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "visionBoard",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});
