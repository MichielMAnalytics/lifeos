"use node";

import { action, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { serverEnv } from "./deploymentEnv";
import type { Id } from "./_generated/dataModel";

type HeartbeatResult = {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  reason?: string;
};

type ActiveDeployment = {
  _id: Id<"deployments">;
  userId: Id<"users">;
  subdomain: string;
  gatewayToken: string;
  status: string;
} | null;

// Manually fire one OpenClaw heartbeat tick on a user's pod. This calls
// `openclaw wake --mode now`, which OpenClaw treats as an immediate
// heartbeat enqueue. The agent then reads HEARTBEAT.md and either
// replies HEARTBEAT_OK (no-op, hidden by default) or surfaces an alert
// to the user's last channel (Telegram in practice).
//
// We talk to the file-server sidecar at `/_/api/exec` rather than the
// gateway's chat endpoint because the chat endpoint enqueues a normal
// user turn, not a heartbeat — those are different scheduler lanes.
async function fireHeartbeatOnPod(
  subdomain: string,
  gatewayToken: string,
  text: string,
): Promise<HeartbeatResult> {
  const domain = serverEnv.LIFEOS_DOMAIN;
  // The file-server's openclaw command parser splits on whitespace, so the
  // `--text` value can't contain spaces. We squash to a single token here
  // so callers can't accidentally break the RPC by passing prose.
  const safeText = text.replace(/\s+/g, "_").slice(0, 80) || "test";
  const url = `https://${subdomain}.${domain}/_/api/exec`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        command: `openclaw wake --mode now --text ${safeText}`,
      }),
    });
    if (!response.ok) {
      console.error("[heartbeatTrigger] file-server status", response.status);
      return { ok: false, reason: `http_${response.status}` };
    }
    const body = (await response.json()) as {
      ok?: boolean;
      stdout?: string;
      stderr?: string;
    };
    return {
      ok: !!body.ok,
      stdout: body.stdout,
      stderr: body.stderr,
      reason: body.ok ? undefined : "rpc_error",
    };
  } catch (error) {
    console.error("[heartbeatTrigger] network error:", error);
    return { ok: false, reason: "network_error" };
  }
}

export const triggerNow = action({
  args: { text: v.optional(v.string()) },
  returns: v.object({
    ok: v.boolean(),
    stdout: v.optional(v.string()),
    stderr: v.optional(v.string()),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, { text }): Promise<HeartbeatResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const deployment: ActiveDeployment = await ctx.runQuery(
      internal.deploymentQueries.getActiveDeploymentDetailsForUser,
      { userId },
    );
    if (!deployment || deployment.status !== "running") {
      return { ok: false, reason: "no_running_deployment" };
    }
    return fireHeartbeatOnPod(
      deployment.subdomain,
      deployment.gatewayToken,
      text ?? "manual_test",
    );
  },
});

// Internal variant for HTTP-API / CLI callers that already know which user
// to fire on (auth is handled by the HTTP wrapper).
export const _triggerNowForUser = internalAction({
  args: { userId: v.id("users"), text: v.optional(v.string()) },
  returns: v.object({
    ok: v.boolean(),
    stdout: v.optional(v.string()),
    stderr: v.optional(v.string()),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, { userId, text }): Promise<HeartbeatResult> => {
    const deployment: ActiveDeployment = await ctx.runQuery(
      internal.deploymentQueries.getActiveDeploymentDetailsForUser,
      { userId },
    );
    if (!deployment || deployment.status !== "running") {
      return { ok: false, reason: "no_running_deployment" };
    }
    return fireHeartbeatOnPod(
      deployment.subdomain,
      deployment.gatewayToken,
      text ?? "manual_test",
    );
  },
});
