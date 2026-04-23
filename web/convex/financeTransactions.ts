// Finance transactions — the core ledger. Public surface covers the
// dashboard's needs (inbox, category triage, monthly summary) and the CLI
// (list / categorize / exclude). Bulk imports happen through the internal
// `_bulkUpsert` so the upload action can land hundreds of rows in a single
// transaction.

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { merchantKeyFor } from "./merchantMemory";

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    status: v.optional(v.string()),
    categoryId: v.optional(v.id("financeCategories")),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 1000);

    let rows: Doc<"financeTransactions">[];
    if (args.status !== undefined) {
      rows = await ctx.db
        .query("financeTransactions")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", userId).eq("status", args.status!),
        )
        .order("desc")
        .take(limit);
    } else {
      rows = await ctx.db
        .query("financeTransactions")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId))
        .order("desc")
        .take(limit);
    }

    if (args.categoryId) rows = rows.filter((r) => r.categoryId === args.categoryId);
    if (args.dateFrom) rows = rows.filter((r) => r.date >= args.dateFrom!);
    if (args.dateTo) rows = rows.filter((r) => r.date <= args.dateTo!);

    return rows;
  },
});

// ── uncategorized ─────────────────────────────────────
// Inbox view — uncategorized transactions newest-first, with their AI
// suggestion (if any) already attached on the row so the UI can render
// "Apply suggestion" without a second query.

export const uncategorized = query({
  args: { limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 500);
    return await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "uncategorized"),
      )
      .order("desc")
      .take(limit);
  },
});

// ── monthlySummary ────────────────────────────────────
// "This month" view: total income, total spend (in USD), and per-category
// spend rollup. All amounts are USD via the cached `amountUsd` field
// (populated at import time via the FX action). Excluded rows ignored.

export const monthlySummary = query({
  args: { yearMonth: v.optional(v.string()) }, // "YYYY-MM", default current month
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const yearMonth = args.yearMonth ?? new Date().toISOString().slice(0, 7);
    const start = `${yearMonth}-01`;
    const end = `${yearMonth}-31`;

    const rows = await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).gte("date", start).lte("date", end),
      )
      .collect();

    let income = 0;
    let spend = 0;
    let unconverted = 0;
    const byCategory: Record<string, number> = {};
    let categorized = 0;
    let uncategorized = 0;

    for (const t of rows) {
      if (t.status === "excluded") continue;
      // Only roll up rows we can express in USD. Falling back to the
      // native amount silently mixed (e.g.) IDR rupiah into USD totals,
      // which is worse than just counting "N unconverted" so the user
      // knows to refresh FX rates or fix the row.
      const isUsd = t.currency.toUpperCase() === "USD";
      const usd = isUsd ? t.amount : t.amountUsd;
      if (usd === undefined) {
        unconverted++;
      } else if (t.isIncome) {
        income += Math.abs(usd);
      } else {
        spend += Math.abs(usd);
      }
      if (t.status === "categorized" && t.categoryId) {
        categorized++;
        if (usd !== undefined && !t.isIncome) {
          const k = String(t.categoryId);
          byCategory[k] = (byCategory[k] ?? 0) + Math.abs(usd);
        }
      } else if (t.status === "uncategorized") {
        uncategorized++;
      }
    }

    return {
      yearMonth,
      income,
      spend,
      net: income - spend,
      counts: { total: rows.length, categorized, uncategorized, unconverted },
      byCategory,
    };
  },
});

// ── categorize ────────────────────────────────────────
// Single-row categorization. Also stamps merchant memory so future
// transactions for the same merchant get an instant suggestion.

