import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// ── Default Config ───────────────────────────────────

const DEFAULT_CONFIG = {
  navMode: "sidebar" as const,
  navOrder: ["today", "tasks", "projects", "goals", "journal", "ideas", "plan", "reviews"],
  navHidden: [] as string[],
  pagePresets: {} as Record<string, string>,
  customTheme: undefined as undefined,
};

// ── Helpers ──────────────────────────────────────────

type DashboardConfig = Doc<"dashboardConfig">;
type VirtualConfig = typeof DEFAULT_CONFIG & {
  userId: Id<"users">;
  _id: null;
};

async function getOrCreateConfig(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<DashboardConfig | VirtualConfig> {
  const existing = await ctx.db
    .query("dashboardConfig")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing;
  return { ...DEFAULT_CONFIG, userId, _id: null };
}

async function ensureConfig(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Id<"dashboardConfig">> {
  const existing = await ctx.db
    .query("dashboardConfig")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing._id;
  return await ctx.db.insert("dashboardConfig", { userId, ...DEFAULT_CONFIG });
}

// ════════════════════════════════════════════════════════
// Public functions (use getAuthUserId)
// ════════════════════════════════════════════════════════

// ── get ──────────────────────────────────────────────

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await getOrCreateConfig(ctx, userId);
  },
});

// ── update (partial) ─────────────────────────────────

