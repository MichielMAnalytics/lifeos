import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const scheduleBlockValidator = v.object({
  start: v.string(),
  end: v.string(),
  label: v.string(),
  type: v.string(),
  taskId: v.optional(v.string()),
});

// ── getByDate ─────────────────────────────────────────

export const getByDate = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) =>
        q.eq("userId", userId).eq("planDate", args.date),
      )
      .unique();

    return plan;
  },
});

// ── listByDateRange ──────────────────────────────────

export const listByDateRange = query({
  args: {
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(),   // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const results = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) => q.eq("userId", userId))
      .collect();

    return results.filter(
      (p) => p.planDate >= args.startDate && p.planDate <= args.endDate,
    );
  },
});

// ── upsert ────────────────────────────────────────────

export const upsert = mutation({
  args: {
    date: v.string(),
    wakeTime: v.optional(v.string()),
    schedule: v.optional(v.array(scheduleBlockValidator)),
    overflow: v.optional(v.array(v.string())),
    mitTaskId: v.optional(v.id("tasks")),
    p1TaskId: v.optional(v.id("tasks")),
    p2TaskId: v.optional(v.id("tasks")),
    mitDone: v.optional(v.boolean()),
    p1Done: v.optional(v.boolean()),
    p2Done: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) =>
        q.eq("userId", userId).eq("planDate", args.date),
      )
      .unique();

    if (existing) {
      // Patch existing plan
      const updates: Record<string, unknown> = {};
      if (args.wakeTime !== undefined) updates.wakeTime = args.wakeTime;
      if (args.schedule !== undefined) updates.schedule = args.schedule;
      if (args.overflow !== undefined) updates.overflow = args.overflow;
      if (args.mitTaskId !== undefined) updates.mitTaskId = args.mitTaskId;
      if (args.p1TaskId !== undefined) updates.p1TaskId = args.p1TaskId;
      if (args.p2TaskId !== undefined) updates.p2TaskId = args.p2TaskId;
      if (args.mitDone !== undefined) updates.mitDone = args.mitDone;
      if (args.p1Done !== undefined) updates.p1Done = args.p1Done;
      if (args.p2Done !== undefined) updates.p2Done = args.p2Done;

      await ctx.db.patch(existing._id, updates);
      const updated = await ctx.db.get(existing._id);

      await ctx.db.insert("mutationLog", {
        userId,
        action: "update",
        tableName: "dayPlans",
        recordId: existing._id,
        beforeData: existing,
        afterData: updated,
      });

      return updated;
    } else {
      // Create new plan with defaults for required fields
      const planId = await ctx.db.insert("dayPlans", {
        userId,
        planDate: args.date,
        wakeTime: args.wakeTime,
        schedule: args.schedule ?? [],
        overflow: args.overflow ?? [],
        mitTaskId: args.mitTaskId,
        p1TaskId: args.p1TaskId,
        p2TaskId: args.p2TaskId,
        mitDone: args.mitDone ?? false,
        p1Done: args.p1Done ?? false,
        p2Done: args.p2Done ?? false,
      });

      const plan = await ctx.db.get(planId);

      await ctx.db.insert("mutationLog", {
        userId,
        action: "create",
        tableName: "dayPlans",
        recordId: planId,
        beforeData: null,
        afterData: plan,
      });

      return plan;
    }
  },
});

// ── patch ────────────────────────────────────────────

