"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { serverEnv } from "./deploymentEnv";
import * as crypto from "crypto";
import {
  createStatefulSet,
  deleteStatefulSet,
  createService,
  deleteService,
  createIngress,
  deleteIngress,
  createFileApiIngress,
  deleteFileApiIngress,
  createSecret,
  deleteSecret,
  patchStatefulSet,
  deletePod,
  labelPvc,
  writeByokSecret,
  readByokSecret,
  ensureSetupProxyService,
  MODEL_REF_MAP,
} from "./k8s";

function generateSubdomain(userId: string): string {
  const hash = crypto.createHash("sha256").update(userId).digest("hex");
  return `c-${hash.substring(0, 8)}`;
}

function generateGatewayToken(): string {
  return `claw_${crypto.randomUUID()}`;
}

function generatePodSecret(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function signJwt(
  payload: Record<string, string>,
  secret: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const enc = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const headerB64 = enc(header);
  const payloadB64 = enc(payload);
  const data = `${headerB64}.${payloadB64}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

async function fetchChannelTokens(
  userId: string,
  settings: { telegramBotTokenLength?: number; discordBotTokenLength?: number } | null,
): Promise<Record<string, string>> {
  const tokens: Record<string, string> = {};
  if (settings?.telegramBotTokenLength) {
    const val = await readByokSecret(userId, "telegram-bot");
    if (val) tokens.TELEGRAM_BOT_TOKEN = val;
  }
  if (settings?.discordBotTokenLength) {
    const val = await readByokSecret(userId, "discord-bot");
    if (val) tokens.DISCORD_BOT_TOKEN = val;
  }
  return tokens;
}

async function fetchCustomEnvVars(
  userId: string,
  settings: { customEnvKeys?: Array<{ name: string; valueLength: number }> } | null,
): Promise<Record<string, string>> {
  const envVars: Record<string, string> = {};
  const keys = settings?.customEnvKeys ?? [];
  for (const { name } of keys) {
    const val = await readByokSecret(userId, `env-${name}`);
    if (val) envVars[name] = val;
  }
  return envVars;
}

function computeConfigHash(selectedModel: string | undefined): string {
  return crypto
    .createHash("sha256")
    .update(selectedModel ?? "claude")
    .digest("hex")
    .substring(0, 12);
}

// ── Public Actions ──────────────────────────────────────────────────

export const deploy = action({
  args: {},
  returns: v.object({
    deploymentId: v.id("deployments"),
    subdomain: v.string(),
  }),
  handler: async (ctx): Promise<{
    deploymentId: Id<"deployments">;
    subdomain: string;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check no existing active deployment
    const existing: Id<"deployments"> | null = await ctx.runQuery(
      internal.deploymentQueries.getActiveDeploymentForUser,
      { userId },
    );
    if (existing) {
      throw new Error(
        "You already have an active deployment. Deactivate it first.",
      );
    }

    // Verify active subscription
    const subscription = await ctx.runQuery(
      internal.stripe.getSubscriptionInternal,
      { userId },
    );
    if (!subscription || subscription.status !== "active") {
      throw new Error("Active subscription required. Please subscribe to deploy.");
    }

    // For BYOK plans, seed gateway with 0; for platform key plans, seed with current balance
    const balance: number = subscription.planType === "byok"
      ? 0
      : await ctx.runQuery(internal.stripe.getBalanceInternal, { userId });

    // Look up owner email for auth restriction
    const ownerEmail: string | null = await ctx.runQuery(
      internal.deploymentQueries.getUserEmail,
      { userId },
    );
    if (!ownerEmail) throw new Error("User email not found");

    // Read user settings
    const settings = await ctx.runQuery(
      internal.deploymentSettings.getUserSettings,
      { userId },
    );

    // Generate deployment identifiers
    const subdomain = generateSubdomain(userId);
    const existingToken: string | null = await ctx.runQuery(
      internal.deploymentQueries.getLastGatewayToken,
      { userId },
    );
    const gatewayToken = existingToken ?? generateGatewayToken();
    const podSecret = generatePodSecret();

    const jwtSecret = serverEnv.JWT_SIGNING_KEY;
    if (!jwtSecret) throw new Error("JWT_SIGNING_KEY not configured");

    const callbackJwt = await signJwt(
      { sub: userId, sid: subdomain },
      jwtSecret,
    );

    const selectedModel = settings?.selectedModel;
    const configHash = computeConfigHash(selectedModel);
    const imageTag = serverEnv.OPENCLAW_IMAGE_TAG ?? "latest";

    const gatewayUrl = serverEnv.AI_GATEWAY_INTERNAL_URL;
    if (!gatewayUrl) throw new Error("AI_GATEWAY_INTERNAL_URL not configured");

    const domain = serverEnv.LIFEOS_DOMAIN;

    // Create deployment record
    const deploymentId: Id<"deployments"> = await ctx.runMutation(
      internal.deploymentQueries.createDeploymentRecord,
      {
        userId,
        subdomain,
        gatewayToken,
        podSecret,
        callbackJwt,
        configHash,
        targetImageTag: imageTag,
      },
    );

    // Generate a LifeOS API key for the Life Coach.
    // Delete any existing "Life Coach" key first to avoid accumulating orphaned keys on redeploy.
    const existingKeys = await ctx.runQuery(internal.authHelpers._listApiKeys, { userId });
    const existingLifeCoachKey = existingKeys?.find((k: { name?: string }) => k.name === "Life Coach");
    if (existingLifeCoachKey) {
      await ctx.runMutation(internal.authHelpers._deleteApiKey, { userId, keyId: existingLifeCoachKey._id });
    }
    const apiKeyResult = await ctx.runAction(internal.apiKeyAuth._createApiKey, {
      userId,
      name: "Life Coach",
    });

    try {
      // Seed balance in AI Gateway
      const seedRes = await fetch(`${gatewayUrl}/internal/seedBalance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-System-Key": serverEnv.GATEWAY_SYSTEM_KEY ?? "",
        },
        body: JSON.stringify({ podSecret, amount: balance }),
      });
      if (!seedRes.ok) {
        throw new Error(
          `Failed to seed gateway balance: ${await seedRes.text()}`,
        );
      }

      // Create K8s resources
      const resourceName = `claw-${subdomain}`;

      // Fetch channel tokens + custom env vars from GCP SM
      const channelTokens = await fetchChannelTokens(userId, settings);
      const customEnvVars = await fetchCustomEnvVars(userId, settings);

      // Runtime secret (main container only)
      await createSecret(resourceName, {
        POD_SECRET: podSecret,
        GATEWAY_TOKEN: gatewayToken,
        ...channelTokens,
        ...customEnvVars,
      });

      // Init secret (init container only — includes CALLBACK_JWT for gateway auth)
      await createSecret(`${resourceName}-init`, {
        POD_SECRET: podSecret,
        CALLBACK_JWT: callbackJwt,
        USER_ID: userId,
        API_KEY_SOURCE: settings?.apiKeySource ?? "ours",
        OWNER_EMAIL: ownerEmail,
        GATEWAY_TOKEN: gatewayToken,
        LIFEOS_API_KEY: apiKeyResult.key,
        LIFEOS_API_URL: serverEnv.CONVEX_SITE_URL ?? "",
        OPENAI_API_KEY: serverEnv.OPENAI_API_KEY ?? "",
      });

      await createStatefulSet({
        name: resourceName,
        subdomain,
        imageTag,
        secretName: resourceName,
        initSecretName: `${resourceName}-init`,
        configHash,
        selectedModel: selectedModel ?? "claude",
        enabledChannels: {
          telegram: !!(settings?.telegramBotTokenLength),
          discord: !!(settings?.discordBotTokenLength),
          whatsapp: true,
        },
      });

      await createService(resourceName, subdomain);
      await ensureSetupProxyService();
      await createIngress(resourceName, subdomain, domain);
      await createFileApiIngress(resourceName, subdomain, domain);

      // Clear pendingDeploy flag now that deployment succeeded
      await ctx.runMutation(internal.deploymentSettings.clearPendingDeploy, { userId });

    } catch (err) {
      await ctx.runMutation(
        internal.deploymentQueries.updateDeploymentStatus,
        {
          deploymentId,
          status: "error",
          errorMessage:
            err instanceof Error ? err.message : "Unknown deployment error",
        },
      );
      throw err;
    }

    return { deploymentId, subdomain };
  },
});

