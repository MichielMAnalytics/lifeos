import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// ── Helpers ──────────────────────────────────────────

async function getProfile(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("userProfile")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

async function ensureProfile(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("userProfile")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
  if (existing) return existing._id;
  return await ctx.db.insert("userProfile", {
    userId,
    updatedAt: Date.now(),
  });
}

// ── Public Queries ───────────────────────────────────

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await getProfile(ctx, userId);
  },
});

// ── Public Mutations ─────────────────────────────────

export const save = mutation({
  args: {
    displayName: v.optional(v.string()),
    role: v.optional(v.string()),
    topGoals: v.optional(v.array(v.string())),
    focusAreas: v.optional(v.array(v.string())),
    communicationTone: v.optional(v.string()),
    workSchedule: v.optional(v.string()),
    biggestChallenge: v.optional(v.string()),
    accountabilityStyle: v.optional(v.string()),
    selectedUseCases: v.optional(v.array(v.string())),
    setupPath: v.optional(v.string()),
    setupCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profileId = await ensureProfile(ctx, userId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.role !== undefined) updates.role = args.role;
    if (args.topGoals !== undefined) updates.topGoals = args.topGoals;
    if (args.focusAreas !== undefined) updates.focusAreas = args.focusAreas;
    if (args.communicationTone !== undefined) updates.communicationTone = args.communicationTone;
    if (args.workSchedule !== undefined) updates.workSchedule = args.workSchedule;
    if (args.biggestChallenge !== undefined) updates.biggestChallenge = args.biggestChallenge;
    if (args.accountabilityStyle !== undefined) updates.accountabilityStyle = args.accountabilityStyle;
    if (args.selectedUseCases !== undefined) updates.selectedUseCases = args.selectedUseCases;
    if (args.setupPath !== undefined) updates.setupPath = args.setupPath;
    if (args.setupCompleted !== undefined) updates.setupCompleted = args.setupCompleted;

    await ctx.db.patch(profileId, updates);
    return profileId;
  },
});

export const markSetupComplete = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const profileId = await ensureProfile(ctx, userId);
    await ctx.db.patch(profileId, { setupCompleted: true, updatedAt: Date.now() });
  },
});

// ── Internal Functions (for HTTP API / Life Coach) ───

export const _get = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await getProfile(ctx, userId);
  },
});

export const _save = internalMutation({
  args: {
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    role: v.optional(v.string()),
    topGoals: v.optional(v.array(v.string())),
    focusAreas: v.optional(v.array(v.string())),
    communicationTone: v.optional(v.string()),
    workSchedule: v.optional(v.string()),
    biggestChallenge: v.optional(v.string()),
    accountabilityStyle: v.optional(v.string()),
    selectedUseCases: v.optional(v.array(v.string())),
    setupPath: v.optional(v.string()),
    setupCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, ...args }) => {
    const profileId = await ensureProfile(ctx, userId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) updates[key] = value;
    }

    await ctx.db.patch(profileId, updates);
    return profileId;
  },
});
