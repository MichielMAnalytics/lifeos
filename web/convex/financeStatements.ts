// Finance statements — one row per CSV upload. Used by the dashboard's
// "Uploads" view to show import history (filename, source, what was parsed
// vs skipped). The actual import logic lives in `financeImport.ts`
// because it has to run in a Node action (CSV parsing + FX fetch).

import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const rows = await ctx.db
      .query("financeStatements")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
    return rows;
  },
});

// ── remove ────────────────────────────────────────────
// Deletes the statement row only — does NOT delete its transactions.
// Removing a statement is "I don't want to see this in my upload list any
// more"; the transactions remain because they may have been categorised.

export const remove = mutation({
  args: { id: v.id("financeStatements") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Statement not found");
    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "delete", tableName: "financeStatements",
      recordId: args.id, beforeData: existing, afterData: null,
    });
    return { id: args.id };
  },
});

// ══════════════════════════════════════════════════════
// Internal — called from the import action
// ══════════════════════════════════════════════════════

export const _list = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("financeStatements")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);
    return { data: rows, count: rows.length };
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    source: v.string(),
    filename: v.string(),
    accountLabel: v.optional(v.string()),
    parsedCount: v.float64(),
    skippedCount: v.float64(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("financeStatements", {
      userId: args.userId,
      source: args.source,
      filename: args.filename,
      accountLabel: args.accountLabel,
      uploadedAt: Date.now(),
      parsedCount: args.parsedCount,
      skippedCount: args.skippedCount,
    });
  },
});

// Patch counts after the bulk-upsert finishes. We initially store the
// pre-dedup numbers because the upsert needs the statement ID to exist
// before it runs — this brings the row in line with the schema's
// "post-dedup" promise.
export const _updateCounts = internalMutation({
  args: {
    id: v.id("financeStatements"),
    parsedCount: v.float64(),
    skippedCount: v.float64(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    await ctx.db.patch(args.id, {
      parsedCount: args.parsedCount,
      skippedCount: args.skippedCount,
    });
  },
});