export const deactivate = action({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const depId: Id<"deployments"> | null = await ctx.runQuery(
      internal.deploymentQueries.getActiveDeploymentForUser,
      { userId },
    );
    if (!depId) throw new Error("No active deployment found");

    // Get deployment details for cleanup BEFORE changing status
    // (getDesiredState only returns "running" and "provisioning")
    const deployments = await ctx.runQuery(
      internal.deploymentQueries.getDesiredState,
      {},
    );
    const dep = deployments.find(
      (d: { deploymentId: Id<"deployments"> }) => d.deploymentId === depId,
    );
    const subdomain = dep?.subdomain;
    const podSecret = dep?.podSecret;

    // Mark as deactivating
    await ctx.runMutation(
      internal.deploymentQueries.updateDeploymentStatus,
      { deploymentId: depId, status: "deactivating" },
    );

    if (!subdomain) {
      await ctx.runMutation(
        internal.deploymentQueries.updateDeploymentStatus,
        {
          deploymentId: depId,
          status: "deactivated",
          deactivatedAt: Date.now(),
        },
      );
      return null;
    }

    const resourceName = `claw-${subdomain}`;
    const gatewayUrl = serverEnv.AI_GATEWAY_INTERNAL_URL;

    try {
      // Delete K8s resources (order: ingress, service, statefulset)
      await deleteFileApiIngress(resourceName).catch(() => {});
      await deleteIngress(resourceName).catch(() => {});
      await deleteService(resourceName).catch(() => {});
      await deleteStatefulSet(resourceName).catch(() => {});

      // Label PVC for deferred deletion (30 days)
      const pvcName = `data-${resourceName}-0`;
      const retainUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
      await labelPvc(pvcName, {
        "deactivate-after": new Date(retainUntil)
          .toISOString()
          .split("T")[0],
      }).catch(() => {});

      // Delete K8s Secrets (runtime + init)
      await deleteSecret(resourceName).catch(() => {});
      await deleteSecret(`${resourceName}-init`).catch(() => {});

      // Cleanup Redis via AI Gateway
      if (gatewayUrl && serverEnv.GATEWAY_SYSTEM_KEY && podSecret) {
        await fetch(`${gatewayUrl}/internal/cleanupUser`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-System-Key": serverEnv.GATEWAY_SYSTEM_KEY,
          },
          body: JSON.stringify({ podSecret, subdomain }),
        }).catch(() => {});
      }

      // Mark as deactivated
      await ctx.runMutation(
        internal.deploymentQueries.updateDeploymentStatus,
        {
          deploymentId: depId,
          status: "deactivated",
          deactivatedAt: Date.now(),
          pvcRetainUntil: retainUntil,
        },
      );
    } catch (err) {
      await ctx.runMutation(
        internal.deploymentQueries.updateDeploymentStatus,
        {
          deploymentId: depId,
          status: "error",
          errorMessage:
            err instanceof Error
              ? err.message
              : "Unknown deactivation error",
        },
      );
      throw err;
    }

    return null;
  },
});

