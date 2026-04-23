// Internal helpers for the Granola sync action. Lives separately from
// `granolaSync.ts` because that file uses `"use node";` (needs `fetch` and
// the Secret Manager helper), and Node files can only contain actions —
// queries and mutations must stay in the default V8 runtime.

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// ── Per-user status read ─────────────────────────────
// Returns the timestamps the dashboard renders ("Connected · last synced 5m
// ago"). The actual API key never leaves Secret Manager; this query is the
// only thing the UI needs to know "are we wired up?".

export const _getGranolaStatus = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      connectedAt: user.granolaConnectedAt ?? null,
      syncedAt: user.granolaSyncedAt ?? null,
      lastError: user.granolaSyncError ?? null,
    };
  },
});

// ── Connection lifecycle ─────────────────────────────

export const _markConnected = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      granolaConnectedAt: Date.now(),
      granolaSyncError: undefined,
    });
  },
});

export const _markSyncResult = internalMutation({
  args: {
    userId: v.id("users"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      granolaSyncedAt: Date.now(),
      granolaSyncError: args.error,
    });
  },
});

export const _markDisconnected = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      granolaConnectedAt: undefined,
      granolaSyncedAt: undefined,
      granolaSyncError: undefined,
    });
  },
});

// ── User enumeration for the cron ────────────────────
// Returns one cursor-paginated page of connected users. The cron action
// loops over pages so every connected user gets a sync per tick — even
// when the user base grows past a single transaction's read budget.
// Granola's rate limit is 5 req/s sustained, so the action also paces
// itself between users (see `granolaSync.ts`). A dedicated index isn't
// needed yet at our scale; if the connected fraction drops we'd add an
// index on `granolaConnectedAt` and walk that instead.

export const _listConnectedUserIdsPage = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    pageSize: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const numItems = Math.min(Math.max(args.pageSize ?? 200, 1), 500);
    const result = await ctx.db.query("users").paginate({
      cursor: args.cursor,
      numItems,
    });
    return {
      userIds: result.page
        .filter((u) => u.granolaConnectedAt !== undefined)
        .map((u) => u._id),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});
