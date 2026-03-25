import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Public Queries ──────────────────────────────────────────────────

export const getMyDeployment = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("deployments"),
      _creationTime: v.number(),
      userId: v.id("users"),
      subdomain: v.string(),
      gatewayToken: v.string(),
      podSecret: v.string(),
      callbackJwt: v.string(),
      status: v.union(
        v.literal("provisioning"),
        v.literal("starting"),
        v.literal("running"),
        v.literal("error"),
        v.literal("deactivating"),
        v.literal("deactivated"),
        v.literal("suspended"),
      ),
      configHash: v.string(),
      targetImageTag: v.string(),
      podIp: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
      deactivatedAt: v.optional(v.number()),
      pvcRetainUntil: v.optional(v.number()),
      createdAt: v.number(),
      lastUpdatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const deployments = await ctx.db
      .query("deployments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return (
      deployments.find(
        (d) => d.status !== "deactivated",
      ) ?? null
    );
  },
});

// ── Internal Queries ────────────────────────────────────────────────

export const getDeploymentByPodSecret = internalQuery({
  args: { podSecret: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("deployments"),
      userId: v.id("users"),
      subdomain: v.string(),
      podSecret: v.string(),
      status: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { podSecret }) => {
    const dep = await ctx.db
      .query("deployments")
      .withIndex("by_podSecret", (q) => q.eq("podSecret", podSecret))
      .unique();
    if (!dep) return null;
    return {
      _id: dep._id,
      userId: dep.userId,
      subdomain: dep.subdomain,
      podSecret: dep.podSecret,
      status: dep.status,
    };
  },
});

export const getDeploymentBySubdomain = internalQuery({
  args: { subdomain: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("deployments"),
      userId: v.id("users"),
      subdomain: v.string(),
      podSecret: v.string(),
      status: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { subdomain }) => {
    const deps = await ctx.db
      .query("deployments")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", subdomain))
      .order("desc")
      .collect();
    const dep = deps.find((d) => d.status !== "deactivated" && d.status !== "error") ?? deps[0];
    if (!dep) return null;
    return {
      _id: dep._id,
      userId: dep.userId,
      subdomain: dep.subdomain,
      podSecret: dep.podSecret,
      status: dep.status,
    };
  },
});

export const getActiveDeploymentForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.id("deployments"), v.null()),
  handler: async (ctx, { userId }) => {
    const deployments = await ctx.db
      .query("deployments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const active = deployments.find(
      (d) => d.status !== "deactivated",
    );
    return active?._id ?? null;
  },
});

/**
 * Returns the full active deployment record for a user.
 * Used by gatewayBridge to send messages to the user's running pod.
 */
export const getActiveDeploymentDetailsForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("deployments"),
      userId: v.id("users"),
      subdomain: v.string(),
      gatewayToken: v.string(),
      status: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { userId }) => {
    const deployments = await ctx.db
      .query("deployments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const active = deployments.find(
      (d) => d.status !== "deactivated",
    );
    if (!active) return null;
    return {
      _id: active._id,
      userId: active.userId,
      subdomain: active.subdomain,
      gatewayToken: active.gatewayToken,
      status: active.status,
    };
  },
});

export const getDesiredState = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      deploymentId: v.id("deployments"),
      subdomain: v.string(),
      podSecret: v.string(),
      status: v.string(),
      configHash: v.string(),
      targetImageTag: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const running = await ctx.db
      .query("deployments")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();
    const provisioning = await ctx.db
      .query("deployments")
      .withIndex("by_status", (q) => q.eq("status", "provisioning"))
      .collect();
    const starting = await ctx.db
      .query("deployments")
      .withIndex("by_status", (q) => q.eq("status", "starting"))
      .collect();
    const errored = await ctx.db
      .query("deployments")
      .withIndex("by_status", (q) => q.eq("status", "error"))
      .collect();
    return [...running, ...provisioning, ...starting, ...errored].map((d) => ({
      deploymentId: d._id,
      subdomain: d.subdomain,
      podSecret: d.podSecret,
      status: d.status,
      configHash: d.configHash,
      targetImageTag: d.targetImageTag,
    }));
  },
});

export const getFullDeploymentBySubdomain = internalQuery({
  args: { subdomain: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("deployments"),
      userId: v.id("users"),
      subdomain: v.string(),
      podSecret: v.string(),
      callbackJwt: v.string(),
      gatewayToken: v.string(),
      status: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { subdomain }) => {
    const deps = await ctx.db
      .query("deployments")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", subdomain))
      .order("desc")
      .collect();
    const dep = deps.find((d) => d.status !== "deactivated" && d.status !== "error") ?? deps[0];
    if (!dep) return null;
    return {
      _id: dep._id,
      userId: dep.userId,
      subdomain: dep.subdomain,
      podSecret: dep.podSecret,
      callbackJwt: dep.callbackJwt,
      gatewayToken: dep.gatewayToken,
      status: dep.status,
    };
  },
});

export const getUserEmail = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return user?.email ?? null;
  },
});

export const getLastGatewayToken = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { userId }) => {
    const dep = await ctx.db
      .query("deployments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    return dep?.gatewayToken ?? null;
  },
});

// ── Internal Mutations ──────────────────────────────────────────────

export const createDeploymentRecord = internalMutation({
  args: {
    userId: v.id("users"),
    subdomain: v.string(),
    gatewayToken: v.string(),
    podSecret: v.string(),
    callbackJwt: v.string(),
    configHash: v.string(),
    targetImageTag: v.string(),
  },
  returns: v.id("deployments"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("deployments", {
      ...args,
      status: "provisioning",
      createdAt: now,
      lastUpdatedAt: now,
    });
  },
});

export const getDeploymentById = internalQuery({
  args: { deploymentId: v.id("deployments") },
  returns: v.union(
    v.object({
      _id: v.id("deployments"),
      subdomain: v.string(),
      status: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { deploymentId }) => {
    const dep = await ctx.db.get(deploymentId);
    if (!dep) return null;
    return {
      _id: dep._id,
      subdomain: dep.subdomain,
      status: dep.status,
    };
  },
});

export const updateDeploymentStatus = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    status: v.optional(
      v.union(
        v.literal("provisioning"),
        v.literal("starting"),
        v.literal("running"),
        v.literal("error"),
        v.literal("deactivating"),
        v.literal("deactivated"),
        v.literal("suspended"),
      ),
    ),
    podIp: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    deactivatedAt: v.optional(v.number()),
    pvcRetainUntil: v.optional(v.number()),
    configHash: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { deploymentId, ...fields }) => {
    const update: Record<string, unknown> = {
      lastUpdatedAt: Date.now(),
    };
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) {
        update[k] = val;
      }
    }
    await ctx.db.patch(deploymentId, update);
    return null;
  },
});

export const scheduleHealthCheck = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    subdomain: v.string(),
    delayMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { deploymentId, subdomain, delayMs }) => {
    await ctx.scheduler.runAfter(
      delayMs,
      internal.deploymentHealthCheck.checkDeploymentHealth,
      { deploymentId, subdomain, attempt: 0 },
    );
    return null;
  },
});
