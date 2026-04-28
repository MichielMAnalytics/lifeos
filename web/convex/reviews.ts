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

// ── latestOfType ──────────────────────────────────────
// Returns the single most-recent review of a given type. Scans the
// user's reviews in desc creation-time order and returns the first
// match. Used by the Today page's "This week" card.

export const latestOfType = query({
  args: { reviewType: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return reviews.find((r) => r.reviewType === args.reviewType) ?? null;
  },
});

// ── findByPeriod ──────────────────────────────────────
// Returns the (single) review covering an exact period if it exists. The
// reviews schedule view uses this per period to know whether the current
// week/month/quarter has been completed.

export const findByPeriod = query({
  args: {
    reviewType: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const results = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return (
      results.find(
        (r) =>
          r.reviewType === args.reviewType &&
          r.periodStart === args.periodStart &&
          r.periodEnd === args.periodEnd,
      ) ?? null
    );
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
    if (
      args.score !== undefined &&
      (!Number.isInteger(args.score) || args.score < 1 || args.score > 10)
    ) {
      throw new Error("Review score must be an integer from 1 to 10");
    }

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

// ── createMovingFuture ───────────────────────────────
// Creates a quarterly review (Moving Future payload) plus the suggested
// goals for the next quarter — atomically, so a partially-saved state is
// impossible. The wizard can pass priorities with `createAsGoal: false` to
// log a priority without spawning a goal.

export const createMovingFuture = mutation({
  args: {
    periodStart: v.string(),     // closing quarter (YYYY-MM-DD)
    periodEnd: v.string(),
    quarterLabel: v.string(),    // e.g. "Q1 2026"
    nextQuarterLabel: v.string(),
    nextQuarterGoalKey: v.string(), // e.g. "2026-Q2" — used as goals.quarter
    morale: v.object({
      proudest: v.string(),
      wins: v.array(v.string()),
    }),
    momentum: v.object({
      confidentAbout: v.string(),
    }),
    motivation: v.object({
      excitedAbout: v.string(),
    }),
    priorities: v.array(v.object({
      title: v.string(),
      createAsGoal: v.boolean(),
    })),
    score: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Spawn goals first so we can stamp their IDs into the review payload.
    // All inserts share this transaction, so a failure aborts everything.
    const createdGoalIds: string[] = [];
    for (const p of args.priorities) {
      if (!p.createAsGoal || !p.title.trim()) continue;
      const goalId = await ctx.db.insert("goals", {
        userId,
        title: p.title.trim(),
        status: "active",
        quarter: args.nextQuarterGoalKey,
      });
      createdGoalIds.push(goalId);
      await ctx.db.insert("mutationLog", {
        userId,
        action: "create",
        tableName: "goals",
        recordId: goalId,
        beforeData: null,
        afterData: await ctx.db.get(goalId),
      });
    }

    const reviewId = await ctx.db.insert("reviews", {
      userId,
      reviewType: "quarterly",
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      content: {
        type: "moving-future",
        quarterLabel: args.quarterLabel,
        nextQuarterLabel: args.nextQuarterLabel,
        morale: args.morale,
        momentum: args.momentum,
        motivation: args.motivation,
        priorities: args.priorities
          .filter((p) => p.title.trim().length > 0)
          .map((p) => ({
            title: p.title.trim(),
            createdAsGoal: p.createAsGoal,
          })),
        createdGoalIds,
      },
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

    return { review, createdGoalIds };
  },
});

// Internal version of createMovingFuture so the HTTP / CLI layer (which
// authenticates via API key, not Convex Auth) can call it. Mirrors the
// public mutation body exactly — userId comes from the route, not from
// `getAuthUserId`.
export const _createMovingFuture = internalMutation({
  args: {
    userId: v.id("users"),
    periodStart: v.string(),
    periodEnd: v.string(),
    quarterLabel: v.string(),
    nextQuarterLabel: v.string(),
    nextQuarterGoalKey: v.string(),
    morale: v.object({ proudest: v.string(), wins: v.array(v.string()) }),
    momentum: v.object({ confidentAbout: v.string() }),
    motivation: v.object({ excitedAbout: v.string() }),
    priorities: v.array(v.object({
      title: v.string(),
      createAsGoal: v.boolean(),
    })),
    score: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const createdGoalIds: string[] = [];
    for (const p of args.priorities) {
      if (!p.createAsGoal || !p.title.trim()) continue;
      const goalId = await ctx.db.insert("goals", {
        userId: args.userId,
        title: p.title.trim(),
        status: "active",
        quarter: args.nextQuarterGoalKey,
      });
      createdGoalIds.push(goalId);
      await ctx.db.insert("mutationLog", {
        userId: args.userId,
        action: "create",
        tableName: "goals",
        recordId: goalId,
        beforeData: null,
        afterData: await ctx.db.get(goalId),
      });
    }

    const reviewId = await ctx.db.insert("reviews", {
      userId: args.userId,
      reviewType: "quarterly",
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      content: {
        type: "moving-future",
        quarterLabel: args.quarterLabel,
        nextQuarterLabel: args.nextQuarterLabel,
        morale: args.morale,
        momentum: args.momentum,
        motivation: args.motivation,
        priorities: args.priorities
          .filter((p) => p.title.trim().length > 0)
          .map((p) => ({
            title: p.title.trim(),
            createdAsGoal: p.createAsGoal,
          })),
        createdGoalIds,
      },
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

    return { review, createdGoalIds };
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
