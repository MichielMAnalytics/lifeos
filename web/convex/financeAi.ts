// AI-assisted categorisation for uncategorised transactions.
//
// Two-tier strategy, cheapest tier first:
//   1. Merchant memory — if the user has previously categorised any
//      transaction with the same `merchantKey`, instant suggestion at
//      confidence 1.0. No LLM call.
//   2. LLM fallback — for the remainder, batch up to 30 transactions and
//      ask OpenAI (via the user's BYOK key in GCP Secret Manager) to map
//      each to the best matching category from the user's taxonomy.
//
// We never auto-apply suggestions — the user confirms in the inbox. That
// keeps the categorisation step a feature ("AI proposes, you confirm")
// rather than a quiet correctness risk.
//
// Lives in Node runtime because `readByokSecret` requires the GCP Secret
// Manager helper.

"use node";

import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readByokSecret } from "./k8s";
import type { Doc, Id } from "./_generated/dataModel";
import { merchantKeyFor } from "./merchantMemory";

const OPENAI_MODEL = "gpt-4o-mini";

// ── Public — manual "Suggest categories now" trigger ─

type SuggestResult =
  | {
      ok: true;
      memoryHits: number;
      llmSuggested: number;
      remaining: number;
      missingApiKey?: boolean; // true when LLM tier was skipped because no `byok-{userId}-openai`
    }
  | { ok: false; reason: string };

export const suggestNow = action({
  args: {},
  handler: async (ctx): Promise<SuggestResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await suggestForUser(ctx, userId);
  },
});

// ── Internal — called from the import action after upsert ──

export const _suggestForUser = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<SuggestResult> => {
    return await suggestForUser(ctx, args.userId);
  },
});

// ── Shared per-user routine ──────────────────────────

async function suggestForUser(
  ctx: ActionCtx,
  userId: Id<"users">,
): Promise<SuggestResult> {
  const uncategorized = (await ctx.runQuery(internal.financeTransactions._listUncategorized, {
    userId,
    limit: 200,
  })) as Doc<"financeTransactions">[];
  if (uncategorized.length === 0) {
    return { ok: true, memoryHits: 0, llmSuggested: 0, remaining: 0 };
  }

  const categories = (await ctx.runQuery(
    internal.financeTransactions._categoriesForLlm,
    { userId },
  )) as Array<{ id: Id<"financeCategories">; name: string; isIncome: boolean }>;
  if (categories.length === 0) {
    return { ok: false, reason: "no-categories" };
  }

  // ── tier 1: merchant memory ──
  let memoryHits = 0;
  const llmCandidates: Doc<"financeTransactions">[] = [];
  for (const t of uncategorized) {
    const key = merchantKeyFor(t.merchantRaw ?? t.description);
    if (!key) {
      llmCandidates.push(t);
      continue;
    }
    const mem = await ctx.runQuery(internal.merchantMemory._lookup, {
      userId,
      merchantKey: key,
    });
    if (mem && (mem as Doc<"merchantCategoryMemory">).categoryId) {
      await ctx.runMutation(internal.financeTransactions._setSuggestion, {
        userId,
        id: t._id,
        suggestedCategoryId: (mem as Doc<"merchantCategoryMemory">).categoryId,
        suggestionConfidence: 1.0,
        suggestionSource: "memory",
      });
      memoryHits++;
    } else {
      llmCandidates.push(t);
    }
  }

  // ── tier 2: LLM ──
  if (llmCandidates.length === 0) {
    return { ok: true, memoryHits, llmSuggested: 0, remaining: 0 };
  }

  const apiKey = await readByokSecret(userId, "openai");
  if (!apiKey) {
    // No OpenAI key configured — surface that explicitly so the inbox
    // can show "Connect OpenAI to enable AI suggestions" rather than
    // silently leaving rows uncategorised.
    return {
      ok: true,
      memoryHits,
      llmSuggested: 0,
      remaining: llmCandidates.length,
      missingApiKey: true,
    };
  }

  let llmSuggested = 0;
  // Batch by 30 — keeps the prompt and JSON response well under context
  // limits and lets a partial network failure only kill one batch.
  const BATCH_SIZE = 30;
  for (let i = 0; i < llmCandidates.length; i += BATCH_SIZE) {
    const batch = llmCandidates.slice(i, i + BATCH_SIZE);
    const suggestions = await callOpenAi(apiKey, categories, batch);
    if (!suggestions) continue;

    for (const s of suggestions) {
      const cat = categories.find((c) => c.id === s.categoryId);
      if (!cat) continue;
      await ctx.runMutation(internal.financeTransactions._setSuggestion, {
        userId,
        id: s.transactionId,
        suggestedCategoryId: cat.id,
        suggestionConfidence: Math.min(Math.max(s.confidence, 0), 1),
        suggestionSource: "llm",
      });
      llmSuggested++;
    }
  }

  return {
    ok: true,
    memoryHits,
    llmSuggested,
    remaining: llmCandidates.length - llmSuggested,
  };
}

// ── OpenAI call ───────────────────────────────────────
// Single chat-completions call per batch. We ask the model to return
// strict JSON ({"results":[{transactionId, categoryId, confidence}]}) so
// parsing is straightforward. Anything malformed is dropped silently —
// the user can categorise those manually.

interface LlmSuggestion {
  transactionId: Id<"financeTransactions">;
  categoryId: Id<"financeCategories">;
  confidence: number;
}

async function callOpenAi(
  apiKey: string,
  categories: Array<{ id: Id<"financeCategories">; name: string; isIncome: boolean }>,
  transactions: Doc<"financeTransactions">[],
): Promise<LlmSuggestion[] | null> {
  const categoryList = categories
    .map((c) => `- ${c.id}: ${c.name}${c.isIncome ? " (income)" : ""}`)
    .join("\n");

  const txnList = transactions
    .map((t) =>
      JSON.stringify({
        id: t._id,
        date: t.date,
        description: t.description,
        merchant: t.merchantRaw,
        amount: t.amountUsd ?? t.amount,
        currency: t.currency,
      }),
    )
    .join("\n");

  const system =
    "You categorise personal-finance transactions into the user's existing category taxonomy. " +
    "Return strict JSON with shape {\"results\":[{\"transactionId\":string,\"categoryId\":string,\"confidence\":number}]}. " +
    "Only use category IDs from the supplied list. Confidence is 0-1; pick the best match even if uncertain. " +
    "If a transaction looks like income (positive amount, salary/freelance/refund pattern), prefer an income category.";

  const user = `Categories:\n${categoryList}\n\nTransactions (one JSON per line):\n${txnList}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    console.warn("[financeAi] OpenAI fetch failed", err);
    return null;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn("[financeAi] OpenAI returned", res.status, body.slice(0, 500));
    return null;
  }

  let payload: { choices?: Array<{ message?: { content?: string } }> };
  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    return null;
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  let parsed: { results?: Array<{ transactionId?: string; categoryId?: string; confidence?: number }> };
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  if (!parsed.results || !Array.isArray(parsed.results)) return null;
  const valid: LlmSuggestion[] = [];
  for (const r of parsed.results) {
    if (typeof r.transactionId !== "string" || typeof r.categoryId !== "string") continue;
    if (typeof r.confidence !== "number") continue;
    valid.push({
      transactionId: r.transactionId as Id<"financeTransactions">,
      categoryId: r.categoryId as Id<"financeCategories">,
      confidence: r.confidence,
    });
  }
  return valid;
}
