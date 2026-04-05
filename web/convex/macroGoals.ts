import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_GOALS = { calories: 2200, protein: 150, carbs: 200, fat: 65 };

// ── get (public, for dashboard) ─────────────────────

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return DEFAULT_GOALS;

    const goals = await ctx.db
      .query("macroGoals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    return goals
      ? { calories: goals.calories, protein: goals.protein, carbs: goals.carbs, fat: goals.fat }
      : DEFAULT_GOALS;
  },
});

// ── upsert (public, for dashboard) ──────────────────

export const upsert = mutation({
  args: {
    calories: v.optional(v.float64()),
    protein: v.optional(v.float64()),
    carbs: v.optional(v.float64()),
    fat: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate: must be positive finite numbers
    for (const [key, val] of Object.entries(args)) {
      if (val !== undefined && (typeof val !== 'number' || !isFinite(val) || val <= 0)) {
        throw new Error(`${key} must be a positive number`);
      }
    }

    const existing = await ctx.db
      .query("macroGoals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    const now = Date.now();

    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (args.calories !== undefined) updates.calories = args.calories;
      if (args.protein !== undefined) updates.protein = args.protein;
      if (args.carbs !== undefined) updates.carbs = args.carbs;
      if (args.fat !== undefined) updates.fat = args.fat;
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      return await ctx.db.insert("macroGoals", {
        userId,
        calories: args.calories ?? DEFAULT_GOALS.calories,
        protein: args.protein ?? DEFAULT_GOALS.protein,
        carbs: args.carbs ?? DEFAULT_GOALS.carbs,
        fat: args.fat ?? DEFAULT_GOALS.fat,
        updatedAt: now,
      });
    }
  },
});

// ── _get (internal, for HTTP API) ───────────────────

export const _get = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const goals = await ctx.db
      .query("macroGoals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    return goals
      ? { calories: goals.calories, protein: goals.protein, carbs: goals.carbs, fat: goals.fat }
      : DEFAULT_GOALS;
  },
});

// ── _upsert (internal, for HTTP API) ────────────────

export const _upsert = internalMutation({
  args: {
    userId: v.id("users"),
    calories: v.optional(v.float64()),
    protein: v.optional(v.float64()),
    carbs: v.optional(v.float64()),
    fat: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("macroGoals")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    const now = Date.now();

    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (args.calories !== undefined) updates.calories = args.calories;
      if (args.protein !== undefined) updates.protein = args.protein;
      if (args.carbs !== undefined) updates.carbs = args.carbs;
      if (args.fat !== undefined) updates.fat = args.fat;
      await ctx.db.patch(existing._id, updates);
      return { ...existing, ...updates };
    } else {
      const goals = {
        userId: args.userId,
        calories: args.calories ?? DEFAULT_GOALS.calories,
        protein: args.protein ?? DEFAULT_GOALS.protein,
        carbs: args.carbs ?? DEFAULT_GOALS.carbs,
        fat: args.fat ?? DEFAULT_GOALS.fat,
        updatedAt: now,
      };
      const id = await ctx.db.insert("macroGoals", goals);
      return { _id: id, ...goals };
    }
  },
});
