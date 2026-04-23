// FX rate cache. Lookups + writes — the actual fetch from Frankfurter (or
// any other provider) lives in `financeFx.ts` because that needs `fetch`
// in an action, not a transaction.

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const _get = internalQuery({
  args: {
    date: v.string(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.currency === "USD") return { date: args.date, currency: "USD", rateToUsd: 1 };
    const row = await ctx.db
      .query("fxRates")
      .withIndex("by_date_currency", (q) =>
        q.eq("date", args.date).eq("currency", args.currency.toUpperCase()),
      )
      .unique();
    return row ?? null;
  },
});

export const _put = internalMutation({
  args: {
    date: v.string(),
    currency: v.string(),
    rateToUsd: v.float64(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const currency = args.currency.toUpperCase();
    const existing = await ctx.db
      .query("fxRates")
      .withIndex("by_date_currency", (q) =>
        q.eq("date", args.date).eq("currency", currency),
      )
      .unique();
    if (existing) {
      // Daily rates are immutable — but if a backfill arrives with a
      // higher-quality source, replace.
      if (existing.source !== args.source) {
        await ctx.db.patch(existing._id, {
          rateToUsd: args.rateToUsd,
          source: args.source,
        });
      }
      return existing._id;
    }
    return await ctx.db.insert("fxRates", {
      date: args.date,
      currency,
      rateToUsd: args.rateToUsd,
      source: args.source,
    });
  },
});
