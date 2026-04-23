// Finance categories — per-user taxonomy. The dashboard seeds the 13 defaults
// the first time a user touches finance (via `seedDefaults`), so users never
// see an empty category picker. Custom categories live alongside seeded ones;
// only `isDefault: true` rows are recreated on re-seed.

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// The 13 seed categories — same names as the previous AIOS so any
// transaction history Kemp has already classified mentally lines up. Colors
// are chosen for clear differentiation on the spend-by-category chart.
export const DEFAULT_CATEGORIES: Array<{ name: string; color: string; isIncome: boolean }> = [
  { name: "Food & Dining",    color: "#f97316", isIncome: false },
  { name: "Transport",        color: "#3b82f6", isIncome: false },
  { name: "Housing",          color: "#a855f7", isIncome: false },
  { name: "Subscriptions",    color: "#06b6d4", isIncome: false },
  { name: "Shopping",         color: "#ec4899", isIncome: false },
  { name: "Health",           color: "#10b981", isIncome: false },
  { name: "Entertainment",    color: "#eab308", isIncome: false },
  { name: "Travel",           color: "#14b8a6", isIncome: false },
  { name: "Business",         color: "#6366f1", isIncome: false },
  { name: "Other",            color: "#94a3b8", isIncome: false },
  { name: "Salary",           color: "#22c55e", isIncome: true },
  { name: "Freelance",        color: "#84cc16", isIncome: true },
  { name: "Other Income",     color: "#16a34a", isIncome: true },
];

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const rows = await ctx.db
      .query("financeCategories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  },
});

// ── seedDefaults ──────────────────────────────────────
// Idempotent: only inserts the defaults that don't already exist. Safe to
// call on every dashboard mount of a finance page.

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("financeCategories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

    let inserted = 0;
    for (const def of DEFAULT_CATEGORIES) {
      if (existingNames.has(def.name.toLowerCase())) continue;
      await ctx.db.insert("financeCategories", {
        userId,
        name: def.name,
        color: def.color,
        isIncome: def.isIncome,
        isDefault: true,
        updatedAt: Date.now(),
      });
      inserted++;
    }
    return { inserted };
  },
});

// ── create / update / remove ──────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    isIncome: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const id = await ctx.db.insert("financeCategories", {
      userId,
      name: args.name.trim(),
      color: args.color,
      isIncome: args.isIncome,
      isDefault: false,
      updatedAt: Date.now(),
    });
    const row = await ctx.db.get(id);
    await ctx.db.insert("mutationLog", {
      userId, action: "create", tableName: "financeCategories",
      recordId: id, beforeData: null, afterData: row,
    });
    return row;
  },
});

export const update = mutation({
  args: {
    id: v.id("financeCategories"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    isIncome: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Category not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.color !== undefined) updates.color = args.color;
    if (args.isIncome !== undefined) updates.isIncome = args.isIncome;

    await ctx.db.patch(args.id, updates);
    const after = await ctx.db.get(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "update", tableName: "financeCategories",
      recordId: args.id, beforeData: existing, afterData: after,
    });
    return after;
  },
});

export const remove = mutation({
  args: { id: v.id("financeCategories") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Category not found");

    // Don't orphan transactions — clear the categoryId on any txn pointing
    // at this category, and re-mark them uncategorized so the user gets a
    // chance to re-bucket. Also clear stale `suggestedCategoryId` and
    // delete merchant-memory rows pointing here so future imports don't
    // keep suggesting a category that no longer exists.
    const linked = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const t of linked) {
      const patch: Record<string, unknown> = {};
      if (t.categoryId === args.id) {
        patch.categoryId = undefined;
        patch.status = "uncategorized";
        patch.isIncome = false;
      }
      if (t.suggestedCategoryId === args.id) {
        patch.suggestedCategoryId = undefined;
        patch.suggestionConfidence = undefined;
        patch.suggestionSource = undefined;
      }
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = Date.now();
        await ctx.db.patch(t._id, patch);
      }
    }

    const memRows = await ctx.db
      .query("merchantCategoryMemory")
      .withIndex("by_userId_merchantKey", (q) => q.eq("userId", userId))
      .collect();
    for (const m of memRows) {
      if (m.categoryId === args.id) await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "delete", tableName: "financeCategories",
      recordId: args.id, beforeData: existing, afterData: null,
    });
    return { id: args.id };
  },
});

// ══════════════════════════════════════════════════════
// Internal — used by HTTP layer + the categorisation actions.
// ══════════════════════════════════════════════════════

export const _list = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("financeCategories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return { data: rows, count: rows.length };
  },
});

export const _seedDefaults = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("financeCategories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
    let inserted = 0;
    for (const def of DEFAULT_CATEGORIES) {
      if (existingNames.has(def.name.toLowerCase())) continue;
      await ctx.db.insert("financeCategories", {
        userId: args.userId,
        name: def.name,
        color: def.color,
        isIncome: def.isIncome,
        isDefault: true,
        updatedAt: Date.now(),
      });
      inserted++;
    }
    return { inserted };
  },
});
