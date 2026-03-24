/**
 * Temporary admin cleanup script. DELETE THIS FILE after use.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const listAllData = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const subs = await ctx.db.query("subscriptions").collect();
    const settings = await ctx.db.query("deploymentSettings").collect();
    const balances = await ctx.db.query("balances").collect();
    const deployments = await ctx.db.query("deployments").collect();

    return {
      users: users.map((u) => ({ _id: u._id, email: u.email, name: u.name })),
      subscriptions: subs,
      settings: settings.map((s) => ({ _id: s._id, userId: s.userId, apiKeySource: s.apiKeySource, selectedModel: s.selectedModel })),
      balances,
      deployments: deployments.map((d) => ({ _id: d._id, userId: d.userId, status: d.status, subdomain: d.subdomain })),
    };
  },
});

export const wipeUserSubscription = internalMutation({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, { userId }) => {
    const deleted: string[] = [];

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (sub) {
      await ctx.db.delete(sub._id);
      deleted.push(`subscription:${sub._id}`);
    }

    const settings = await ctx.db
      .query("deploymentSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (settings) {
      await ctx.db.delete(settings._id);
      deleted.push(`userSettings:${settings._id}`);
    }

    const balance = await ctx.db
      .query("balances")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (balance) {
      await ctx.db.delete(balance._id);
      deleted.push(`balance:${balance._id}`);
    }

    return { userId, deleted };
  },
});

export const wipeUserFully = internalMutation({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, { userId }) => {
    const deleted: string[] = [];

    // Delete deployments
    const deployments = await ctx.db
      .query("deployments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const d of deployments) {
      await ctx.db.delete(d._id);
      deleted.push(`deployment:${d._id}`);
    }

    // Delete subscription
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (sub) {
      await ctx.db.delete(sub._id);
      deleted.push(`subscription:${sub._id}`);
    }

    // Delete settings
    const settings = await ctx.db
      .query("deploymentSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (settings) {
      await ctx.db.delete(settings._id);
      deleted.push(`userSettings:${settings._id}`);
    }

    // Delete balance
    const balance = await ctx.db
      .query("balances")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (balance) {
      await ctx.db.delete(balance._id);
      deleted.push(`balance:${balance._id}`);
    }

    // Delete coupon redemptions
    const redemptions = await ctx.db
      .query("couponRedemptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const r of redemptions) {
      await ctx.db.delete(r._id);
      deleted.push(`couponRedemption:${r._id}`);
    }

    // Delete auth accounts + cascading auth records
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const acc of accounts) {
      // Delete verification codes for this account
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", acc._id))
        .collect();
      for (const code of codes) {
        await ctx.db.delete(code._id);
        deleted.push(`authVerificationCode:${code._id}`);
      }
      await ctx.db.delete(acc._id);
      deleted.push(`authAccount:${acc._id}`);
    }

    // Delete auth sessions + cascading refresh tokens & verifiers
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const sess of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", sess._id))
        .collect();
      for (const t of tokens) {
        await ctx.db.delete(t._id);
        deleted.push(`authRefreshToken:${t._id}`);
      }
      await ctx.db.delete(sess._id);
      deleted.push(`authSession:${sess._id}`);
    }

    // Delete the user record itself
    const user = await ctx.db.get(userId);
    if (user) {
      await ctx.db.delete(userId);
      deleted.push(`user:${userId}`);
    }

    return { userId, deleted };
  },
});

export const simulateSuspended = internalMutation({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    const id = await ctx.db.insert("deployments", {
      userId,
      subdomain: "c-suspended-test",
      gatewayToken: "claw_test_suspended",
      podSecret: "test_secret",
      callbackJwt: "test_jwt",
      status: "suspended",
      configHash: "test",
      targetImageTag: "latest",
      createdAt: now,
      lastUpdatedAt: now,
    });
    return { deploymentId: id };
  },
});
