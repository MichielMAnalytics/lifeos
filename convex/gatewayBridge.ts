"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { serverEnv } from "./deploymentEnv";

/**
 * Send a message to a user's OpenClaw gateway pod via HTTP.
 * Used by triggers to forward data (morning briefing, daily review, etc.) to the AI agent.
 */
export const sendToGateway = internalAction({
  args: {
    userId: v.id("users"),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, { userId, message, metadata }) => {
    // Find the user's active deployment
    const deployment = await ctx.runQuery(
      internal.deploymentQueries.getActiveDeploymentDetailsForUser,
      { userId },
    );
    if (!deployment || deployment.status !== "running") {
      console.log("[gatewayBridge] No running deployment for user", userId);
      return { sent: false, reason: "no_deployment" };
    }

    const domain = serverEnv.LIFEOS_DOMAIN;
    const url = `https://${deployment.subdomain}.${domain}/api/v1/chat`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${deployment.gatewayToken}`,
        },
        body: JSON.stringify({ message, metadata }),
      });

      if (!response.ok) {
        console.error("[gatewayBridge] Gateway responded with", response.status);
        return { sent: false, reason: "gateway_error" };
      }

      return { sent: true };
    } catch (error) {
      console.error("[gatewayBridge] Failed to reach gateway:", error);
      return { sent: false, reason: "network_error" };
    }
  },
});
