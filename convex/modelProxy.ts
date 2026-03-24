import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Billing is handled by the AI Gateway (token-based for platform keys, hosting-only for BYOC).
// These legacy constants are kept for the placeholder invokeModel action only.
const COST_PLACEHOLDER = 0;

export const invokeModel = action({
  args: {
    prompt: v.string(),
  },
  returns: v.object({
    response: v.string(),
    cost: v.number(),
  }),
  handler: async (ctx, { prompt }): Promise<{ response: string; cost: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const cost: number = COST_PLACEHOLDER;

    // Deduct before calling model
    const success: boolean = await ctx.runMutation(internal.stripe.deductBalance, {
      userId,
      amount: cost,
    });
    if (!success) throw new Error("Insufficient balance");

    // TODO: Call actual model API here
    // For now, return a placeholder response
    return {
      response: `[Placeholder] Model response to: "${prompt}"`,
      cost,
    };
  },
});