export const restart = action({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const depId: Id<"deployments"> | null = await ctx.runQuery(
      internal.deploymentQueries.getActiveDeploymentForUser,
      { userId },
    );
    if (!depId) throw new Error("No active deployment found");

    const deployments = await ctx.runQuery(
      internal.deploymentQueries.getDesiredState,
      {},
    );
    const dep = deployments.find(
      (d: { deploymentId: Id<"deployments"> }) => d.deploymentId === depId,
    );
    if (!dep) throw new Error("Deployment not in desired state");

    const resourceName = `claw-${dep.subdomain}`;

    // Patch StatefulSet with latest spec (ensures config changes take effect)
    const settings = await ctx.runQuery(internal.deploymentSettings.getUserSettings, { userId });
    const selectedModel = settings?.selectedModel ?? "claude-sonnet";
    await patchStatefulSet(resourceName, dep.configHash, selectedModel, `${resourceName}-init`, {
      telegram: !!settings?.telegramBotTokenLength,
      discord: !!settings?.discordBotTokenLength,
    });

    // Delete the pod; the StatefulSet controller recreates it with updated spec (PVC preserved)
    await deletePod(resourceName);

    await ctx.runMutation(
      internal.deploymentQueries.updateDeploymentStatus,
      { deploymentId: depId, status: "provisioning" },
    );

    return null;
  },
});

