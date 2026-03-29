import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    reviewType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let results = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    if (args.reviewType !== undefined) {
      results = results.filter((r) => r.reviewType === args.reviewType);
    }

    return results;
  },
});

// ── get ───────────────────────────────────────────────

export const get = query({
  args: {
    id: v.id("reviews"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const review = await ctx.db.get(args.id);
    if (!review || review.userId !== userId) {
      return null;
    }
    return review;
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    reviewType: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
    content: v.any(),
    score: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reviewId = await ctx.db.insert("reviews", {
      userId,
      reviewType: args.reviewType,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      content: args.content,
      score: args.score,
    });

    const review = await ctx.db.get(reviewId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "reviews",
      recordId: reviewId,
      beforeData: null,
      afterData: review,
    });

    return review;
  },
});

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Review not found");
    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "delete", tableName: "reviews",
      recordId: args.id, beforeData: existing, afterData: null,
    });
    return { id: args.id };
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    reviewType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    if (args.reviewType !== undefined) {
      results = results.filter((r) => r.reviewType === args.reviewType);
    }

    return { data: results, count: results.length };
  },
});

export const _get = internalQuery({
  args: {
    userId: v.id("users"),
    id: v.id("reviews"),
  },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.id);
    if (!review || review.userId !== args.userId) {
      return null;
    }
    return review;
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    reviewType: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
    content: v.any(),
    score: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const reviewId = await ctx.db.insert("reviews", {
      userId: args.userId,
      reviewType: args.reviewType,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      content: args.content,
      score: args.score,
    });

    const review = await ctx.db.get(reviewId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "reviews",
      recordId: reviewId,
      beforeData: null,
      afterData: review,
    });

    return review;
  },
});

export const _remove = internalMutation({
  args: { userId: v.id("users"), id: v.id("reviews") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) throw new Error("Review not found");
    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId: args.userId, action: "delete", tableName: "reviews",
      recordId: args.id, beforeData: existing, afterData: null,
    });
    return { id: args.id };
  },
});
