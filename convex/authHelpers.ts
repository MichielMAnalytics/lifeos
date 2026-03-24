import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ══════════════════════════════════════════════════════
// Internal helpers (called from auth.ts actions)
// ══════════════════════════════════════════════════════

export const _findUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .collect();
    return users[0] ?? null;
  },
});

export const _insertUser = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      timezone: args.timezone ?? "UTC",
    });
    const user = await ctx.db.get(userId);
    return user;
  },
});

export const _findKeysByPrefix = internalQuery({
  args: { prefix: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_keyPrefix", (q) => q.eq("keyPrefix", args.prefix))
      .collect();
  },
});

export const _insertApiKey = internalMutation({
  args: {
    userId: v.id("users"),
    keyPrefix: v.string(),
    keyHash: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const keyId = await ctx.db.insert("apiKeys", {
      userId: args.userId,
      keyPrefix: args.keyPrefix,
      keyHash: args.keyHash,
      name: args.name,
    });
    return await ctx.db.get(keyId);
  },
});

export const _updateKeyLastUsed = internalMutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsedAt: Date.now() });
  },
});

export const _getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// ══════════════════════════════════════════════════════
// Public queries/mutations (called from dashboard via useQuery)
// ══════════════════════════════════════════════════════

// ── getMe (query) ────────────────────────────────────

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) return null;
    const safeUser = user;
    return safeUser;
  },
});

// ── updateMe (mutation) ──────────────────────────────

export const updateMe = mutation({
  args: {
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(userId);
    if (!existing) {
      throw new Error("User not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.timezone !== undefined) updates.timezone = args.timezone;

    if (Object.keys(updates).length === 0) {
      throw new Error("No fields to update");
    }

    await ctx.db.patch(userId, updates);
    const updated = await ctx.db.get(userId);
    if (!updated) throw new Error("User not found after update");
    const safeUser = updated;
    return safeUser;
  },
});

// ── listApiKeys (query) ──────────────────────────────

export const listApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Return keys without hash
    return keys.map((k) => ({
      _id: k._id,
      _creationTime: k._creationTime,
      keyPrefix: k.keyPrefix,
      name: k.name,
      lastUsedAt: k.lastUsedAt,
    }));
  },
});

// ── deleteApiKey (mutation) ──────────────────────────

export const deleteApiKey = mutation({
  args: {
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const key = await ctx.db.get(args.keyId);
    if (!key || key.userId !== userId) {
      throw new Error("API key not found");
    }

    await ctx.db.delete(args.keyId);
    return { deleted: true };
  },
});

// ══════════════════════════════════════════════════════
// Internal variants of public functions (for HTTP router)
// ══════════════════════════════════════════════════════

export const _getMe = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const safeUser = user;
    return safeUser;
  },
});

export const _updateMe = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.userId);
    if (!existing) {
      throw new Error("User not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.timezone !== undefined) updates.timezone = args.timezone;

    if (Object.keys(updates).length === 0) {
      throw new Error("No fields to update");
    }

    await ctx.db.patch(args.userId, updates);
    const updated = await ctx.db.get(args.userId);
    if (!updated) throw new Error("User not found after update");
    const safeUser = updated;
    return safeUser;
  },
});

export const _listApiKeys = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return keys.map((k) => ({
      _id: k._id,
      _creationTime: k._creationTime,
      keyPrefix: k.keyPrefix,
      name: k.name,
      lastUsedAt: k.lastUsedAt,
    }));
  },
});

export const _deleteApiKey = internalMutation({
  args: {
    userId: v.id("users"),
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key || key.userId !== args.userId) {
      throw new Error("API key not found");
    }

    await ctx.db.delete(args.keyId);
    return { deleted: true };
  },
});
