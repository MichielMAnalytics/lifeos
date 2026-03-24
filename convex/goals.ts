import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    status: v.optional(v.string()),
    quarter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let results;
    if (args.status !== undefined) {
      results = await ctx.db
        .query("goals")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", userId).eq("status", args.status!),
        )
        .collect();
    } else {
      results = await ctx.db
        .query("goals")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    }

    // Apply quarter filter in JS (no index for it)
    if (args.quarter !== undefined) {
      results = results.filter((g) => g.quarter === args.quarter);
    }

    return { data: results, count: results.length };
  },
});

// ── get ───────────────────────────────────────────────

export const get = query({
  args: {
    id: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== userId) {
      return null;
    }

    // Fetch tasks linked to this goal
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const goalTasks = allTasks.filter((t) => t.goalId === args.id);

    return { ...goal, tasks: goalTasks };
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    quarter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goalId = await ctx.db.insert("goals", {
      userId,
      title: args.title,
      description: args.description,
      status: args.status ?? "active",
      targetDate: args.targetDate,
      quarter: args.quarter,
    });

    const goal = await ctx.db.get(goalId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "goals",
      recordId: goalId,
      beforeData: null,
      afterData: goal,
    });

    return goal;
  },
});

// ── update ────────────────────────────────────────────

export const update = mutation({
  args: {
    id: v.id("goals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    quarter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Goal not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.targetDate !== undefined) updates.targetDate = args.targetDate;
    if (args.quarter !== undefined) updates.quarter = args.quarter;

    // If status is being set to completed, set completedAt
    if (args.status === "completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "goals",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: {
    id: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Goal not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "goals",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

// ── health ────────────────────────────────────────────

export const health = query({
  args: {
    id: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== userId) {
      return null;
    }

    // Fetch all tasks linked to this goal
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const goalTasks = allTasks.filter((t) => t.goalId === args.id);
    const total = goalTasks.length;

    if (total === 0) {
      return {
        goalId: args.id,
        totalTasks: 0,
        doneTasks: 0,
        velocity: 0,
        status: "unknown" as const,
      };
    }

    const done = goalTasks.filter((t) => t.status === "done").length;
    const velocity = done / total;

    let status: "on_track" | "at_risk" | "off_track";
    if (velocity > 0.7) {
      status = "on_track";
    } else if (velocity > 0.4) {
      status = "at_risk";
    } else {
      status = "off_track";
    }

    return {
      goalId: args.id,
      totalTasks: total,
      doneTasks: done,
      velocity: Math.round(velocity * 100) / 100,
      status,
    };
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    quarter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results;
    if (args.status !== undefined) {
      results = await ctx.db
        .query("goals")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status!),
        )
        .collect();
    } else {
      results = await ctx.db
        .query("goals")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
    }

    if (args.quarter !== undefined) {
      results = results.filter((g) => g.quarter === args.quarter);
    }

    return { data: results, count: results.length };
  },
});

export const _get = internalQuery({
  args: {
    userId: v.id("users"),
    id: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== args.userId) {
      return null;
    }

    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const goalTasks = allTasks.filter((t) => t.goalId === args.id);

    return { ...goal, tasks: goalTasks };
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    quarter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const goalId = await ctx.db.insert("goals", {
      userId: args.userId,
      title: args.title,
      description: args.description,
      status: args.status ?? "active",
      targetDate: args.targetDate,
      quarter: args.quarter,
    });

    const goal = await ctx.db.get(goalId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "goals",
      recordId: goalId,
      beforeData: null,
      afterData: goal,
    });

    return goal;
  },
});

export const _update = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("goals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    quarter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Goal not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.targetDate !== undefined) updates.targetDate = args.targetDate;
    if (args.quarter !== undefined) updates.quarter = args.quarter;

    if (args.status === "completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "goals",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

export const _remove = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Goal not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "goals",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

export const _health = internalQuery({
  args: {
    userId: v.id("users"),
    id: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== args.userId) {
      return null;
    }

    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const goalTasks = allTasks.filter((t) => t.goalId === args.id);
    const total = goalTasks.length;

    if (total === 0) {
      return {
        goalId: args.id,
        totalTasks: 0,
        doneTasks: 0,
        velocity: 0,
        status: "unknown" as const,
      };
    }

    const done = goalTasks.filter((t) => t.status === "done").length;
    const velocity = done / total;

    let status: "on_track" | "at_risk" | "off_track";
    if (velocity > 0.7) {
      status = "on_track";
    } else if (velocity > 0.4) {
      status = "at_risk";
    } else {
      status = "off_track";
    }

    return {
      goalId: args.id,
      totalTasks: total,
      doneTasks: done,
      velocity: Math.round(velocity * 100) / 100,
      status,
    };
  },
});
