"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { StripeSubscriptions } from "@convex-dev/stripe";
import Stripe from "stripe";
import { serverEnv, getPlanByPriceId } from "./deploymentEnv";

const stripeClient = new StripeSubscriptions(components.stripe);

function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(apiKey);
}

export const createSubscriptionCheckout = action({
  args: { priceId: v.string() },
  returns: v.object({
    sessionId: v.string(),
    url: v.union(v.string(), v.null()),
  }),
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

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: customer.customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${serverEnv.SITE_URL}/life-coach?subscription=success`,
      cancel_url: `${serverEnv.SITE_URL}/life-coach?subscription=cancelled`,
      subscription_data: {
        metadata: {
          userId,
          planType: plan.planType,
        },
        trial_period_days: 7,
      },
      allow_promotion_codes: true,
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  },
});
