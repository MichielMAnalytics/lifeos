import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── get ──────────────────────────────────────────────

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const row = await ctx.db
      .query("identity")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return row ? row.statement : null;
  },
});

// ── upsert ───────────────────────────────────────────

export const upsert = mutation({
  args: {
    statement: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("identity")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        statement: args.statement,
        updatedAt: Date.now(),
      });

      await ctx.db.insert("mutationLog", {
        userId,
        action: "update",
        tableName: "identity",
        recordId: existing._id,
        beforeData: existing,
        afterData: { ...existing, statement: args.statement, updatedAt: Date.now() },
      });

      return existing._id;
    } else {
      const id = await ctx.db.insert("identity", {
        userId,
        statement: args.statement,
        updatedAt: Date.now(),
      });

      const row = await ctx.db.get(id);

      await ctx.db.insert("mutationLog", {
        userId,
        action: "create",
        tableName: "identity",
        recordId: id,
        beforeData: null,
        afterData: row,
      });

      return id;
    }
  },
});

// ── Internal variants (for HTTP router) ──────────────

export const _get = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("identity")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return { data: row };
  },
});

export const _upsert = internalMutation({
  args: {
    userId: v.id("users"),
    statement: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("identity")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        statement: args.statement,
        updatedAt: Date.now(),
      });
      const updated = await ctx.db.get(existing._id);

      await ctx.db.insert("mutationLog", {
        userId: args.userId,
        action: "update",
        tableName: "identity",
        recordId: existing._id,
        beforeData: existing,
        afterData: updated,
      });

      return updated;
    } else {
      const id = await ctx.db.insert("identity", {
        userId: args.userId,
        statement: args.statement,
        updatedAt: Date.now(),
      });

      const row = await ctx.db.get(id);

      await ctx.db.insert("mutationLog", {
        userId: args.userId,
        action: "create",
        tableName: "identity",
        recordId: id,
        beforeData: null,
        afterData: row,
      });

      return row;
    }
  },
});
