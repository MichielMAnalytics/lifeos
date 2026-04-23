// FX rate fetcher — wraps Frankfurter (api.frankfurter.app, ECB rates,
// no key required, supports IDR, AED, EUR, GBP, etc.). Lookup-then-fetch:
// first checks the cached `fxRates` table, only hits the network on miss.
//
// Used by the import action to convert each transaction's amount to USD
// at the transaction date. Without conversion the monthly summary would
// only sum same-currency transactions correctly.
//
// Lives in the V8 runtime — `fetch` is available, no Node built-ins needed.

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

interface FrankfurterResponse {
  amount?: number;
  base?: string;
  date?: string;
  rates?: Record<string, number>;
}

/**
 * Resolve a (currency, date) → rate-to-USD. Cached after the first miss.
 * Returns 1.0 for USD without round-tripping. Returns null for unsupported
 * currencies (caller falls back to leaving `amountUsd` undefined).
 */
async function fetchRate(currency: string, date: string): Promise<number | null> {
  const c = currency.toUpperCase();
  if (c === "USD") return 1;

  // Frankfurter expects historical date in YYYY-MM-DD path component, but
  // weekends/holidays return the previous trading day's rate — that's fine
  // for our purposes (we only need a stamp-in-time conversion).
  const url = `https://api.frankfurter.app/${date}?from=${encodeURIComponent(c)}&to=USD`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timeout);
    console.warn(`[financeFx] fetch failed for ${c}@${date}`, err);
    return null;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    if (res.status === 404) {
      // Frankfurter returns 404 for currencies it doesn't list (e.g.
      // crypto). Tell the caller to give up rather than retry.
      console.warn(`[financeFx] currency ${c} not supported by Frankfurter`);
      return null;
    }
    console.warn(`[financeFx] non-OK ${res.status} for ${c}@${date}`);
    return null;
  }

  let body: FrankfurterResponse;
  try {
    body = (await res.json()) as FrankfurterResponse;
  } catch {
    return null;
  }
  const rate = body.rates?.USD;
  return typeof rate === "number" && rate > 0 ? rate : null;
}

// ── ensureRate (internal — used by import action) ────

export const _ensureRate = internalAction({
  args: { date: v.string(), currency: v.string() },
  handler: async (ctx, args): Promise<number | null> => {
    const c = args.currency.toUpperCase();
    if (c === "USD") return 1;

    const cached = await ctx.runQuery(internal.fxRates._get, {
      date: args.date,
      currency: c,
    });
    if (cached && typeof cached === "object" && "rateToUsd" in cached) {
      return (cached as { rateToUsd: number }).rateToUsd;
    }

    const rate = await fetchRate(c, args.date);
    if (rate === null) return null;

    await ctx.runMutation(internal.fxRates._put, {
      date: args.date,
      currency: c,
      rateToUsd: rate,
      source: "frankfurter",
    });
    return rate;
  },
});

// ── Public refresh — for the dashboard's "refresh today's rate" button ─

export const refreshTodayRate = action({
  args: { currency: v.string() },
  handler: async (ctx, args): Promise<{ ok: true; rate: number } | { ok: false }> => {
    const today = new Date().toISOString().slice(0, 10);
    const rate = await fetchRate(args.currency.toUpperCase(), today);
    if (rate === null) return { ok: false };
    await ctx.runMutation(internal.fxRates._put, {
      date: today,
      currency: args.currency.toUpperCase(),
      rateToUsd: rate,
      source: "frankfurter",
    });
    return { ok: true, rate };
  },
});
