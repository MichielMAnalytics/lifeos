// CSV upload pipeline. Public `importCsv` action:
//   1. Parse the CSV text via the source-specific parser.
//   2. For each non-USD currency in the batch, fan out to `_ensureRate`
//      to fill the `fxRates` cache (one fetch per (currency, date) pair).
//   3. Compute `amountUsd` for each transaction in-memory.
//   4. Create the statement row + bulk-upsert all transactions in a single
//      mutation (idempotent against re-uploads via `externalId`).
//   5. Kick off the AI categorisation suggestion pass for newly-inserted
//      uncategorised rows so the user lands on the inbox with chips
//      already filled in.

import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import {
  parseRevolutCsv,
  parseWioCsv,
  parseGenericCsv,
  detectSource,
  type NormalizedTxn,
  type ParseResult,
} from "./financeParsers";

type ImportResult =
  | {
      ok: true;
      source: string;
      inserted: number;
      skipped: number;
      parseSkipped: number;
      statementId: string;
    }
  | { ok: false; reason: string };

export const importCsv = action({
  args: {
    csvText: v.string(),
    filename: v.string(),
    source: v.optional(v.string()), // "revolut" | "wio" | "generic" | "auto"
    accountLabel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ImportResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await runImport(ctx, userId, args);
  },
});

// CLI / HTTP-route entry point. Same behaviour as the public action but
// takes `userId` as an arg because the HTTP layer authenticates via
// `Bearer lifeos_sk_...` rather than Convex Auth.
export const _importCsvForUser = internalAction({
  args: {
    userId: v.id("users"),
    csvText: v.string(),
    filename: v.string(),
    source: v.optional(v.string()),
    accountLabel: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ImportResult> => {
    const { userId, ...rest } = args;
    return await runImport(ctx, userId, rest);
  },
});

async function runImport(
  ctx: ActionCtx,
  userId: Id<"users">,
  args: { csvText: string; filename: string; source?: string; accountLabel?: string },
): Promise<ImportResult> {
    if (!args.csvText.trim()) return { ok: false, reason: "empty-csv" };

    // Detect source if "auto" or unspecified.
    let source: "revolut" | "wio" | "generic";
    if (args.source && args.source !== "auto") {
      if (args.source !== "revolut" && args.source !== "wio" && args.source !== "generic") {
        return { ok: false, reason: "unknown-source" };
      }
      source = args.source;
    } else {
      const headerLine = args.csvText.split(/\r?\n/, 1)[0] ?? "";
      source = detectSource(args.filename, headerLine);
    }

    let parsed: ParseResult;
    try {
      if (source === "revolut") {
        parsed = await parseRevolutCsv(args.csvText, args.filename);
      } else if (source === "wio") {
        parsed = await parseWioCsv(args.csvText, args.filename);
      } else {
        parsed = await parseGenericCsv(args.csvText, args.filename);
      }
    } catch (err) {
      console.error("[financeImport] parse failed", err);
      return { ok: false, reason: "parse-failed" };
    }

    if (parsed.txns.length === 0 && parsed.skipped === 0) {
      return { ok: false, reason: "no-rows" };
    }

    // FX-convert: build a deduped set of (currency, date) pairs we need
    // rates for, fetch them all, then enrich each transaction with
    // amountUsd before upserting. Sequential rather than parallel because
    // Frankfurter is fast and we don't want to hit them in bursts that
    // get rate-limited.
    const fxPairs = new Set<string>();
    for (const t of parsed.txns) {
      if (t.currency.toUpperCase() === "USD") continue;
      fxPairs.add(`${t.date}|${t.currency.toUpperCase()}`);
    }
    const rateMap = new Map<string, number | null>();
    for (const pair of fxPairs) {
      const [date, currency] = pair.split("|");
      const rate: number | null = await ctx.runAction(internal.financeFx._ensureRate, {
        date,
        currency,
      });
      rateMap.set(pair, rate);
    }

    const enriched: NormalizedTxn[] = parsed.txns.map((t) => {
      const cur = t.currency.toUpperCase();
      let amountUsd: number | undefined;
      if (cur === "USD") amountUsd = t.amount;
      else {
        const rate = rateMap.get(`${t.date}|${cur}`);
        if (rate) amountUsd = t.amount * rate;
      }
      return { ...t, currency: cur, amountUsd };
    });

    // Make sure default categories exist before we run AI suggestions —
    // otherwise the LLM has nothing to map to.
    await ctx.runMutation(internal.financeCategories._seedDefaults, { userId });

    // Create statement + bulk insert. Counts are provisional here because
    // dedup against earlier uploads happens inside `_bulkUpsert`; we patch
    // them after with the real (post-dedup) totals so the schema's
    // post-dedup promise actually holds.
    const statementId = await ctx.runMutation(internal.financeStatements._create, {
      userId,
      source,
      filename: args.filename,
      accountLabel: args.accountLabel,
      parsedCount: enriched.length,
      skippedCount: parsed.skipped,
    });

    const upsertResult: { inserted: number; skipped: number } = await ctx.runMutation(
      internal.financeTransactions._bulkUpsert,
      { userId, statementId, txns: enriched },
    );

    // Patch the statement with real numbers so the uploads list shows
    // "imported 12 / skipped 8" instead of "imported 20 / skipped 0".
    await ctx.runMutation(internal.financeStatements._updateCounts, {
      id: statementId,
      parsedCount: upsertResult.inserted,
      skippedCount: parsed.skipped + upsertResult.skipped,
    });

    // Run AI suggestions inline so the user lands on the inbox with chips
    // ready. We awaited a Convex action here rather than scheduling a
    // background runAfter — failure logs and continues, doesn't block the
    // import success response.
    if (upsertResult.inserted > 0) {
      try {
        await ctx.runAction(internal.financeAi._suggestForUser, { userId });
      } catch (err) {
        console.warn("[financeImport] suggestion pass failed", err);
      }
    }

  return {
    ok: true,
    source,
    inserted: upsertResult.inserted,
    skipped: upsertResult.skipped,
    parseSkipped: parsed.skipped,
    statementId: String(statementId),
  };
}
