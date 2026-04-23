// Internal helpers for the Telegram reminder dispatcher. Lives separately
// from `reminderDispatch.ts` because that file uses `"use node";` (needs
// fetch + env access for Telegram), and Node files can only contain
// actions — queries and mutations must stay in the default V8 runtime.

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const _findDue = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Scan via index: pending status, scheduledAt <= now. Bounded at 200
    // per tick — if more reminders pile up, the next tick a minute later
    // will pick them up. We never want a single tick to read unbounded.
    return await ctx.db
      .query("reminders")
      .withIndex("by_status_scheduledAt", (q) =>
        q.eq("status", "pending").lte("scheduledAt", now),
      )
      .take(200);
  },
});

// Atomic claim — flips pending → sending in a single transaction so two
// overlapping cron ticks can't both grab the same reminder. Returns only
// the reminders this caller successfully claimed. The dispatcher must
// transition `sending` → `delivered` (success) or `sending` → `pending`
// (recoverable failure) when it's done.
export const _claimDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pending = await ctx.db
      .query("reminders")
      .withIndex("by_status_scheduledAt", (q) =>
        q.eq("status", "pending").lte("scheduledAt", now),
      )
      .take(200);
    const claimed: typeof pending = [];
    for (const reminder of pending) {
      // Re-read inside the transaction — defensive against the rare case
      // where another mutation patched it between query and patch.
      const fresh = await ctx.db.get(reminder._id);
      if (!fresh || fresh.status !== "pending") continue;
      await ctx.db.patch(reminder._id, { status: "sending" });
      claimed.push({ ...fresh, status: "sending" });
    }
    return claimed;
  },
});

// Release a claimed reminder back to pending — used when a recoverable
// error means we want the next tick to retry.
export const _releaseClaim = internalMutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.status !== "sending") return;
    await ctx.db.patch(args.id, { status: "pending" });
  },
});

export const _getUserChatId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.telegramChatId ?? null;
  },
});

export const _markDelivered = internalMutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    // Accept either `pending` (legacy code path) or `sending` (claimed by
    // the new atomic-claim flow). Anything else means another tick already
    // moved this row — skip.
    if (!existing || (existing.status !== "pending" && existing.status !== "sending")) return;
    await ctx.db.patch(args.id, { status: "delivered" });
    await ctx.db.insert("mutationLog", {
      userId: existing.userId,
      action: "deliver",
      tableName: "reminders",
      recordId: args.id,
      beforeData: existing,
      afterData: await ctx.db.get(args.id),
    });
  },
});

export const _setReminderStatus = internalMutation({
  args: { id: v.id("reminders"), status: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    await ctx.db.patch(args.id, { status: args.status });
    await ctx.db.insert("mutationLog", {
      userId: existing.userId,
      action: "update",
      tableName: "reminders",
      recordId: args.id,
      beforeData: existing,
      afterData: await ctx.db.get(args.id),
    });
  },
});

export const _snoozeReminder = internalMutation({
  args: { id: v.id("reminders"), minutes: v.float64() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    await ctx.db.patch(args.id, {
      scheduledAt: Date.now() + args.minutes * 60_000,
      status: "pending",
      snoozeCount: existing.snoozeCount + 1,
    });
    await ctx.db.insert("mutationLog", {
      userId: existing.userId,
      action: "snooze",
      tableName: "reminders",
      recordId: args.id,
      beforeData: existing,
      afterData: await ctx.db.get(args.id),
    });
  },
});

// (`_claimLinkCode` removed: the user's bot's webhook is owned by
// OpenClaw, so any /start to that bot lands in the pod, not Convex.
// We can't auto-link via Telegram. Users paste their chat ID directly
// in the Telegram setup card.)
