// Convex-runtime helpers for the weekly-review Telegram dispatcher.
// Lives outside the Node action so we can use ctx.db without a runtime
// hop on every per-user lookup.

import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

interface UserContext {
  chatId: string | null;
  priorYearAndQuarter: string;
  priorPriorities: { p1?: string; p2?: string; p3?: string } | null;
  recentWinsCount: number;
  recentWinSamples: string[];
  activeQuarterGoalTitles: string[];
}

// ── List users eligible for a Sunday DM ────────────────
// Eligibility = has a Telegram chat ID (the bot token check happens at
// dispatch time via Secret Manager, since secret presence isn't in the
// row). Skips users who already got a prompt within the last 6 days
// (idempotency guard if the cron firing surface ever changes).
export const _listChatConnectedUserIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => Boolean(u.telegramChatId))
      .filter((u) => !u.weeklyReviewPromptedAt || u.weeklyReviewPromptedAt < sixDaysAgo)
      .map((u) => u._id);
  },
});

// ── Per-user prompt context ───────────────────────────
export const _getUserContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<UserContext> => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return {
        chatId: null,
        priorYearAndQuarter: yearAndQuarterLabel(),
        priorPriorities: null,
        recentWinsCount: 0,
        recentWinSamples: [],
        activeQuarterGoalTitles: [],
      };
    }

    // Latest weekly review (priorities the user committed to last week).
    // Index `by_userId` orders by creation desc when we use `.order("desc")`.
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50); // bounded — most users have <50 weeks of review history
    const lastWeekly = reviews.find((r) => r.reviewType === "weekly") ?? null;
    const lastContent = (lastWeekly?.content ?? null) as
      | { nextWeekPriorities?: { p1?: string; p2?: string; p3?: string } }
      | null;
    const priorPriorities = lastContent?.nextWeekPriorities ?? null;

    // This week's wins (count + first two for flavour text).
    const sevenDaysAgo = isoDateNDaysAgo(7);
    const winsThisWeek = await ctx.db
      .query("wins")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const recentWins = winsThisWeek.filter((w) => w.entryDate >= sevenDaysAgo);
    const recentWinSamples = recentWins
      .slice(0, 2)
      .map((w) => w.content)
      .filter((s): s is string => typeof s === "string" && s.length > 0);

    // Active goals tagged to the current quarter — used for "Q2 still open"
    // nudge in the prompt body.
    const yq = yearAndQuarterLabel();
    const allGoals = await ctx.db
      .query("goals")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active"),
      )
      .collect();
    const quarterKey = `${new Date().getFullYear()}-Q${currentQuarterIndex()}`;
    const activeQuarterGoalTitles = allGoals
      .filter((g) => g.quarter === quarterKey)
      .map((g) => g.title);

    return {
      chatId: user.telegramChatId ?? null,
      priorYearAndQuarter: yq,
      priorPriorities,
      recentWinsCount: recentWins.length,
      recentWinSamples,
      activeQuarterGoalTitles,
    };
  },
});

// ── Stamp the dispatch on the user row ────────────────
export const _stampPromptedAt = internalMutation({
  args: { userId: v.id("users"), ts: v.float64() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { weeklyReviewPromptedAt: args.ts });
  },
});

// ── Date helpers (local to this file) ─────────────────

function currentQuarterIndex(): 1 | 2 | 3 | 4 {
  return (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

function yearAndQuarterLabel(): string {
  return `${new Date().getFullYear()} Q${currentQuarterIndex()}`;
}

function isoDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