export const update = mutation({
  args: {
    navMode: v.optional(v.string()),
    navOrder: v.optional(v.array(v.string())),
    navHidden: v.optional(v.array(v.string())),
    pagePresets: v.optional(v.any()),
    customTheme: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const configId = await ensureConfig(ctx, userId);
    const before = await ctx.db.get(configId);

    const updates: Record<string, unknown> = {};
    if (args.navMode !== undefined) updates.navMode = args.navMode;
    if (args.navOrder !== undefined) updates.navOrder = args.navOrder;
    if (args.navHidden !== undefined) updates.navHidden = args.navHidden;
    if (args.pagePresets !== undefined) updates.pagePresets = args.pagePresets;
    if (args.customTheme !== undefined) updates.customTheme = args.customTheme;

    await ctx.db.patch(configId, updates);
    const updated = await ctx.db.get(configId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "dashboardConfig",
      recordId: configId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  },
});

// ── setNavMode ───────────────────────────────────────

export const setNavMode = mutation({
  args: { mode: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const configId = await ensureConfig(ctx, userId);
    const before = await ctx.db.get(configId);

    await ctx.db.patch(configId, { navMode: args.mode });
    const updated = await ctx.db.get(configId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "dashboardConfig",
      recordId: configId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  },
});

// ── setNavOrder ──────────────────────────────────────

export const setNavOrder = mutation({
  args: { order: v.array(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const configId = await ensureConfig(ctx, userId);
    const before = await ctx.db.get(configId);

    await ctx.db.patch(configId, { navOrder: args.order });
    const updated = await ctx.db.get(configId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "dashboardConfig",
      recordId: configId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  },
});

// ── setPagePreset ────────────────────────────────────

export const setPagePreset = mutation({
  args: { page: v.string(), preset: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const configId = await ensureConfig(ctx, userId);
    const config = await ctx.db.get(configId);
    const before = config;

    const pagePresets = { ...(config!.pagePresets as Record<string, string>), [args.page]: args.preset };
    await ctx.db.patch(configId, { pagePresets });
    const updated = await ctx.db.get(configId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "dashboardConfig",
      recordId: configId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  },
});

// ── toggleVisibility ─────────────────────────────────

export const toggleVisibility = mutation({
  args: { page: v.string(), visible: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const configId = await ensureConfig(ctx, userId);
    const config = await ctx.db.get(configId);
    const before = config;

    let navHidden = [...config!.navHidden];
    if (args.visible) {
      navHidden = navHidden.filter((p) => p !== args.page);
    } else {
      if (!navHidden.includes(args.page)) {
        navHidden.push(args.page);
      }
    }

    await ctx.db.patch(configId, { navHidden });
    const updated = await ctx.db.get(configId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "dashboardConfig",
      recordId: configId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  },
});

// ── setCustomTheme ───────────────────────────────────

export const setCustomTheme = mutation({
  args: { theme: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const configId = await ensureConfig(ctx, userId);
    const before = await ctx.db.get(configId);

    await ctx.db.patch(configId, { customTheme: args.theme });
    const updated = await ctx.db.get(configId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "dashboardConfig",
      recordId: configId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  },
});

// ── reset ────────────────────────────────────────────

export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("dashboardConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);

      await ctx.db.insert("mutationLog", {
        userId,
        action: "delete",
        tableName: "dashboardConfig",
        recordId: existing._id,
        beforeData: existing,
        afterData: null,
      });
    }

    return { success: true };
  },
});

// ════════════════════════════════════════════════════════
// Internal functions (for HTTP router)
// ════════════════════════════════════════════════════════

// ── _get ─────────────────────────────────────────────

export const _get = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const config = await getOrCreateConfig(ctx, args.userId);
    return { data: config };
  },
});

// ── _update (partial) ────────────────────────────────

export const _update = internalMutation({
  args: {
    userId: v.id("users"),
    navMode: v.optional(v.string()),
    navOrder: v.optional(v.array(v.string())),
    navHidden: v.optional(v.array(v.string())),
    pagePresets: v.optional(v.any()),
    customTheme: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const configId = await ensureConfig(ctx, args.userId);
    const before = await ctx.db.get(configId);

    const updates: Record<string, unknown> = {};
    if (args.navMode !== undefined) updates.navMode = args.navMode;
    if (args.navOrder !== undefined) updates.navOrder = args.navOrder;
    if (args.navHidden !== undefined) updates.navHidden = args.navHidden;
    if (args.pagePresets !== undefined) updates.pagePresets = args.pagePresets;
    if (args.customTheme !== undefined) updates.customTheme = args.customTheme;

    await ctx.db.patch(configId, updates);
    const updated = await ctx.db.get(configId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "dashboardConfig",
      recordId: configId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  },
});

// ── _setNavMode ──────────────────────────────────────

export const _setNavMode = internalMutation({
  args: {
    userId: v.id("users"),
    mode: v.string(),
  },
  handler: async (ctx, args) => {
    const configId = await ensureConfig(ctx, args.userId);
    const before = await ctx.db.get(configId);

    await ctx.db.patch(configId, { navMode: args.mode });
    const updated = await ctx.db.get(configId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "dashboardConfig",
      recordId: configId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  },
});

// ── _setNavOrder ─────────────────────────────────────

export const _setNavOrder = internalMutation({
  args: {
    userId: v.id("users"),
    order: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const configId = await ensureConfig(ctx, args.userId);
    const before = await ctx.db.get(configId);

    await ctx.db.patch(configId, { navOrder: args.order });
    const updated = await ctx.db.get(configId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "dashboardConfig",
      recordId: configId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  },
});

// ── _setPagePreset ───────────────────────────────────

export const _setPagePreset = internalMutation({
  args: {
    userId: v.id("users"),
    page: v.string(),
    preset: v.string(),
  },
  handler: async (ctx, args) => {
    const configId = await ensureConfig(ctx, args.userId);
    const config = await ctx.db.get(configId);
    const before = config;

    const pagePresets = { ...(config!.pagePresets as Record<string, string>), [args.page]: args.preset };
    await ctx.db.patch(configId, { pagePresets });
    const updated = await ctx.db.get(configId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "dashboardConfig",
      recordId: configId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  },
});

// ── _toggleVisibility ────────────────────────────────

export const _toggleVisibility = internalMutation({
  args: {
    userId: v.id("users"),
    page: v.string(),
    visible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const configId = await ensureConfig(ctx, args.userId);
    const config = await ctx.db.get(configId);
    const before = config;

    let navHidden = [...config!.navHidden];
    if (args.visible) {
      navHidden = navHidden.filter((p) => p !== args.page);
    } else {
      if (!navHidden.includes(args.page)) {
        navHidden.push(args.page);
      }
    }

    await ctx.db.patch(configId, { navHidden });
    const updated = await ctx.db.get(configId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "dashboardConfig",
      recordId: configId,
      beforeData: before,
      afterData: updated,
    });

    return updated;
  },
});

// ── _reset ───────────────────────────────────────────

export const _reset = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dashboardConfig")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);

      await ctx.db.insert("mutationLog", {
        userId: args.userId,
        action: "delete",
        tableName: "dashboardConfig",
        recordId: existing._id,
        beforeData: existing,
        afterData: null,
      });
    }

    return { success: true };
  },
});
