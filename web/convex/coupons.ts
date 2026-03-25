import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createCoupon = internalMutation({
  args: {
    code: v.string(),
    creditAmountCents: v.number(),
    maxUses: v.number(),
    expiresInDays: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  returns: v.id("coupons"),
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();

    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (existing) {
      throw new Error(`Coupon with code "${code}" already exists`);
    }

    const days = args.expiresInDays ?? 30;
    const expiresAt = Date.now() + days * 86400000;

    return await ctx.db.insert("coupons", {
      code,
      creditAmountCents: args.creditAmountCents,
      maxUses: args.maxUses,
      currentUses: 0,
      expiresAt,
      description: args.description,
      createdAt: Date.now(),
    });
  },
});

export const redeemCoupon = mutation({
  args: { code: v.string() },
  returns: v.object({
    success: v.boolean(),
    creditedCents: v.optional(v.number()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      return { success: false, error: "Please enter a coupon code" };
    }

    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .unique();

    if (!coupon) {
      return { success: false, error: "Invalid coupon code" };
    }

    if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
      return { success: false, error: "This coupon has expired" };
    }

    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
      return { success: false, error: "This coupon has reached its maximum uses" };
    }

    const existingRedemption = await ctx.db
      .query("couponRedemptions")
      .withIndex("by_couponId_userId", (q) =>
        q.eq("couponId", coupon._id).eq("userId", userId),
      )
      .unique();

    if (existingRedemption) {
      return { success: false, error: "You have already redeemed this coupon" };
    }

    await ctx.db.patch(coupon._id, {
      currentUses: coupon.currentUses + 1,
    });

    await ctx.db.insert("couponRedemptions", {
      couponId: coupon._id,
      userId,
      creditAmountCents: coupon.creditAmountCents,
      redeemedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.stripe.creditBalance, {
      userId,
      amount: coupon.creditAmountCents,
    });

    return { success: true, creditedCents: coupon.creditAmountCents };
  },
});
