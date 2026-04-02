import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let results = await ctx.db
      .query("resources")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (args.type !== undefined) {
      results = results.filter((r) => r.type === args.type);
    }

    return results;
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    url: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const resourceId = await ctx.db.insert("resources", {
      userId,
      title: args.title,
      url: args.url,
      content: args.content,
      type: args.type,
      tags: args.tags,
    });

    const resource = await ctx.db.get(resourceId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "resources",
      recordId: resourceId,
      beforeData: null,
      afterData: resource,
    });

    return resource;
  },
});

// ── update ────────────────────────────────────────────

export const update = mutation({
  args: {
    id: v.id("resources"),
    title: v.optional(v.string()),
    url: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Resource not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.url !== undefined) updates.url = args.url;
    if (args.content !== undefined) updates.content = args.content;
    if (args.type !== undefined) updates.type = args.type;
    if (args.tags !== undefined) updates.tags = args.tags;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "resources",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: {
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Resource not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "resources",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _get = internalQuery({
  args: {
    userId: v.id("users"),
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    if (!resource || resource.userId !== args.userId) return null;
    return resource;
  },
});

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("resources")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    if (args.type !== undefined) {
      results = results.filter((r) => r.type === args.type);
    }

    return { data: results, count: results.length };
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    url: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const resourceId = await ctx.db.insert("resources", {
      userId: args.userId,
      title: args.title,
      url: args.url,
      content: args.content,
      type: args.type,
      tags: args.tags,
    });

    const resource = await ctx.db.get(resourceId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "resources",
      recordId: resourceId,
      beforeData: null,
      afterData: resource,
    });

    return resource;
  },
});

export const _update = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("resources"),
    title: v.optional(v.string()),
    url: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Resource not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.url !== undefined) updates.url = args.url;
    if (args.content !== undefined) updates.content = args.content;
    if (args.type !== undefined) updates.type = args.type;
    if (args.tags !== undefined) updates.tags = args.tags;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "resources",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

export const _remove = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("resources"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Resource not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "resources",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});
