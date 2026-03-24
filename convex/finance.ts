import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Transactions ─────────────────────────────────────

export const listTransactions = query({
  args: {
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    categoryId: v.optional(v.id("financeCategories")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let results = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Apply date range filters
    if (args.from !== undefined) {
      results = results.filter((t) => t.date >= args.from!);
    }
    if (args.to !== undefined) {
      results = results.filter((t) => t.date <= args.to!);
    }
    if (args.categoryId !== undefined) {
      results = results.filter((t) => t.categoryId === args.categoryId);
    }

    // Sort by date descending
    results.sort((a, b) => (a.date > b.date ? -1 : 1));

    return { data: results, count: results.length };
  },
});

export const createTransaction = mutation({
  args: {
    date: v.string(),
    amount: v.float64(),
    currency: v.optional(v.string()),
    categoryId: v.optional(v.id("financeCategories")),
    merchant: v.optional(v.string()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const txId = await ctx.db.insert("financeTransactions", {
      userId,
      date: args.date,
      amount: args.amount,
      currency: args.currency ?? "USD",
      categoryId: args.categoryId,
      merchant: args.merchant,
      notes: args.notes,
      source: args.source,
      externalId: args.externalId,
    });

    const tx = await ctx.db.get(txId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "financeTransactions",
      recordId: txId,
      beforeData: null,
      afterData: tx,
    });

    return tx;
  },
});

// ── Categories ───────────────────────────────────────

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const results = await ctx.db
      .query("financeCategories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return { data: results, count: results.length };
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id("financeCategories")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const catId = await ctx.db.insert("financeCategories", {
      userId,
      name: args.name,
      parentId: args.parentId,
    });

    const category = await ctx.db.get(catId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "financeCategories",
      recordId: catId,
      beforeData: null,
      afterData: category,
    });

    return category;
  },
});

// ── Net Worth ────────────────────────────────────────

export const listNetWorth = query({
  args: {
    latest: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const results = await ctx.db
      .query("netWorthSnapshots")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Sort by date descending
    results.sort((a, b) => (a.date > b.date ? -1 : 1));

    if (args.latest === true) {
      const snapshot = results[0] ?? null;
      return { data: snapshot };
    }

    return { data: results, count: results.length };
  },
});

export const createNetWorthSnapshot = mutation({
  args: {
    date: v.string(),
    breakdown: v.any(),
    total: v.float64(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const snapshotId = await ctx.db.insert("netWorthSnapshots", {
      userId,
      date: args.date,
      breakdown: args.breakdown,
      total: args.total,
      notes: args.notes,
    });

    const snapshot = await ctx.db.get(snapshotId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "netWorthSnapshots",
      recordId: snapshotId,
      beforeData: null,
      afterData: snapshot,
    });

    return snapshot;
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _listTransactions = internalQuery({
  args: {
    userId: v.id("users"),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    categoryId: v.optional(v.id("financeCategories")),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    if (args.from !== undefined) {
      results = results.filter((t) => t.date >= args.from!);
    }
    if (args.to !== undefined) {
      results = results.filter((t) => t.date <= args.to!);
    }
    if (args.categoryId !== undefined) {
      results = results.filter((t) => t.categoryId === args.categoryId);
    }

    results.sort((a, b) => (a.date > b.date ? -1 : 1));

    return { data: results, count: results.length };
  },
});

export const _createTransaction = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    amount: v.float64(),
    currency: v.optional(v.string()),
    categoryId: v.optional(v.id("financeCategories")),
    merchant: v.optional(v.string()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const txId = await ctx.db.insert("financeTransactions", {
      userId: args.userId,
      date: args.date,
      amount: args.amount,
      currency: args.currency ?? "USD",
      categoryId: args.categoryId,
      merchant: args.merchant,
      notes: args.notes,
      source: args.source,
      externalId: args.externalId,
    });

    const tx = await ctx.db.get(txId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "financeTransactions",
      recordId: txId,
      beforeData: null,
      afterData: tx,
    });

    return tx;
  },
});

export const _listCategories = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("financeCategories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return { data: results, count: results.length };
  },
});

export const _createCategory = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    parentId: v.optional(v.id("financeCategories")),
  },
  handler: async (ctx, args) => {
    const catId = await ctx.db.insert("financeCategories", {
      userId: args.userId,
      name: args.name,
      parentId: args.parentId,
    });

    const category = await ctx.db.get(catId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "financeCategories",
      recordId: catId,
      beforeData: null,
      afterData: category,
    });

    return category;
  },
});

export const _listNetWorth = internalQuery({
  args: {
    userId: v.id("users"),
    latest: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("netWorthSnapshots")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    results.sort((a, b) => (a.date > b.date ? -1 : 1));

    if (args.latest === true) {
      const snapshot = results[0] ?? null;
      return { data: snapshot };
    }

    return { data: results, count: results.length };
  },
});

export const _createNetWorthSnapshot = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    breakdown: v.any(),
    total: v.float64(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const snapshotId = await ctx.db.insert("netWorthSnapshots", {
      userId: args.userId,
      date: args.date,
      breakdown: args.breakdown,
      total: args.total,
      notes: args.notes,
    });

    const snapshot = await ctx.db.get(snapshotId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "netWorthSnapshots",
      recordId: snapshotId,
      beforeData: null,
      afterData: snapshot,
    });

    return snapshot;
  },
});