export const updateDeploymentSettings = internalAction({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }): Promise<null> => {

    const depId: Id<"deployments"> | null = await ctx.runQuery(
      internal.deploymentQueries.getActiveDeploymentForUser,
      { userId },
    );
    if (!depId) throw new Error("No active deployment found");

    const settings = await ctx.runQuery(
      internal.deploymentSettings.getUserSettings,
      { userId },
    );

    const gatewayUrl = serverEnv.AI_GATEWAY_INTERNAL_URL;
    if (!gatewayUrl) throw new Error("AI_GATEWAY_INTERNAL_URL not configured");

    // Notify AI Gateway of apiKeySource change
    if (settings && serverEnv.GATEWAY_SYSTEM_KEY) {
      // Look up the podSecret from the deployment
      const deployments = await ctx.runQuery(
        internal.deploymentQueries.getDesiredState,
        {},
      );
      const dep = deployments.find(
        (d: { deploymentId: Id<"deployments"> }) => d.deploymentId === depId,
      );

      if (dep) {
        await fetch(`${gatewayUrl}/internal/updateUser`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-System-Key": serverEnv.GATEWAY_SYSTEM_KEY,
          },
          body: JSON.stringify({
            podSecret: dep.podSecret,
            apiKeySource: settings.apiKeySource,
          }),
        }).catch(() => {});

        // If model changed, hot-switch via K8s exec + patch template for durability
        const newConfigHash = computeConfigHash(settings.selectedModel);
        if (dep.configHash !== newConfigHash) {
          const resourceName = `claw-${dep.subdomain}`;
          const modelId = settings.selectedModel ?? "claude";
          const modelRef = MODEL_REF_MAP[modelId] ?? MODEL_REF_MAP["claude"];

          // Patch StatefulSet template (OnDelete strategy = no auto-restart)
          await patchStatefulSet(resourceName, newConfigHash, modelId, undefined, {
            telegram: !!(settings.telegramBotTokenLength),
            discord: !!(settings.discordBotTokenLength),
            whatsapp: true,
          });

          // Update configHash immediately (deployment stays "running")
          await ctx.runMutation(
            internal.deploymentQueries.updateDeploymentStatus,
            { deploymentId: depId, configHash: newConfigHash },
          );

          try {
            // Hot-switch: exec into pod and update OpenClaw config file
            const systemKey = serverEnv.GATEWAY_SYSTEM_KEY ?? "";
            const res = await fetch(`${gatewayUrl}/internal/setModel`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-System-Key": systemKey,
              },
              body: JSON.stringify({ subdomain: dep.subdomain, modelRef }),
            });

            if (!res.ok) {
              throw new Error(`Hot-switch failed: ${res.status}`);
            }

            const body = await res.json() as { ok: boolean };
            if (!body.ok) {
              throw new Error("Hot-switch returned ok=false");
            }
            // Success — deployment stays "running", no restart needed
          } catch (err) {
            // Fallback: delete pod so StatefulSet recreates it with the new template
            console.error("Hot-switch failed, falling back to pod restart:", err);
            await deletePod(resourceName);
            await ctx.runMutation(
              internal.deploymentQueries.updateDeploymentStatus,
              { deploymentId: depId, status: "provisioning" },
            );
            // Schedule health check as safety net (in case init container callback fails)
            await ctx.runMutation(
              internal.deploymentQueries.scheduleHealthCheck,
              { deploymentId: depId, subdomain: dep.subdomain, delayMs: 15_000 },
            );
          }
        }
      }
    }

    return null;
  },
});

export const suspendForInsufficientBalance = internalAction({
  args: { deploymentId: v.id("deployments") },
  returns: v.null(),
  handler: async (ctx, { deploymentId }): Promise<null> => {
    // Get deployment details
    const deployments = await ctx.runQuery(
      internal.deploymentQueries.getDesiredState,
      {},
    );
    const dep = deployments.find(
      (d: { deploymentId: Id<"deployments"> }) => d.deploymentId === deploymentId,
    );

    if (!dep) {
      // Already not in desired state (maybe already suspended/deactivated)
      await ctx.runMutation(
        internal.deploymentQueries.updateDeploymentStatus,
        { deploymentId, status: "suspended" },
      );
      return null;
    }

    const resourceName = `claw-${dep.subdomain}`;
    const gatewayUrl = serverEnv.AI_GATEWAY_INTERNAL_URL;

    try {
      // Delete K8s resources (same as deactivate but sets status to "suspended")
      await deleteFileApiIngress(resourceName).catch(() => {});
      await deleteIngress(resourceName).catch(() => {});
      await deleteService(resourceName).catch(() => {});
      await deleteStatefulSet(resourceName).catch(() => {});

      // Label PVC for retention
      const pvcName = `data-${resourceName}-0`;
      const retainUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
      await labelPvc(pvcName, {
        "deactivate-after": new Date(retainUntil).toISOString().split("T")[0],
      }).catch(() => {});

      // Delete K8s Secrets (runtime + init)
      await deleteSecret(resourceName).catch(() => {});
      await deleteSecret(`${resourceName}-init`).catch(() => {});

      // Cleanup Redis via AI Gateway
      if (gatewayUrl && serverEnv.GATEWAY_SYSTEM_KEY && dep.podSecret) {
        await fetch(`${gatewayUrl}/internal/cleanupUser`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-System-Key": serverEnv.GATEWAY_SYSTEM_KEY,
          },
          body: JSON.stringify({ podSecret: dep.podSecret, subdomain: dep.subdomain }),
        }).catch(() => {});
      }

      await ctx.runMutation(
        internal.deploymentQueries.updateDeploymentStatus,
        {
          deploymentId,
          status: "suspended",
          pvcRetainUntil: retainUntil,
        },
      );
    } catch (err) {
      await ctx.runMutation(
        internal.deploymentQueries.updateDeploymentStatus,
        {
          deploymentId,
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Unknown suspension error",
        },
      );
      throw err;
    }

    return null;
  },
});