export const patch = mutation({
  args: {
    date: v.string(),
    wakeTime: v.optional(v.string()),
    schedule: v.optional(v.array(scheduleBlockValidator)),
    overflow: v.optional(v.array(v.string())),
    mitTaskId: v.optional(v.id("tasks")),
    p1TaskId: v.optional(v.id("tasks")),
    p2TaskId: v.optional(v.id("tasks")),
    mitDone: v.optional(v.boolean()),
    p1Done: v.optional(v.boolean()),
    p2Done: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) =>
        q.eq("userId", userId).eq("planDate", args.date),
      )
      .unique();

    if (!existing) {
      throw new Error("Day plan not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.wakeTime !== undefined) updates.wakeTime = args.wakeTime;
    if (args.schedule !== undefined) updates.schedule = args.schedule;
    if (args.overflow !== undefined) updates.overflow = args.overflow;
    if (args.mitTaskId !== undefined) updates.mitTaskId = args.mitTaskId;
    if (args.p1TaskId !== undefined) updates.p1TaskId = args.p1TaskId;
    if (args.p2TaskId !== undefined) updates.p2TaskId = args.p2TaskId;
    if (args.mitDone !== undefined) updates.mitDone = args.mitDone;
    if (args.p1Done !== undefined) updates.p1Done = args.p1Done;
    if (args.p2Done !== undefined) updates.p2Done = args.p2Done;

    await ctx.db.patch(existing._id, updates);
    const updated = await ctx.db.get(existing._id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "dayPlans",
      recordId: existing._id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _getByDate = internalQuery({
  args: { userId: v.id("users"), planDate: v.string() },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) =>
        q.eq("userId", args.userId).eq("planDate", args.planDate),
      )
      .unique();
    return plan;
  },
});

export const _upsert = internalMutation({
  args: {
    userId: v.id("users"),
    planDate: v.string(),
    wakeTime: v.optional(v.string()),
    schedule: v.optional(v.array(scheduleBlockValidator)),
    overflow: v.optional(v.array(v.string())),
    mitTaskId: v.optional(v.id("tasks")),
    p1TaskId: v.optional(v.id("tasks")),
    p2TaskId: v.optional(v.id("tasks")),
    mitDone: v.optional(v.boolean()),
    p1Done: v.optional(v.boolean()),
    p2Done: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) =>
        q.eq("userId", args.userId).eq("planDate", args.planDate),
      )
      .unique();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (args.wakeTime !== undefined) updates.wakeTime = args.wakeTime;
      if (args.schedule !== undefined) updates.schedule = args.schedule;
      if (args.overflow !== undefined) updates.overflow = args.overflow;
      if (args.mitTaskId !== undefined) updates.mitTaskId = args.mitTaskId;
      if (args.p1TaskId !== undefined) updates.p1TaskId = args.p1TaskId;
      if (args.p2TaskId !== undefined) updates.p2TaskId = args.p2TaskId;
      if (args.mitDone !== undefined) updates.mitDone = args.mitDone;
      if (args.p1Done !== undefined) updates.p1Done = args.p1Done;
      if (args.p2Done !== undefined) updates.p2Done = args.p2Done;

      await ctx.db.patch(existing._id, updates);
      const updated = await ctx.db.get(existing._id);

      await ctx.db.insert("mutationLog", {
        userId: args.userId,
        action: "update",
        tableName: "dayPlans",
        recordId: existing._id,
        beforeData: existing,
        afterData: updated,
      });

      return updated;
    } else {
      const planId = await ctx.db.insert("dayPlans", {
        userId: args.userId,
        planDate: args.planDate,
        wakeTime: args.wakeTime,
        schedule: args.schedule ?? [],
        overflow: args.overflow ?? [],
        mitTaskId: args.mitTaskId,
        p1TaskId: args.p1TaskId,
        p2TaskId: args.p2TaskId,
        mitDone: args.mitDone ?? false,
        p1Done: args.p1Done ?? false,
        p2Done: args.p2Done ?? false,
      });

      const plan = await ctx.db.get(planId);

      await ctx.db.insert("mutationLog", {
        userId: args.userId,
        action: "create",
        tableName: "dayPlans",
        recordId: planId,
        beforeData: null,
        afterData: plan,
      });

      return plan;
    }
  },
});

export const _remove = internalMutation({
  args: {
    userId: v.id("users"),
    planDate: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) =>
        q.eq("userId", args.userId).eq("planDate", args.planDate),
      )
      .unique();

    if (!existing) {
      throw new Error("Day plan not found");
    }

    await ctx.db.delete(existing._id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "dayPlans",
      recordId: existing._id,
      beforeData: existing,
      afterData: null,
    });

    return { id: existing._id };
  },
});

export const _patch = internalMutation({
  args: {
    userId: v.id("users"),
    planDate: v.string(),
    wakeTime: v.optional(v.string()),
    schedule: v.optional(v.array(scheduleBlockValidator)),
    overflow: v.optional(v.array(v.string())),
    mitTaskId: v.optional(v.id("tasks")),
    p1TaskId: v.optional(v.id("tasks")),
    p2TaskId: v.optional(v.id("tasks")),
    mitDone: v.optional(v.boolean()),
    p1Done: v.optional(v.boolean()),
    p2Done: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) =>
        q.eq("userId", args.userId).eq("planDate", args.planDate),
      )
      .unique();

    if (!existing) {
      throw new Error("Day plan not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.wakeTime !== undefined) updates.wakeTime = args.wakeTime;
    if (args.schedule !== undefined) updates.schedule = args.schedule;
    if (args.overflow !== undefined) updates.overflow = args.overflow;
    if (args.mitTaskId !== undefined) updates.mitTaskId = args.mitTaskId;
    if (args.p1TaskId !== undefined) updates.p1TaskId = args.p1TaskId;
    if (args.p2TaskId !== undefined) updates.p2TaskId = args.p2TaskId;
    if (args.mitDone !== undefined) updates.mitDone = args.mitDone;
    if (args.p1Done !== undefined) updates.p1Done = args.p1Done;
    if (args.p2Done !== undefined) updates.p2Done = args.p2Done;

    await ctx.db.patch(existing._id, updates);
    const updated = await ctx.db.get(existing._id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "dayPlans",
      recordId: existing._id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});
