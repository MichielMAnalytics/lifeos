// V8 helpers for googleAuth.ts (which is "use node;" and can only contain
// actions). Convex separates runtimes so queries + mutations live here.

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const _getStatus = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      connectedAt: user.googleConnectedAt,
      scopes: user.googleScopes,
      googleEmail: user.googleEmail,
      accessExpiresAt: user.googleAccessExpiresAt,
    };
  },
});

export const _markConnected = internalMutation({
  args: {
    userId: v.id("users"),
    scopes: v.array(v.string()),
    expiresAtMs: v.float64(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      googleConnectedAt: Date.now(),
      googleScopes: args.scopes,
      googleAccessExpiresAt: args.expiresAtMs,
      googleEmail: args.email,
    });
  },
});

export const _markDisconnected = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      googleConnectedAt: undefined,
      googleScopes: undefined,
      googleAccessExpiresAt: undefined,
      googleEmail: undefined,
    });
  },
});

export const _stampExpiry = internalMutation({
  args: { userId: v.id("users"), accessExpiresAt: v.float64() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { googleAccessExpiresAt: args.accessExpiresAt });
  },
});
