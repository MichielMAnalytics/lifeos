import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { todayStr } from "./lib/helpers";

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
      .query("wins")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Apply date range filters in JS
    if (args.from !== undefined) {
      results = results.filter((w) => w.entryDate >= args.from!);
    }
    if (args.to !== undefined) {
      results = results.filter((w) => w.entryDate <= args.to!);
    }

    // Sort by entryDate descending
    results.sort((a, b) => (a.entryDate > b.entryDate ? -1 : 1));

    return { data: results, count: results.length };
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    content: v.string(),
    entryDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const winId = await ctx.db.insert("wins", {
      userId,
      content: args.content,
      entryDate: args.entryDate ?? todayStr(),
    });

    const win = await ctx.db.get(winId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "wins",
      recordId: winId,
      beforeData: null,
      afterData: win,
    });

    return win;
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("wins")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    if (args.from !== undefined) {
      results = results.filter((w) => w.entryDate >= args.from!);
    }
    if (args.to !== undefined) {
      results = results.filter((w) => w.entryDate <= args.to!);
    }

    results.sort((a, b) => (a.entryDate > b.entryDate ? -1 : 1));

    return { data: results, count: results.length };
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
    entryDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const winId = await ctx.db.insert("wins", {
      userId: args.userId,
      content: args.content,
      entryDate: args.entryDate ?? todayStr(),
    });

    const win = await ctx.db.get(winId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "wins",
      recordId: winId,
      beforeData: null,
      afterData: win,
    });

    return win;
  },
});