export const categorize = mutation({
  args: {
    id: v.id("financeTransactions"),
    categoryId: v.id("financeCategories"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Transaction not found");
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.userId !== userId) throw new Error("Category not found");

    await ctx.db.patch(args.id, {
      categoryId: args.categoryId,
      status: "categorized",
      isIncome: category.isIncome,
      // Clear stale suggestions so the inbox doesn't keep showing them.
      suggestedCategoryId: undefined,
      suggestionConfidence: undefined,
      suggestionSource: undefined,
      updatedAt: Date.now(),
    });

    const after = await ctx.db.get(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "update", tableName: "financeTransactions",
      recordId: args.id, beforeData: existing, afterData: after,
    });

    // Update merchant memory so future imports auto-suggest.
    const key = merchantKeyFor(existing.merchantRaw ?? existing.description);
    if (key) {
      const mem = await ctx.db
        .query("merchantCategoryMemory")
        .withIndex("by_userId_merchantKey", (q) =>
          q.eq("userId", userId).eq("merchantKey", key),
        )
        .unique();
      const now = Date.now();
      if (mem) {
        await ctx.db.patch(mem._id, {
          categoryId: args.categoryId,
          usageCount: mem.usageCount + 1,
          lastUsedAt: now,
        });
      } else {
        await ctx.db.insert("merchantCategoryMemory", {
          userId,
          merchantKey: key,
          categoryId: args.categoryId,
          usageCount: 1,
          lastUsedAt: now,
        });
      }
    }
    return after;
  },
});

// ── applySuggestions ──────────────────────────────────
// Bulk-accept AI suggestions for a set of transactions. Used by the inbox
// "Accept all" button. Only accepts where the suggestion still points at
// a valid (non-deleted) category.

export const applySuggestions = mutation({
  args: { ids: v.array(v.id("financeTransactions")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let applied = 0;
    let skipped = 0;
    for (const id of args.ids) {
      const t = await ctx.db.get(id);
      if (!t || t.userId !== userId) { skipped++; continue; }
      if (!t.suggestedCategoryId) { skipped++; continue; }
      const cat = await ctx.db.get(t.suggestedCategoryId);
      if (!cat || cat.userId !== userId) { skipped++; continue; }

      await ctx.db.patch(id, {
        categoryId: t.suggestedCategoryId,
        status: "categorized",
        isIncome: cat.isIncome,
        suggestedCategoryId: undefined,
        suggestionConfidence: undefined,
        suggestionSource: undefined,
        updatedAt: Date.now(),
      });
      applied++;

      const key = merchantKeyFor(t.merchantRaw ?? t.description);
      if (key) {
        const mem = await ctx.db
          .query("merchantCategoryMemory")
          .withIndex("by_userId_merchantKey", (q) =>
            q.eq("userId", userId).eq("merchantKey", key),
          )
          .unique();
        if (mem) {
          await ctx.db.patch(mem._id, {
            categoryId: t.suggestedCategoryId,
            usageCount: mem.usageCount + 1,
            lastUsedAt: Date.now(),
          });
        } else {
          await ctx.db.insert("merchantCategoryMemory", {
            userId,
            merchantKey: key,
            categoryId: t.suggestedCategoryId,
            usageCount: 1,
            lastUsedAt: Date.now(),
          });
        }
      }
    }
    return { applied, skipped };
  },
});

// ── exclude ──────────────────────────────────────────
// "Don't count this in spend totals" — internal transfers, refunds the
// user wants to drop from reporting, etc. Excluded rows still show up in
// the ledger but never roll up.

export const setExcluded = mutation({
  args: { id: v.id("financeTransactions"), excluded: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Transaction not found");
    await ctx.db.patch(args.id, {
      status: args.excluded ? "excluded" : (existing.categoryId ? "categorized" : "uncategorized"),
      updatedAt: Date.now(),
    });
    const after = await ctx.db.get(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "update", tableName: "financeTransactions",
      recordId: args.id, beforeData: existing, afterData: after,
    });
    return after;
  },
});

// ── remove ──────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("financeTransactions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Transaction not found");
    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "delete", tableName: "financeTransactions",
      recordId: args.id, beforeData: existing, afterData: null,
    });
    return { id: args.id };
  },
});

// ══════════════════════════════════════════════════════
// Internal — called by import + AI categorisation actions
// ══════════════════════════════════════════════════════

