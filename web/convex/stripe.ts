import { v } from "convex/values";
import { query, action, internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { StripeSubscriptions } from "@convex-dev/stripe";
import {
  serverEnv,
  getCreditTiers,
  getCreditTiersList as getCreditTiersListHelper,
  getPlanByPriceId,
  getSubscriptionPlansList as getSubscriptionPlansListHelper,
} from "./deploymentEnv";

export const stripeClient = new StripeSubscriptions(components.stripe);

export const getCreditTiersList = query({
  args: {},
  handler: async () => {
    return getCreditTiersListHelper();
  },
});

export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const balance = await ctx.db
      .query("balances")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return balance?.amount ?? 0;
  },
});

export const getPaymentHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.runQuery(
      components.stripe.public.listPaymentsByUserId,
      { userId },
    );
  },
});

export const createCreditCheckout = action({
  args: { priceId: v.string() },
  handler: async (ctx, { priceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const tiers = getCreditTiers();
    if (!tiers[priceId]) {
      throw new Error("Invalid price tier");
    }

    const email = await ctx.runQuery(internal.deploymentQueries.getUserEmail, { userId });

    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId,
      email: email ?? undefined,
    });

    return await stripeClient.createCheckoutSession(ctx, {
      priceId,
      customerId: customer.customerId,
      mode: "payment",
      successUrl: `${serverEnv.SITE_URL}?payment=success`,
      cancelUrl: `${serverEnv.SITE_URL}?payment=cancelled`,
      paymentIntentMetadata: {
        userId,
        priceId,
      },
    });
  },
});

export const creditBalance = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, amount }) => {
    console.log("[creditBalance] userId:", userId, "amount:", amount);
    const existing = await ctx.db
      .query("balances")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    console.log("[creditBalance] existing balance:", existing?.amount ?? "none (new user)");
    if (existing) {
      const newAmount = existing.amount + amount;
      console.log("[creditBalance] Updating balance:", existing.amount, "->", newAmount);
      await ctx.db.patch(existing._id, { amount: newAmount });
    } else {
      console.log("[creditBalance] Creating new balance record with amount:", amount);
      await ctx.db.insert("balances", { userId, amount });
    }

    // Push credits to AI Gateway if user has an active deployment
    console.log("[creditBalance] Scheduling pushCreditsToGateway for userId:", userId, "amount:", amount);
    await ctx.scheduler.runAfter(
      0,
      internal.deploymentActions.pushCreditsToGateway,
      { userId, amount },
    );
    return null;
  },
});

export const deductBalance = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, { userId, amount }) => {
    const existing = await ctx.db
      .query("balances")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!existing || existing.amount < amount) return false;
    await ctx.db.patch(existing._id, { amount: existing.amount - amount });
    return true;
  },
});

export const setBalance = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, amount }) => {
    const existing = await ctx.db
      .query("balances")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    console.log("[setBalance] userId:", userId, "newAmount:", amount, "previousAmount:", existing?.amount ?? "none");
    if (existing) {
      await ctx.db.patch(existing._id, { amount });
    } else {
      await ctx.db.insert("balances", { userId, amount });
    }
    return null;
  },
});

export const getBalanceInternal = internalQuery({
  args: { userId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, { userId }) => {
    const balance = await ctx.db
      .query("balances")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return balance?.amount ?? 0;
  },
});

// ── Subscription Functions ──────────────────────────────────────────

const planTypeValidator = v.union(
  v.literal("dashboard"),
  v.literal("byok"),
  v.literal("basic"),
  v.literal("standard"),
  v.literal("premium"),
);

const subscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("unpaid"),
);

export const getSubscriptionPlansList = query({
  args: {},
  handler: async () => {
    return getSubscriptionPlansListHelper();
  },
});

export const createSubscriptionCheckout = action({
  args: { priceId: v.string() },
  handler: async (ctx, { priceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = getPlanByPriceId(priceId);
    if (!plan) throw new Error("Invalid subscription plan");

    const email = await ctx.runQuery(internal.deploymentQueries.getUserEmail, { userId });

    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId,
      email: email ?? undefined,
    });

    return await stripeClient.createCheckoutSession(ctx, {
      priceId,
      customerId: customer.customerId,
      mode: "subscription",
      successUrl: `${serverEnv.SITE_URL}?subscription=success`,
      cancelUrl: `${serverEnv.SITE_URL}?subscription=cancelled`,
      subscriptionMetadata: {
        userId,
        planType: plan.planType,
      },
    });
  },
});

export const getMySubscription = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("subscriptions"),
      planType: planTypeValidator,
      status: subscriptionStatusValidator,
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      includedCreditsCents: v.number(),
      priceEuroCents: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc").first();
    if (!sub) return null;

    // Read currentPeriodEnd from the @convex-dev/stripe component
    // (always has the correct value from Stripe's webhook processing)
    const componentSub = await ctx.runQuery(
      components.stripe.public.getSubscription,
      { stripeSubscriptionId: sub.stripeSubscriptionId },
    );
    // Component stores seconds (Stripe format); convert to milliseconds for JS Date
    const currentPeriodEnd = componentSub?.currentPeriodEnd
      ? componentSub.currentPeriodEnd * 1000
      : sub.currentPeriodEnd;
    // Read cancelAtPeriodEnd from the component too — it gets updated by Stripe
    // webhooks (e.g. when user cancels via billing portal) while our local table may lag.
    const cancelAtPeriodEnd = componentSub?.cancelAtPeriodEnd ?? sub.cancelAtPeriodEnd;

    const planDef = getPlanByPriceId(sub.stripePriceId);

    return {
      _id: sub._id,
      planType: sub.planType,
      status: sub.status,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      includedCreditsCents: sub.includedCreditsCents,
      priceEuroCents: planDef?.priceEuroCents ?? 0,
    };
  },
});

