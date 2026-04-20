import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const scheduleBlockValidator = v.object({
  start: v.string(),
  end: v.string(),
  label: v.string(),
  type: v.string(),
  taskId: v.optional(v.string()),
});

/** Tight YYYY-MM-DD check so we never write garbage like "today" into a
 * task's `dueDate`. Mutations accept `v.string()` for date so the helper
 * has to validate. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** When a schedule block references a task, bump that task's `dueDate` to
 * match the plan's date. Intent: putting a task on today's plan means
 * "this is due today" — the scheduled-time chip then shows, the task
 * shows up in the today bucket, and reminders/filters line up with user
 * expectation. No-op for blocks without a taskId and for tasks already
 * dated to that day.
 *
 * Trade-offs:
 * - **Multi-plan ping-pong**: a task scheduled on both today and tomorrow
 *   will have its dueDate set to whichever plan was written most recently.
 *   Acceptable — multiple plans for the same task is rare, and the user
 *   can always manually pin the dueDate via `task update`.
 * - **Removal**: removing a block does NOT revert the dueDate. We have no
 *   provenance for whether it came from a previous schedule or a manual
 *   edit, so guessing would be destructive.
 *
 * Each task patch gets its own `mutationLog` entry with action
 * `"auto-due-from-plan"` so `lifeos undo` can revert it (one undo per
 * affected task plus one for the day plan itself). */
async function syncTaskDueDatesToPlanDate(
  ctx: MutationCtx,
  userId: Id<"users">,
  planDate: string,
  schedule: ReadonlyArray<{ taskId?: string }>,
): Promise<void> {
  if (!DATE_RE.test(planDate)) return; // Bad shape — refuse to corrupt task data.
  const taskIds = new Set<string>();
  for (const b of schedule) {
    if (b.taskId) taskIds.add(b.taskId);
  }
  for (const rawId of taskIds) {
    // Wrap the whole per-task block: any failure (bad ID format, foreign
    // table doc that somehow has a matching userId, schema patch reject)
    // skips that task without aborting the day-plan write.
    try {
      const task = await ctx.db.get(rawId as Id<"tasks">);
      if (!task) continue;
      const taskDoc = task as { userId?: Id<"users">; dueDate?: string; _id: Id<"tasks"> };
      if (taskDoc.userId !== userId) continue;
      if (taskDoc.dueDate === planDate) continue;
      const before = task;
      await ctx.db.patch(taskDoc._id, { dueDate: planDate, updatedAt: Date.now() });
      const after = await ctx.db.get(taskDoc._id);
      // Log so `lifeos undo` can revert. Tagged with a distinct action so
      // it's easy to spot in the audit trail.
      await ctx.db.insert("mutationLog", {
        userId,
        action: "auto-due-from-plan",
        tableName: "tasks",
        recordId: taskDoc._id,
        beforeData: before,
        afterData: after,
      });
    } catch {
      continue;
    }
  }
}

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
      if (args.schedule !== undefined) {
        await syncTaskDueDatesToPlanDate(ctx, userId, args.date, args.schedule);
      }
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

      if (args.schedule && args.schedule.length > 0) {
        await syncTaskDueDatesToPlanDate(ctx, userId, args.date, args.schedule);
      }

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

// ── clearPriority ────────────────────────────────────
// Explicitly clears a priority slot (MIT/P1/P2). Uses `replace` because
// `patch` with `{ field: undefined }` doesn't reliably remove an optional
// field — undefined values get dropped during arg validation, so the
// field is left untouched. Replacing with the field omitted is unambiguous.

export const clearPriority = mutation({
  args: {
    date: v.string(),
    slot: v.union(v.literal("mit"), v.literal("p1"), v.literal("p2")),
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

    if (!existing) return null;

    const taskIdField = `${args.slot}TaskId` as const;
    const doneField = `${args.slot}Done` as const;

    // Strip system fields, drop the cleared id, force the done flag false.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, _creationTime, ...rest } = existing;
    const next = { ...rest, [doneField]: false } as typeof rest;
    delete (next as Record<string, unknown>)[taskIdField];

    await ctx.db.replace(existing._id, next);
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
    if (args.schedule !== undefined) {
      await syncTaskDueDatesToPlanDate(ctx, userId, args.date, args.schedule);
    }
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
      if (args.schedule !== undefined) {
        await syncTaskDueDatesToPlanDate(ctx, args.userId, args.planDate, args.schedule);
      }
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

      if (args.schedule && args.schedule.length > 0) {
        await syncTaskDueDatesToPlanDate(ctx, args.userId, args.planDate, args.schedule);
      }

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
    if (args.schedule !== undefined) {
      await syncTaskDueDatesToPlanDate(ctx, args.userId, args.planDate, args.schedule);
    }
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