export interface NormalizedTxnInput {
  externalId: string;
  date: string;                  // YYYY-MM-DD
  description: string;
  descriptionRaw?: string;
  merchantRaw?: string;
  amount: number;                // signed
  currency: string;
  amountUsd?: number;
  fee?: number;
  direction?: string;
  source: string;                // "revolut" | "wio" | …
}

export const _bulkUpsert = internalMutation({
  args: {
    userId: v.id("users"),
    statementId: v.id("financeStatements"),
    txns: v.array(v.object({
      externalId: v.string(),
      date: v.string(),
      description: v.string(),
      descriptionRaw: v.optional(v.string()),
      merchantRaw: v.optional(v.string()),
      amount: v.float64(),
      currency: v.string(),
      amountUsd: v.optional(v.float64()),
      fee: v.optional(v.float64()),
      direction: v.optional(v.string()),
      source: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;
    for (const t of args.txns) {
      // Dedup against earlier uploads that share the externalId.
      const existing = await ctx.db
        .query("financeTransactions")
        .withIndex("by_userId_externalId", (q) =>
          q.eq("userId", args.userId).eq("externalId", t.externalId),
        )
        .unique();
      if (existing) {
        skipped++;
        continue;
      }
      await ctx.db.insert("financeTransactions", {
        userId: args.userId,
        statementId: args.statementId,
        externalId: t.externalId,
        date: t.date,
        description: t.description,
        descriptionRaw: t.descriptionRaw,
        merchantRaw: t.merchantRaw,
        amount: t.amount,
        currency: t.currency,
        amountUsd: t.amountUsd,
        fee: t.fee,
        direction: t.direction,
        status: "uncategorized",
        source: t.source,
        isIncome: false,
        updatedAt: Date.now(),
      });
      inserted++;
    }
    return { inserted, skipped };
  },
});

export const _setSuggestion = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("financeTransactions"),
    suggestedCategoryId: v.id("financeCategories"),
    suggestionConfidence: v.float64(),
    suggestionSource: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) return null;
    if (existing.status !== "uncategorized") return null;
    // Validate the suggested category still exists and belongs to this
    // user — guards against a race where the category was deleted between
    // the AI prompt and the patch landing here.
    const category = await ctx.db.get(args.suggestedCategoryId);
    if (!category || category.userId !== args.userId) return null;
    await ctx.db.patch(args.id, {
      suggestedCategoryId: args.suggestedCategoryId,
      suggestionConfidence: args.suggestionConfidence,
      suggestionSource: args.suggestionSource,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

export const _listUncategorized = internalQuery({
  args: { userId: v.id("users"), limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    return await ctx.db
      .query("financeTransactions")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "uncategorized"),
      )
      .order("desc")
      .take(limit);
  },
});

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 1000);
    let rows: Doc<"financeTransactions">[];
    if (args.status !== undefined) {
      rows = await ctx.db
        .query("financeTransactions")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status!),
        )
        .order("desc")
        .take(limit);
    } else {
      rows = await ctx.db
        .query("financeTransactions")
        .withIndex("by_userId_date", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(limit);
    }
    return { data: rows, count: rows.length };
  },
});

export const _categorize = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("financeTransactions"),
    categoryId: v.id("financeCategories"),
  },
  handler: async (ctx, args): Promise<Doc<"financeTransactions"> | null> => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) return null;
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.userId !== args.userId) return null;
    await ctx.db.patch(args.id, {
      categoryId: args.categoryId,
      status: "categorized",
      isIncome: category.isIncome,
      suggestedCategoryId: undefined,
      suggestionConfidence: undefined,
      suggestionSource: undefined,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

// Helper for the AI action — fetch the categories list as a lightweight
// payload (id, name, isIncome). Skipping color saves a few bytes per call.
export const _categoriesForLlm = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("financeCategories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    return rows.map((c) => ({ id: c._id as Id<"financeCategories">, name: c.name, isIncome: c.isIncome }));
  },
});
