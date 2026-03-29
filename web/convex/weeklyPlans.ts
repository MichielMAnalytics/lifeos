import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mondayOfCurrentWeek } from "./lib/helpers";

const weeklyGoalValidator = v.object({
  title: v.string(),
  status: v.optional(v.string()),
  goalId: v.optional(v.string()),
});

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    current: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.current) {
      // Return only the current week's plan
      const monday = mondayOfCurrentWeek();
      const plan = await ctx.db
        .query("weeklyPlans")
        .withIndex("by_userId_weekStart", (q) =>
          q.eq("userId", userId).eq("weekStart", monday),
        )
        .unique();

      return plan;
    }

    const results = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_userId_weekStart", (q) =>
        q.eq("userId", userId),
      )
      .collect();

    return results;
  },
});

// ── getByDate ─────────────────────────────────────────

export const getByDate = query({
  args: {
    weekStart: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_userId_weekStart", (q) =>
        q.eq("userId", userId).eq("weekStart", args.weekStart),
      )
      .unique();

    return plan;
  },
});

// ── upsert ────────────────────────────────────────────

export const upsert = mutation({
  args: {
    weekStart: v.string(),
    theme: v.optional(v.string()),
    goals: v.optional(v.array(weeklyGoalValidator)),
    reviewScore: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_userId_weekStart", (q) =>
        q.eq("userId", userId).eq("weekStart", args.weekStart),
      )
      .unique();

    if (existing) {
      // Patch existing plan
      const updates: Record<string, unknown> = {};
      if (args.theme !== undefined) updates.theme = args.theme;
      if (args.goals !== undefined) updates.goals = args.goals;
      if (args.reviewScore !== undefined) updates.reviewScore = args.reviewScore;

      await ctx.db.patch(existing._id, updates);
      const updated = await ctx.db.get(existing._id);

      await ctx.db.insert("mutationLog", {
        userId,
        action: "update",
        tableName: "weeklyPlans",
        recordId: existing._id,
        beforeData: existing,
        afterData: updated,
      });

      return updated;
    } else {
      // Create new plan
      const planId = await ctx.db.insert("weeklyPlans", {
        userId,
        weekStart: args.weekStart,
        theme: args.theme,
        goals: args.goals ?? [],
        reviewScore: args.reviewScore,
      });

      const plan = await ctx.db.get(planId);

      await ctx.db.insert("mutationLog", {
        userId,
        action: "create",
        tableName: "weeklyPlans",
        recordId: planId,
        beforeData: null,
        afterData: plan,
      });

      return plan;
    }
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    current: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.current === true) {
      const weekStart = mondayOfCurrentWeek();
      const plans = await ctx.db
        .query("weeklyPlans")
        .withIndex("by_userId_weekStart", (q) =>
          q.eq("userId", args.userId).eq("weekStart", weekStart),
        )
        .collect();
      const plan = plans[0] ?? null;
      if (!plan) return { error: "No plan for current week" };
      return { data: plan };
    }

    const results = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_userId_weekStart", (q) => q.eq("userId", args.userId))
      .collect();

    return { data: results, count: results.length };
  },
});

export const _getByWeekStart = internalQuery({
  args: { userId: v.id("users"), weekStart: v.string() },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_userId_weekStart", (q) =>
        q.eq("userId", args.userId).eq("weekStart", args.weekStart),
      )
      .collect();
    return plans[0] ?? null;
  },
});

export const _remove = internalMutation({
  args: {
    userId: v.id("users"),
    weekStart: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_userId_weekStart", (q) =>
        q.eq("userId", args.userId).eq("weekStart", args.weekStart),
      )
      .unique();

    if (!existing) {
      throw new Error("Weekly plan not found");
    }

    await ctx.db.delete(existing._id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "weeklyPlans",
      recordId: existing._id,
      beforeData: existing,
      afterData: null,
    });

    return { id: existing._id };
  },
});

export const _upsert = internalMutation({
  args: {
    userId: v.id("users"),
    weekStart: v.string(),
    theme: v.optional(v.string()),
    goals: v.optional(v.array(weeklyGoalValidator)),
    reviewScore: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_userId_weekStart", (q) =>
        q.eq("userId", args.userId).eq("weekStart", args.weekStart),
      )
      .first();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (args.theme !== undefined) updates.theme = args.theme;
      if (args.goals !== undefined) updates.goals = args.goals;
      if (args.reviewScore !== undefined) updates.reviewScore = args.reviewScore;

      await ctx.db.patch(existing._id, updates);
      const updated = await ctx.db.get(existing._id);

      await ctx.db.insert("mutationLog", {
        userId: args.userId,
        action: "update",
        tableName: "weeklyPlans",
        recordId: existing._id,
        beforeData: existing,
        afterData: updated,
      });

      return updated;
    } else {
      const planId = await ctx.db.insert("weeklyPlans", {
        userId: args.userId,
        weekStart: args.weekStart,
        theme: args.theme,
        goals: args.goals ?? [],
        reviewScore: args.reviewScore,
      });

      const plan = await ctx.db.get(planId);

      await ctx.db.insert("mutationLog", {
        userId: args.userId,
        action: "create",
        tableName: "weeklyPlans",
        recordId: planId,
        beforeData: null,
        afterData: plan,
      });

      return plan;
    }
  },
});