export const suspendForExpiredSubscription = internalAction({
  args: { deploymentId: v.id("deployments") },
  returns: v.null(),
  handler: async (ctx, { deploymentId }): Promise<null> => {
    const deployments = await ctx.runQuery(
      internal.deploymentQueries.getDesiredState,
      {},
    );
    const dep = deployments.find(
      (d: { deploymentId: Id<"deployments"> }) => d.deploymentId === deploymentId,
    );

    if (!dep) {
      await ctx.runMutation(
        internal.deploymentQueries.updateDeploymentStatus,
        { deploymentId, status: "suspended" },
      );
      return null;
    }

    const resourceName = `claw-${dep.subdomain}`;
    const gatewayUrl = serverEnv.AI_GATEWAY_INTERNAL_URL;

    try {
      await deleteFileApiIngress(resourceName).catch(() => {});
      await deleteIngress(resourceName).catch(() => {});
      await deleteService(resourceName).catch(() => {});
      await deleteStatefulSet(resourceName).catch(() => {});

      const pvcName = `data-${resourceName}-0`;
      const retainUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
      await labelPvc(pvcName, {
        "deactivate-after": new Date(retainUntil).toISOString().split("T")[0],
      }).catch(() => {});

      await deleteSecret(resourceName).catch(() => {});
      await deleteSecret(`${resourceName}-init`).catch(() => {});

      if (gatewayUrl && serverEnv.GATEWAY_SYSTEM_KEY && dep.podSecret) {
        await fetch(`${gatewayUrl}/internal/cleanupUser`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-System-Key": serverEnv.GATEWAY_SYSTEM_KEY,
          },
          body: JSON.stringify({ podSecret: dep.podSecret, subdomain: dep.subdomain }),
        }).catch(() => {});
      }

      await ctx.runMutation(
        internal.deploymentQueries.updateDeploymentStatus,
        {
          deploymentId,
          status: "suspended",
          pvcRetainUntil: retainUntil,
        },
      );
    } catch (err) {
      await ctx.runMutation(
        internal.deploymentQueries.updateDeploymentStatus,
        {
          deploymentId,
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Unknown suspension error",
        },
      );
      throw err;
    }

    return null;
  },
});

// ── Internal Actions ────────────────────────────────────────────────

export const rolloutPatch = internalAction({
  args: {
    subdomain: v.optional(v.string()),
  },
  returns: v.object({
    patched: v.number(),
    errors: v.array(v.object({ subdomain: v.string(), error: v.string() })),
  }),
  handler: async (ctx, args): Promise<{
    patched: number;
    errors: Array<{ subdomain: string; error: string }>;
  }> => {
    const deployments = await ctx.runQuery(
      internal.deploymentQueries.getDesiredState,
      {},
    );
    const patchableStatuses = new Set(["running", "starting", "error", "provisioning"]);
    let running = deployments.filter(
      (d: { status: string }) => patchableStatuses.has(d.status),
    );
    if (args.subdomain) {
      running = running.filter((d: { subdomain: string }) => d.subdomain === args.subdomain);
    }

    let patched = 0;
    const errors: Array<{ subdomain: string; error: string }> = [];

    for (const dep of running) {
      try {
        // Get full deployment record (includes callbackJwt for init secret migration)
        const depRecord = await ctx.runQuery(
          internal.deploymentQueries.getFullDeploymentBySubdomain,
          { subdomain: dep.subdomain },
        );
        if (!depRecord) continue;

        const settings = await ctx.runQuery(
          internal.deploymentSettings.getUserSettings,
          { userId: depRecord.userId },
        );
        const selectedModel = settings?.selectedModel ?? "claude";

        const ownerEmail: string | null = await ctx.runQuery(
          internal.deploymentQueries.getUserEmail,
          { userId: depRecord.userId },
        );

        const resourceName = `claw-${dep.subdomain}`;
        const initSecretName = `${resourceName}-init`;
        const newConfigHash = computeConfigHash(selectedModel);

        // Fetch channel tokens + custom env vars and update runtime secret
        const channelTokens = await fetchChannelTokens(depRecord.userId, settings);
        const customEnvVars = await fetchCustomEnvVars(depRecord.userId, settings);
        await createSecret(resourceName, {
          POD_SECRET: dep.podSecret,
          GATEWAY_TOKEN: depRecord.gatewayToken,
          ...channelTokens,
          ...customEnvVars,
          });

        // Regenerate Life Coach API key so the CLI works inside the pod
        const existingKeys = await ctx.runQuery(internal.authHelpers._listApiKeys, { userId: depRecord.userId });
        const existingLifeCoachKey = existingKeys?.find((k: { name?: string }) => k.name === "Life Coach");
        if (existingLifeCoachKey) {
          await ctx.runMutation(internal.authHelpers._deleteApiKey, { userId: depRecord.userId, keyId: existingLifeCoachKey._id });
        }
        const apiKeyResult = await ctx.runAction(internal.apiKeyAuth._createApiKey, {
          userId: depRecord.userId,
          name: "Life Coach",
        });

        // Create the split init secret with LIFEOS CLI credentials
        await createSecret(initSecretName, {
          POD_SECRET: dep.podSecret,
          CALLBACK_JWT: depRecord.callbackJwt,
          USER_ID: depRecord.userId,
          API_KEY_SOURCE: settings?.apiKeySource ?? "ours",
          OWNER_EMAIL: ownerEmail ?? "",
          GATEWAY_TOKEN: depRecord.gatewayToken,
          LIFEOS_API_KEY: apiKeyResult.key,
          LIFEOS_API_URL: serverEnv.CONVEX_SITE_URL ?? "",
          OPENAI_API_KEY: serverEnv.OPENAI_API_KEY ?? "",
        });

        // Patch StatefulSet template with latest config + init container migration
        await patchStatefulSet(resourceName, newConfigHash, selectedModel, initSecretName, {
          telegram: !!(settings?.telegramBotTokenLength),
          discord: !!(settings?.discordBotTokenLength),
          whatsapp: true,
        });

        // Update ingress to route /_/setup to gateway via ExternalName proxy
        const domain = serverEnv.LIFEOS_DOMAIN;
        await ensureSetupProxyService();
        await createIngress(resourceName, dep.subdomain, domain);
        await createFileApiIngress(resourceName, dep.subdomain, domain);

        // Delete pod to trigger recreation with new template
        await deletePod(resourceName);

        // Update deployment status
        await ctx.runMutation(
          internal.deploymentQueries.updateDeploymentStatus,
          { deploymentId: dep.deploymentId, status: "provisioning", configHash: newConfigHash },
        );

        // Schedule health check
        await ctx.runMutation(
          internal.deploymentQueries.scheduleHealthCheck,
          { deploymentId: dep.deploymentId, subdomain: dep.subdomain, delayMs: 15_000 },
        );

        patched++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Auto-deactivate orphaned deployments whose K8s resources no longer exist
        if (msg.includes('"reason":"NotFound"') || msg.includes("not found")) {
          console.log(`[rolloutPatch] K8s resources gone for ${dep.subdomain}, deactivating`);
          await ctx.runMutation(
            internal.deploymentQueries.updateDeploymentStatus,
            { deploymentId: dep.deploymentId, status: "deactivated" },
          );
        } else {
          errors.push({ subdomain: dep.subdomain, error: msg });
        }
      }
    }

    console.log(`[rolloutPatch] Patched ${patched}/${running.length} deployments, ${errors.length} errors`);
    return { patched, errors };
  },
});