export const getSubscriptionInternal = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("subscriptions"),
      planType: planTypeValidator,
      status: subscriptionStatusValidator,
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      includedCreditsCents: v.number(),
      stripeSubscriptionId: v.string(),
    }),
  ),
  handler: async (ctx, { userId }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc").first();
    if (!sub) return null;
    return {
      _id: sub._id,
      planType: sub.planType,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      includedCreditsCents: sub.includedCreditsCents,
      stripeSubscriptionId: sub.stripeSubscriptionId,
    };
  },
});

export const getSubscriptionByStripeId = internalQuery({
  args: { stripeSubscriptionId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      stripePriceId: v.string(),
      planType: planTypeValidator,
      includedCreditsCents: v.number(),
    }),
  ),
  handler: async (ctx, { stripeSubscriptionId }) => {
    console.log("[getSubscriptionByStripeId] looking up:", stripeSubscriptionId);
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId),
      )
      .unique();
    console.log("[getSubscriptionByStripeId] result:", sub ? JSON.stringify({ userId: sub.userId, planType: sub.planType, includedCreditsCents: sub.includedCreditsCents }) : "null");
    if (!sub) return null;
    return {
      userId: sub.userId,
      stripePriceId: sub.stripePriceId,
      planType: sub.planType,
      includedCreditsCents: sub.includedCreditsCents,
    };
  },
});

export const upsertSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    planType: planTypeValidator,
    status: subscriptionStatusValidator,
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    includedCreditsCents: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("[upsertSubscription] args:", JSON.stringify(args));
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      console.log("[upsertSubscription] Updating existing subscription:", existing._id);
      await ctx.db.patch(existing._id, { ...args, lastUpdatedAt: now });
    } else {
      console.log("[upsertSubscription] Inserting new subscription for user:", args.userId);
      await ctx.db.insert("subscriptions", {
        ...args,
        createdAt: now,
        lastUpdatedAt: now,
      });
    }
    return null;
  },
});

export const handleSubscriptionDeleted = internalMutation({
  args: { stripeSubscriptionId: v.string() },
  returns: v.null(),
  handler: async (ctx, { stripeSubscriptionId }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId),
      )
      .unique();
    if (!sub) return null;
    await ctx.db.patch(sub._id, {
      status: "canceled",
      lastUpdatedAt: Date.now(),
    });
    // Schedule deployment suspension
    const dep = await ctx.db
      .query("deployments")
      .withIndex("by_userId", (q) => q.eq("userId", sub.userId))
      .first();
    if (
      dep &&
      !["deactivated", "deactivating", "suspended"].includes(dep.status)
    ) {
      await ctx.scheduler.runAfter(
        0,
        internal.deploymentActions.suspendForExpiredSubscription,
        { deploymentId: dep._id },
      );
    }
    return null;
  },
});

export const cancelMySubscription = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const sub = await ctx.runQuery(internal.stripe.getSubscriptionInternal, { userId });
    if (!sub) throw new Error("No active subscription");
    await stripeClient.cancelSubscription(ctx, {
      stripeSubscriptionId: sub.stripeSubscriptionId,
      cancelAtPeriodEnd: true,
    });
    return null;
  },
});

export const reactivateMySubscription = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const sub = await ctx.runQuery(internal.stripe.getSubscriptionInternal, { userId });
    if (!sub) throw new Error("No active subscription");
    await stripeClient.reactivateSubscription(ctx, {
      stripeSubscriptionId: sub.stripeSubscriptionId,
    });
    return null;
  },
});

export const grantFreeBasicMonth = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    // Check for existing active subscription
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc").first();
    if (existing && existing.status === "active") {
      throw new Error("User already has an active subscription");
    }

    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    // If there's an old non-active subscription, remove it first
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("subscriptions", {
      userId,
      stripeSubscriptionId: `free_grant_${now}`,
      stripePriceId: "free_grant",
      planType: "basic",
      status: "active",
      currentPeriodEnd: now + thirtyDays,
      cancelAtPeriodEnd: true,
      includedCreditsCents: 1000,
      createdAt: now,
      lastUpdatedAt: now,
    });

    // Credit €10 (1000 cents) to the user's balance
    await ctx.scheduler.runAfter(0, internal.stripe.creditBalance, {
      userId,
      amount: 1000,
    });

    return null;
  },
});

export const createBillingPortalSession = action({
  args: {},
  returns: v.object({ url: v.string() }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const email = await ctx.runQuery(internal.deploymentQueries.getUserEmail, { userId });
    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId,
      email: email ?? undefined,
    });
    const session = await stripeClient.createCustomerPortalSession(ctx, {
      customerId: customer.customerId,
      returnUrl: serverEnv.SITE_URL,
    });
    return { url: session.url };
  },
});
