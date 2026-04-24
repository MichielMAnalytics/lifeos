// Convex-runtime helpers for the Google OAuth flow. Lives in the
// default runtime so actions (which live in node) can call via
// ctx.runMutation/ctx.runQuery without crossing a runtime boundary
// unnecessarily. Contains the OAuth-state CRUD + the per-user metadata
// stamps on the `users` row.

import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isAdminEmail } from "./roles";

// ── OAuth state (CSRF) ───────────────────────────────

export const _saveOAuthState = internalMutation({
  args: { userId: v.id("users"), state: v.string(), expiresAt: v.float64() },
  handler: async (ctx, args) => {
    await ctx.db.insert("googleOAuthStates", {
      userId: args.userId,
      state: args.state,
      expiresAt: args.expiresAt,
    });
  },
});

export const _consumeOAuthState = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("googleOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();
    if (!row) return null;
    // Single-use — delete on consume so a replayed callback fails.
    await ctx.db.delete(row._id);
    if (row.expiresAt < Date.now()) return null;
    return { userId: row.userId };
  },
});

// Daily cleanup of expired / leaked states. Called from the existing
// cron runner.
export const _purgeExpiredOAuthStates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("googleOAuthStates")
      .take(500);
    const now = Date.now();
    let removed = 0;
    for (const row of expired) {
      if (row.expiresAt < now) {
        await ctx.db.delete(row._id);
        removed++;
      }
    }
    return { removed };
  },
});

// ── Admin gate (used by the OAuth initiate action) ──

export const _isAdmin = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await ctx.db.get(args.userId);
    return isAdminEmail(user?.email);
  },
});

// ── Users row: connection metadata ────────────────────

export const _markConnected = internalMutation({
  args: { userId: v.id("users"), email: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      googleCalendarConnectedAt: Date.now(),
      googleCalendarEmail: args.email ?? undefined,
      googleCalendarSyncError: undefined,
    });
  },
});

export const _markDisconnected = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      googleCalendarConnectedAt: undefined,
      googleCalendarEmail: undefined,
      googleCalendarSyncedAt: undefined,
      googleCalendarSyncError: undefined,
    });
    // Also drop the sync cursor so a future reconnect starts fresh.
    const cursor = await ctx.db
      .query("googleCalendarSyncState")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (cursor) await ctx.db.delete(cursor._id);
  },
});

export const _markSynced = internalMutation({
  args: {
    userId: v.id("users"),
    syncedAt: v.float64(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      googleCalendarSyncedAt: args.syncedAt,
      googleCalendarSyncError: args.error,
    });
  },
});

// ── Sync cursor ───────────────────────────────────────

export const _getSyncState = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("googleCalendarSyncState")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const _upsertSyncState = internalMutation({
  args: {
    userId: v.id("users"),
    calendarId: v.string(),
    syncToken: v.optional(v.string()),
    lastFullSyncAt: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("googleCalendarSyncState")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        calendarId: args.calendarId,
        syncToken: args.syncToken,
        lastFullSyncAt: args.lastFullSyncAt ?? existing.lastFullSyncAt,
      });
    } else {
      await ctx.db.insert("googleCalendarSyncState", {
        userId: args.userId,
        calendarId: args.calendarId,
        syncToken: args.syncToken,
        lastFullSyncAt: args.lastFullSyncAt,
      });
    }
  },
});

// ── Public status query (for the Settings panel) ────

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      connected: !!user.googleCalendarConnectedAt,
      email: user.googleCalendarEmail ?? null,
      connectedAt: user.googleCalendarConnectedAt ?? null,
      syncedAt: user.googleCalendarSyncedAt ?? null,
      syncError: user.googleCalendarSyncError ?? null,
    };
  },
});

// ── Iterate connected users (cron) ──────────────────

export const _listConnectedUserIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(1000);
    return users
      .filter((u) => !!u.googleCalendarConnectedAt)
      .map((u) => u._id);
  },
});