export const pushCreditsToGateway = internalAction({
  args: { userId: v.id("users"), amount: v.number() },
  returns: v.null(),
  handler: async (ctx, { userId, amount }): Promise<null> => {
    console.log("[pushCreditsToGateway] userId:", userId, "amount:", amount);
    const depId: Id<"deployments"> | null = await ctx.runQuery(
      internal.deploymentQueries.getActiveDeploymentForUser,
      { userId },
    );
    console.log("[pushCreditsToGateway] activeDeploymentId:", depId);
    if (!depId) {
      console.log("[pushCreditsToGateway] No active deployment found, skipping");
      return null;
    }

    // Get the podSecret from the deployment
    const deployments = await ctx.runQuery(
      internal.deploymentQueries.getDesiredState,
      {},
    );
    const dep = deployments.find(
      (d: { deploymentId: Id<"deployments"> }) => d.deploymentId === depId,
    );
    console.log("[pushCreditsToGateway] deployment in desired state:", !!dep, "podSecret:", dep?.podSecret?.substring(0, 8) + "...");
    if (!dep) {
      console.log("[pushCreditsToGateway] Deployment not in desired state, skipping");
      return null;
    }

    const gatewayUrl = serverEnv.AI_GATEWAY_INTERNAL_URL;
    console.log("[pushCreditsToGateway] gatewayUrl:", gatewayUrl, "hasSystemKey:", !!serverEnv.GATEWAY_SYSTEM_KEY);
    if (!gatewayUrl || !serverEnv.GATEWAY_SYSTEM_KEY) {
      console.warn("[pushCreditsToGateway] Missing gatewayUrl or GATEWAY_SYSTEM_KEY, skipping");
      return null;
    }

    const targetUrl = `${gatewayUrl}/internal/addCredits`;
    console.log("[pushCreditsToGateway] Calling", targetUrl, "with podSecret:", dep.podSecret.substring(0, 8) + "...", "amount:", amount);

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-System-Key": serverEnv.GATEWAY_SYSTEM_KEY,
        },
        body: JSON.stringify({
          podSecret: dep.podSecret,
          amount,
        }),
      });
      console.log("[pushCreditsToGateway] Response status:", res.status);
      const resBody = await res.text();
      console.log("[pushCreditsToGateway] Response body:", resBody);
    } catch (err) {
      console.error("[pushCreditsToGateway] Failed to push credits to gateway:", err);
    }

    return null;
  },
});

