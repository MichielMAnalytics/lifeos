"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { serverEnv } from "./deploymentEnv";

const MAX_ATTEMPTS = 60; // 60 * 5s = 5 minutes
const RETRY_DELAY_MS = 5000;

export const checkDeploymentHealth = internalAction({
  args: {
    deploymentId: v.id("deployments"),
    subdomain: v.string(),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { deploymentId, subdomain, attempt }) => {
    // Verify deployment still exists and is in a pending state
    const dep = await ctx.runQuery(internal.deploymentQueries.getDeploymentById, {
      deploymentId,
    });
    if (!dep || (dep.status !== "starting" && dep.status !== "provisioning")) {
      return null;
    }

    const domain = serverEnv.LIFEOS_DOMAIN;
    const url = `https://${subdomain}.${domain}/`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Any response means the pod + ingress are alive.
      // 503 is expected when nginx auth-url blocks unauthenticated requests.
      if (res.status < 504) {
        // Healthy — transition to running
        await ctx.runMutation(internal.deploymentQueries.updateDeploymentStatus, {
          deploymentId,
          status: "running",
        });
        return null;
      }
    } catch {
      // Network error or timeout — treat as unhealthy
    }

    // Check if we've exceeded max attempts
    if (attempt + 1 >= MAX_ATTEMPTS) {
      await ctx.runMutation(internal.deploymentQueries.updateDeploymentStatus, {
        deploymentId,
        status: "error",
        errorMessage:
          "Instance failed to become healthy within 5 minutes. Please try restarting.",
      });
      return null;
    }

    // Reschedule
    await ctx.scheduler.runAfter(
      RETRY_DELAY_MS,
      internal.deploymentHealthCheck.checkDeploymentHealth,
      {
        deploymentId,
        subdomain,
        attempt: attempt + 1,
      },
    );

    return null;
  },
});
