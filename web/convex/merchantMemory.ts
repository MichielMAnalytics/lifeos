// Merchant → category memory. Every confirmed categorisation stamps a
// row here so future transactions for the same merchant get an instant
// suggestion (no LLM call). Lookups are cheap (`by_userId_merchantKey`
// index), writes happen on every successful categorise.

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

/** Normalise merchant text so "Starbucks #214" and "STARBUCKS #214" both hash to the same key. */
export function merchantKeyFor(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

export const _lookup = internalQuery({
  args: {
    userId: v.id("users"),
    merchantKey: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"merchantCategoryMemory"> | null> => {
    if (!args.merchantKey) return null;
    return await ctx.db
      .query("merchantCategoryMemory")
      .withIndex("by_userId_merchantKey", (q) =>
        q.eq("userId", args.userId).eq("merchantKey", args.merchantKey),
      )
      .unique();
  },
});

export const _record = internalMutation({
  args: {
    userId: v.id("users"),
    merchantKey: v.string(),
    categoryId: v.id("financeCategories"),
  },
  handler: async (ctx, args) => {
    if (!args.merchantKey) return null;
    const existing = await ctx.db
      .query("merchantCategoryMemory")
      .withIndex("by_userId_merchantKey", (q) =>
        q.eq("userId", args.userId).eq("merchantKey", args.merchantKey),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        categoryId: args.categoryId,
        usageCount: existing.usageCount + 1,
        lastUsedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("merchantCategoryMemory", {
      userId: args.userId,
      merchantKey: args.merchantKey,
      categoryId: args.categoryId,
      usageCount: 1,
      lastUsedAt: now,
    });
  },
});