export const deleteByokKeysFromSecretManager = internalAction({
  args: {
    userId: v.id("users"),
    providers: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { userId, providers }): Promise<null> => {
    for (const provider of providers) {
      await writeByokSecret(userId, provider, "DELETED");
    }
    // Restart pod so re-registration picks up the deleted keys from GCP SM
    await ctx.scheduler.runAfter(
      0,
      internal.deploymentActions.syncChannelTokensToPod,
      { userId },
    );
    return null;
  },
});

export const writeByokKeysToSecretManager = internalAction({
  args: {
    userId: v.id("users"),
    openaiKey: v.optional(v.string()),
    openaiAuthMethod: v.optional(
      v.union(v.literal("api_key"), v.literal("chatgpt_oauth")),
    ),
    openaiOAuthTokens: v.optional(v.string()),
    anthropicKey: v.optional(v.string()),
    anthropicAuthMethod: v.optional(
      v.union(v.literal("api_key"), v.literal("setup_token")),
    ),
    anthropicSetupToken: v.optional(v.string()),
    googleKey: v.optional(v.string()),
    moonshotKey: v.optional(v.string()),
    minimaxKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args): Promise<null> => {
    const { userId, openaiKey, openaiAuthMethod, openaiOAuthTokens, anthropicKey, anthropicAuthMethod, anthropicSetupToken, googleKey, moonshotKey, minimaxKey } = args;

    const openaiCredential =
      openaiAuthMethod === "chatgpt_oauth"
        ? openaiOAuthTokens
        : openaiKey;

    const anthropicCredential =
      anthropicAuthMethod === "setup_token"
        ? anthropicSetupToken
        : anthropicKey;

    const keys: Record<string, string | undefined> = {
      openai: openaiCredential,
      anthropic: anthropicCredential,
      google: googleKey,
      moonshot: moonshotKey,
      minimax: minimaxKey,
    };

    for (const [provider, key] of Object.entries(keys)) {
      if (key) {
        await writeByokSecret(userId, provider, key);
      }
    }

    return null;
  },
});

