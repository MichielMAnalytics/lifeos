import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getUserSettings = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("deploymentSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const getMySettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("deploymentSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const saveSettings = mutation({
  args: {
    apiKeySource: v.union(v.literal("ours"), v.literal("byok")),
    openaiKey: v.optional(v.string()),
    anthropicKey: v.optional(v.string()),
    anthropicAuthMethod: v.optional(
      v.union(v.literal("api_key"), v.literal("setup_token")),
    ),
    anthropicSetupToken: v.optional(v.string()),
    googleKey: v.optional(v.string()),
    moonshotKey: v.optional(v.string()),
    minimaxKey: v.optional(v.string()),
    telegramBotToken: v.optional(v.string()),
    discordBotToken: v.optional(v.string()),
    selectedModel: v.optional(v.string()),
    keysToDelete: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Only persist non-secret metadata to DB (keys go straight to Secret Manager)
    const dbFields: Record<string, unknown> = {
      apiKeySource: args.apiKeySource,
      anthropicAuthMethod: args.anthropicAuthMethod,
      selectedModel: args.selectedModel,
    };
    if (args.anthropicKey) {
      dbFields.anthropicKeyLength = args.anthropicKey.length;
    } else if (args.anthropicSetupToken) {
      dbFields.anthropicKeyLength = args.anthropicSetupToken.length;
    }
    if (args.openaiKey) {
      dbFields.openaiKeyLength = args.openaiKey.length;
    }
    if (args.googleKey) {
      dbFields.googleKeyLength = args.googleKey.length;
    }
    if (args.moonshotKey) {
      dbFields.moonshotKeyLength = args.moonshotKey.length;
    }
    if (args.minimaxKey) {
      dbFields.minimaxKeyLength = args.minimaxKey.length;
    }
    if (args.telegramBotToken) {
      dbFields.telegramBotTokenLength = args.telegramBotToken.length;
    }
    if (args.discordBotToken) {
      dbFields.discordBotTokenLength = args.discordBotToken.length;
    }

    // Handle key deletions
    const keyLengthMap: Record<string, string> = {
      anthropic: "anthropicKeyLength",
      openai: "openaiKeyLength",
      google: "googleKeyLength",
      moonshot: "moonshotKeyLength",
      minimax: "minimaxKeyLength",
    };
    if (args.keysToDelete) {
      for (const provider of args.keysToDelete) {
        const field = keyLengthMap[provider];
        if (field) {
          dbFields[field] = undefined;
        }
        if (provider === "anthropic") {
          dbFields.anthropicAuthMethod = undefined;
        }
      }
    }

    const existing = await ctx.db
      .query("deploymentSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, dbFields);
    } else {
      await ctx.db.insert("deploymentSettings", { userId, apiKeySource: args.apiKeySource, ...dbFields });
    }

    // Write channel tokens to GCP Secret Manager + sync to pod
    // Note: writeChannelTokensToSecretManager schedules syncChannelTokensToPod
    // after the GCP SM write completes, avoiding a race condition.
    if (args.telegramBotToken || args.discordBotToken) {
      await ctx.scheduler.runAfter(
        0,
        internal.deploymentActions.writeChannelTokensToSecretManager,
        {
          userId,
          telegramBotToken: args.telegramBotToken,
          discordBotToken: args.discordBotToken,
        },
      );
    }

    // Write BYOK keys directly to GCP Secret Manager
    if (
      args.apiKeySource === "byok" &&
      (args.openaiKey || args.anthropicKey || args.anthropicSetupToken || args.googleKey || args.moonshotKey || args.minimaxKey)
    ) {
      await ctx.scheduler.runAfter(
        0,
        internal.deploymentActions.writeByokKeysToSecretManager,
        {
          userId,
          openaiKey: args.openaiKey,
          anthropicKey: args.anthropicKey,
          anthropicAuthMethod: args.anthropicAuthMethod,
          anthropicSetupToken: args.anthropicSetupToken,
          googleKey: args.googleKey,
          moonshotKey: args.moonshotKey,
          minimaxKey: args.minimaxKey,
        },
      );
    }

    // Delete BYOK keys from Secret Manager
    if (args.keysToDelete && args.keysToDelete.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.deploymentActions.deleteByokKeysFromSecretManager,
        { userId, providers: args.keysToDelete },
      );
    }

    // Schedule sync (no keys) for gateway notification + model changes
    await ctx.scheduler.runAfter(
      0,
      internal.deploymentActions.syncExternalState,
      {
        userId,
        apiKeySource: args.apiKeySource,
        selectedModel: args.selectedModel,
      },
    );

    return null;
  },
});

export const setPendingDeploy = mutation({
  args: { pending: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { pending }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("deploymentSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { pendingDeploy: pending });
    }
    return null;
  },
});

export const saveCustomEnvVars = mutation({
  args: {
    // Array of { name: "ENV_VAR_NAME", value: "secret_value" }
    // Empty value means delete that key
    envVars: v.array(v.object({ name: v.string(), value: v.string() })),
  },
  returns: v.null(),
  handler: async (ctx, { envVars }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate env var names (uppercase + underscore + digits, no dangerous names)
    const BLOCKED_NAMES = new Set([
      "BASH_ENV", "SHELL", "HOME", "ZDOTDIR", "OPENSSL_CONF",
      "POD_SECRET", "GATEWAY_TOKEN", "CALLBACK_JWT", "USER_ID",
      "API_KEY_SOURCE", "OWNER_EMAIL",
      "TELEGRAM_BOT_TOKEN", "DISCORD_BOT_TOKEN",
    ]);
    for (const { name } of envVars) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(`Invalid env var name: ${name}`);
      }
      if (BLOCKED_NAMES.has(name)) {
        throw new Error(`Reserved env var name: ${name}`);
      }
    }

    const existing = await ctx.db
      .query("deploymentSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    // Deduplicate: if same name has both an add and a delete, add wins
    const resolved = new Map<string, string>();
    for (const { name, value } of envVars) {
      const existing_value = resolved.get(name);
      // Non-empty value always wins over empty (delete)
      if (value || existing_value === undefined) {
        resolved.set(name, value);
      }
    }

    // Build new customEnvKeys array (merge with existing, remove empty values)
    const currentKeys = new Map(
      (existing?.customEnvKeys ?? []).map((k) => [k.name, k.valueLength]),
    );
    const toWrite: Record<string, string> = {};
    for (const [name, value] of resolved) {
      if (value) {
        currentKeys.set(name, value.length);
        toWrite[name] = value;
      } else {
        currentKeys.delete(name);
      }
    }
    const customEnvKeys = Array.from(currentKeys.entries()).map(
      ([name, valueLength]) => ({ name, valueLength }),
    );

    if (existing) {
      await ctx.db.patch(existing._id, { customEnvKeys });
    } else {
      await ctx.db.insert("deploymentSettings", {
        userId,
        apiKeySource: "ours",
        customEnvKeys,
      });
    }

    // Write actual values to GCP Secret Manager, then sync to pod
    if (Object.keys(toWrite).length > 0 || envVars.some((e) => !e.value)) {
      await ctx.scheduler.runAfter(
        0,
        internal.deploymentActions.writeCustomEnvVarsToSecretManager,
        { userId, envVars: toWrite, allEnvKeyNames: customEnvKeys.map((k) => k.name) },
      );
    }

    return null;
  },
});

export const clearPendingDeploy = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("deploymentSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { pendingDeploy: false });
    }
    return null;
  },
});
