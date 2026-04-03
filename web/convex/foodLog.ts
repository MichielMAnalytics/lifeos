import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    entryDate: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let results = await ctx.db
      .query("foodLog")
      .withIndex("by_userId_entryDate", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    if (args.entryDate) {
      results = results.filter((f) => f.entryDate === args.entryDate);
    }
    if (args.from) {
      results = results.filter((f) => f.entryDate >= args.from!);
    }
    if (args.to) {
      results = results.filter((f) => f.entryDate <= args.to!);
    }

    return results;
  },
});

// ── dailyTotals ──────────────────────────────────────

export const dailyTotals = query({
  args: {
    entryDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const entries = await ctx.db
      .query("foodLog")
      .withIndex("by_userId_entryDate", (q) =>
        q.eq("userId", userId),
      )
      .collect();

    const dayEntries = entries.filter((f) => f.entryDate === args.entryDate);

    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      entries: dayEntries.length,
    };

    for (const entry of dayEntries) {
      totals.calories += entry.calories ?? 0;
      totals.protein += entry.protein ?? 0;
      totals.carbs += entry.carbs ?? 0;
      totals.fat += entry.fat ?? 0;
    }

    return totals;
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    entryDate: v.string(),
    name: v.string(),
    mealType: v.optional(v.string()),
    calories: v.optional(v.float64()),
    protein: v.optional(v.float64()),
    carbs: v.optional(v.float64()),
    fat: v.optional(v.float64()),
    quantity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const entryId = await ctx.db.insert("foodLog", {
      userId,
      entryDate: args.entryDate,
      name: args.name,
      mealType: args.mealType,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      quantity: args.quantity,
      updatedAt: now,
    });

    const entry = await ctx.db.get(entryId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "foodLog",
      recordId: entryId,
      beforeData: null,
      afterData: entry,
    });

    return entry;
  },
});

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("foodLog") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Food log entry not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "foodLog",
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
    entryDate: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("foodLog")
      .withIndex("by_userId_entryDate", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    if (args.entryDate) {
      results = results.filter((f) => f.entryDate === args.entryDate);
    }
    if (args.from) {
      results = results.filter((f) => f.entryDate >= args.from!);
    }
    if (args.to) {
      results = results.filter((f) => f.entryDate <= args.to!);
    }

    return { data: results, count: results.length };
  },
});

export const _dailyTotals = internalQuery({
  args: {
    userId: v.id("users"),
    entryDate: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("foodLog")
      .withIndex("by_userId_entryDate", (q) => q.eq("userId", args.userId))
      .collect();

    const dayEntries = entries.filter((f) => f.entryDate === args.entryDate);

    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, entries: dayEntries.length };
    for (const entry of dayEntries) {
      totals.calories += entry.calories ?? 0;
      totals.protein += entry.protein ?? 0;
      totals.carbs += entry.carbs ?? 0;
      totals.fat += entry.fat ?? 0;
    }

    return totals;
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    entryDate: v.string(),
    name: v.string(),
    mealType: v.optional(v.string()),
    calories: v.optional(v.float64()),
    protein: v.optional(v.float64()),
    carbs: v.optional(v.float64()),
    fat: v.optional(v.float64()),
    quantity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const entryId = await ctx.db.insert("foodLog", {
      userId: args.userId,
      entryDate: args.entryDate,
      name: args.name,
      mealType: args.mealType,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      quantity: args.quantity,
      updatedAt: now,
    });

    const entry = await ctx.db.get(entryId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "foodLog",
      recordId: entryId,
      beforeData: null,
      afterData: entry,
    });

    return entry;
  },
});

export const _remove = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("foodLog"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Food log entry not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "foodLog",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});