export const syncExternalState = internalAction({
  args: {
    userId: v.id("users"),
    apiKeySource: v.union(v.literal("ours"), v.literal("byok")),
    selectedModel: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const { userId, apiKeySource, selectedModel } = args;

    const depId: Id<"deployments"> | null = await ctx.runQuery(
      internal.deploymentQueries.getActiveDeploymentForUser,
      { userId },
    );
    if (!depId) return null;

    // Resolve actual podSecret from the deployment
    const deployments = await ctx.runQuery(
      internal.deploymentQueries.getDesiredState,
      {},
    );
    const dep = deployments.find(
      (d: { deploymentId: Id<"deployments"> }) => d.deploymentId === depId,
    );
    if (!dep) return null;

    // Notify AI Gateway to update user config
    const gatewayUrl = serverEnv.AI_GATEWAY_INTERNAL_URL;
    if (gatewayUrl && serverEnv.GATEWAY_SYSTEM_KEY) {
      await fetch(`${gatewayUrl}/internal/updateUser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-System-Key": serverEnv.GATEWAY_SYSTEM_KEY,
        },
        body: JSON.stringify({ podSecret: dep.podSecret, apiKeySource }),
      }).catch((err) => {
        console.error("Failed to update AI Gateway user config:", err);
      });
    }

    // If model changed, trigger deployment settings update
    if (selectedModel !== undefined) {
      await ctx.runAction(
        internal.deploymentActions.updateDeploymentSettings,
        { userId },
      ).catch((err) => {
        console.error("Failed to update deployment settings:", err);
      });
    }

    return null;
  },
});

export const writeChannelTokensToSecretManager = internalAction({
  args: {
    userId: v.id("users"),
    telegramBotToken: v.optional(v.string()),
    discordBotToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const { userId, telegramBotToken, discordBotToken } = args;
    if (telegramBotToken) {
      await writeByokSecret(userId, "telegram-bot", telegramBotToken);
    }
    if (discordBotToken) {
      await writeByokSecret(userId, "discord-bot", discordBotToken);
    }
    // Schedule pod sync AFTER GCP SM writes complete (avoids race condition)
    await ctx.scheduler.runAfter(
      0,
      internal.deploymentActions.syncChannelTokensToPod,
      { userId },
    );
    return null;
  },
});

export const syncChannelTokensToPod = internalAction({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }): Promise<null> => {
    const depId: Id<"deployments"> | null = await ctx.runQuery(
      internal.deploymentQueries.getActiveDeploymentForUser,
      { userId },
    );
    if (!depId) return null; // No deployment, nothing to sync

    const deployments = await ctx.runQuery(
      internal.deploymentQueries.getDesiredState,
      {},
    );
    const dep = deployments.find(
      (d: { deploymentId: Id<"deployments"> }) => d.deploymentId === depId,
    );
    if (!dep) return null;

    // Get full record (includes gatewayToken)
    const depRecord = await ctx.runQuery(
      internal.deploymentQueries.getFullDeploymentBySubdomain,
      { subdomain: dep.subdomain },
    );
    if (!depRecord) return null;

    const settings = await ctx.runQuery(
      internal.deploymentSettings.getUserSettings,
      { userId },
    );

    // Fetch channel tokens + custom env vars from GCP SM
    const channelTokens = await fetchChannelTokens(userId, settings);
    const customEnvVars = await fetchCustomEnvVars(userId, settings);

    // Update the runtime K8s secret with channel tokens + custom env vars included
    const resourceName = `claw-${dep.subdomain}`;
    await createSecret(resourceName, {
      POD_SECRET: dep.podSecret,
      GATEWAY_TOKEN: depRecord.gatewayToken,
      ...channelTokens,
      ...customEnvVars,
      ...((serverEnv as Record<string, string>).OPENAI_API_KEY ? { OPENAI_API_KEY: (serverEnv as Record<string, string>).OPENAI_API_KEY } : {}),
    });

    // Patch StatefulSet template so enabled channels match token availability
    const selectedModel = settings?.selectedModel ?? "claude";
    const newConfigHash = computeConfigHash(selectedModel);
    await patchStatefulSet(resourceName, newConfigHash, selectedModel, undefined, {
      telegram: !!(settings?.telegramBotTokenLength),
      discord: !!(settings?.discordBotTokenLength),
      whatsapp: true,
    });

    // Restart pod to pick up new env vars
    await deletePod(resourceName);

    await ctx.runMutation(
      internal.deploymentQueries.updateDeploymentStatus,
      { deploymentId: depId, status: "provisioning" },
    );

    // Schedule health check
    await ctx.runMutation(
      internal.deploymentQueries.scheduleHealthCheck,
      { deploymentId: depId, subdomain: dep.subdomain, delayMs: 15_000 },
    );

    return null;
  },
});

export const writeCustomEnvVarsToSecretManager = internalAction({
  args: {
    userId: v.id("users"),
    envVars: v.record(v.string(), v.string()),
    allEnvKeyNames: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { userId, envVars, allEnvKeyNames: _allEnvKeyNames }): Promise<null> => {
    // Write each env var to GCP Secret Manager
    for (const [name, value] of Object.entries(envVars)) {
      await writeByokSecret(userId, `env-${name}`, value);
    }
    // Schedule pod sync after writes complete
    await ctx.scheduler.runAfter(
      0,
      internal.deploymentActions.syncCustomEnvVarsToPod,
      { userId },
    );
    return null;
  },
});

export const syncCustomEnvVarsToPod = internalAction({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }): Promise<null> => {
    const depId: Id<"deployments"> | null = await ctx.runQuery(
      internal.deploymentQueries.getActiveDeploymentForUser,
      { userId },
    );
    if (!depId) return null;

    const deployments = await ctx.runQuery(
      internal.deploymentQueries.getDesiredState,
      {},
    );
    const dep = deployments.find(
      (d: { deploymentId: Id<"deployments"> }) => d.deploymentId === depId,
    );
    if (!dep) return null;

    const depRecord = await ctx.runQuery(
      internal.deploymentQueries.getFullDeploymentBySubdomain,
      { subdomain: dep.subdomain },
    );
    if (!depRecord) return null;

    const settings = await ctx.runQuery(
      internal.deploymentSettings.getUserSettings,
      { userId },
    );

    // Fetch all secrets: channel tokens + custom env vars
    const channelTokens = await fetchChannelTokens(userId, settings);
    const customEnvVars = await fetchCustomEnvVars(userId, settings);

    // Update the runtime K8s secret
    const resourceName = `claw-${dep.subdomain}`;
    await createSecret(resourceName, {
      POD_SECRET: dep.podSecret,
      GATEWAY_TOKEN: depRecord.gatewayToken,
      ...channelTokens,
      ...customEnvVars,
      ...((serverEnv as Record<string, string>).OPENAI_API_KEY ? { OPENAI_API_KEY: (serverEnv as Record<string, string>).OPENAI_API_KEY } : {}),
    });

    // Restart pod to pick up new env vars
    await deletePod(resourceName);

    await ctx.runMutation(
      internal.deploymentQueries.updateDeploymentStatus,
      { deploymentId: depId, status: "provisioning" },
    );

    await ctx.runMutation(
      internal.deploymentQueries.scheduleHealthCheck,
      { deploymentId: depId, subdomain: dep.subdomain, delayMs: 15_000 },
    );

    return null;
  },
});
