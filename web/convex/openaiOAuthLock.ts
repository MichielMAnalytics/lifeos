import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Atomic lock acquisition for OpenAI OAuth token refresh. Ensures that only
// one ai-gateway replica refreshes a given user's token at a time, preventing
// refresh-token rotation races where OpenAI invalidates the whole chain when
// the already-used refresh_token is replayed.
export const _tryAcquireLock = internalMutation({
  args: {
    userId: v.id("users"),
    ttlMs: v.number(),
  },
  handler: async (ctx, { userId, ttlMs }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { acquired: false, reason: "no_user" as const };

    const now = Date.now();
    const heldUntil = user.openaiRefreshLockedUntil ?? 0;
    if (now < heldUntil) {
      return { acquired: false, reason: "held" as const, heldUntil };
    }

    const newHeldUntil = now + ttlMs;
    await ctx.db.patch(userId, { openaiRefreshLockedUntil: newHeldUntil });
    return { acquired: true, heldUntil: newHeldUntil };
  },
});

export const _releaseLock = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { ok: false };
    await ctx.db.patch(userId, { openaiRefreshLockedUntil: undefined });
    return { ok: true };
  },
});
