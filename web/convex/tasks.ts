import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { todayStr, tomorrowStr, weekFromNowStr } from "./lib/helpers";

// ── Sort helper: dueDate ASC nulls last, then position ──

function sortTasks(
  a: { dueDate?: string; position: number },
  b: { dueDate?: string; position: number },
): number {
  const aDate = a.dueDate ?? "\uffff"; // nulls sort last
  const bDate = b.dueDate ?? "\uffff";
  if (aDate !== bDate) return aDate < bDate ? -1 : 1;
  return a.position - b.position;
}

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    status: v.optional(v.string()),
    due: v.optional(v.string()), // "today" | "tomorrow" | "week" | "overdue" | "all"
    projectId: v.optional(v.id("projects")),
    goalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const status = args.status ?? "todo";
    const due = args.due ?? "all";

    // Use the most selective index based on the query shape
    let results;
    if (status !== "all") {
      results = await ctx.db
        .query("tasks")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", userId).eq("status", status),
        )
        .collect();
    } else {
      results = await ctx.db
        .query("tasks")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    }

    // Apply date filter in JS
    const today = todayStr();
    switch (due) {
      case "today":
        results = results.filter((t) => t.dueDate === today);
        break;
      case "tomorrow":
        results = results.filter((t) => t.dueDate === tomorrowStr());
        break;
      case "week":
        results = results.filter(
          (t) =>
            t.dueDate !== undefined &&
            t.dueDate >= today &&
            t.dueDate <= weekFromNowStr(),
        );
        break;
      case "overdue":
        results = results.filter(
          (t) =>
            t.dueDate !== undefined &&
            t.dueDate < today &&
            t.status === "todo",
        );
        break;
      // "all" — no date filter
    }

    // Optional relationship filters
    if (args.projectId !== undefined) {
      results = results.filter((t) => t.projectId === args.projectId);
    }
    if (args.goalId !== undefined) {
      results = results.filter((t) => t.goalId === args.goalId);
    }

    // Sort: dueDate ASC nulls last, then position
    results.sort(sortTasks);

    return results;
  },
});

// ── get ───────────────────────────────────────────────

export const get = query({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== userId) {
      return null;
    }
    return task;
  },
});

// Batch-fetch a set of tasks by id. Used by the day-timeline so it can
// render checkboxes that reflect live `tasks.status` for schedule blocks
// that link to tasks (checking in Today completes the underlying task,
// same row the Tasks tab is editing — one source of truth).
export const getMany = query({
  args: { ids: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const rows = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return rows
      .filter((r): r is NonNullable<typeof r> => !!r && r.userId === userId)
      .map((r) => ({ _id: r._id, title: r.title, status: r.status, dueDate: r.dueDate }));
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    notes: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    goalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      userId,
      title: args.title,
      notes: args.notes,
      dueDate: args.dueDate,
      projectId: args.projectId,
      goalId: args.goalId,
      status: "todo",
      position: now, // use timestamp as default position for ordering
      updatedAt: now,
    });

    const task = await ctx.db.get(taskId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "tasks",
      recordId: taskId,
      beforeData: null,
      afterData: task,
    });

    return task;
  },
});

// ── update ────────────────────────────────────────────

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    status: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    goalId: v.optional(v.id("goals")),
    position: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Task not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };
    if (args.title !== undefined) updates.title = args.title;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.status !== undefined) {
      updates.status = args.status;
      if (args.status === "done") {
        updates.completedAt = now;
      } else if (args.status === "todo" || args.status === "dropped") {
        updates.completedAt = undefined;
      }
    }
    if (args.projectId !== undefined) updates.projectId = args.projectId;
    if (args.goalId !== undefined) updates.goalId = args.goalId;
    if (args.position !== undefined) updates.position = args.position;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "tasks",
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
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Task not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "tasks",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { deleted: true };
  },
});

// ── complete ──────────────────────────────────────────

export const complete = mutation({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Task not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "done",
      completedAt: now,
      updatedAt: now,
    });

    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "tasks",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

// ── bulkComplete ──────────────────────────────────────

export const bulkComplete = mutation({
  args: {
    ids: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    let completedCount = 0;

    for (const id of args.ids) {
      const existing = await ctx.db.get(id);
      if (!existing || existing.userId !== userId) continue;

      await ctx.db.patch(id, {
        status: "done",
        completedAt: now,
        updatedAt: now,
      });

      const updated = await ctx.db.get(id);

      await ctx.db.insert("mutationLog", {
        userId,
        action: "update",
        tableName: "tasks",
        recordId: id,
        beforeData: existing,
        afterData: updated,
      });

      completedCount++;
    }

    return { completed: completedCount };
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    due: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    goalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, args) => {
    const status = args.status ?? "todo";
    const due = args.due ?? "all";

    let results;
    if (status !== "all") {
      results = await ctx.db
        .query("tasks")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", args.userId).eq("status", status),
        )
        .collect();
    } else {
      results = await ctx.db
        .query("tasks")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
    }

    const today = todayStr();
    switch (due) {
      case "today":
        results = results.filter((t) => t.dueDate === today);
        break;
      case "tomorrow":
        results = results.filter((t) => t.dueDate === tomorrowStr());
        break;
      case "week":
        results = results.filter(
          (t) =>
            t.dueDate !== undefined &&
            t.dueDate >= today &&
            t.dueDate <= weekFromNowStr(),
        );
        break;
      case "overdue":
        results = results.filter(
          (t) =>
            t.dueDate !== undefined &&
            t.dueDate < today &&
            t.status === "todo",
        );
        break;
    }

    if (args.projectId !== undefined) {
      results = results.filter((t) => t.projectId === args.projectId);
    }
    if (args.goalId !== undefined) {
      results = results.filter((t) => t.goalId === args.goalId);
    }

    results.sort(sortTasks);

    return { data: results, count: results.length };
  },
});

export const _get = internalQuery({
  args: {
    userId: v.id("users"),
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== args.userId) {
      return null;
    }
    return task;
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    notes: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    goalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      userId: args.userId,
      title: args.title,
      notes: args.notes,
      dueDate: args.dueDate,
      projectId: args.projectId,
      goalId: args.goalId,
      status: "todo",
      position: now,
      updatedAt: now,
    });

    const task = await ctx.db.get(taskId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "tasks",
      recordId: taskId,
      beforeData: null,
      afterData: task,
    });

    return task;
  },
});

export const _update = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("tasks"),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    status: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    goalId: v.optional(v.id("goals")),
    position: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Task not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };
    if (args.title !== undefined) updates.title = args.title;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.status !== undefined) {
      updates.status = args.status;
      if (args.status === "done") {
        updates.completedAt = now;
      } else if (args.status === "todo" || args.status === "dropped") {
        updates.completedAt = undefined;
      }
    }
    if (args.projectId !== undefined) updates.projectId = args.projectId;
    if (args.goalId !== undefined) updates.goalId = args.goalId;
    if (args.position !== undefined) updates.position = args.position;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "tasks",
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
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Task not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "tasks",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { deleted: true };
  },
});

export const _complete = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Task not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "done",
      completedAt: now,
      updatedAt: now,
    });

    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "tasks",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

export const _bulkComplete = internalMutation({
  args: {
    userId: v.id("users"),
    ids: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let completedCount = 0;

    for (const id of args.ids) {
      const existing = await ctx.db.get(id);
      if (!existing || existing.userId !== args.userId) continue;

      await ctx.db.patch(id, {
        status: "done",
        completedAt: now,
        updatedAt: now,
      });

      const updated = await ctx.db.get(id);

      await ctx.db.insert("mutationLog", {
        userId: args.userId,
        action: "update",
        tableName: "tasks",
        recordId: id,
        beforeData: existing,
        afterData: updated,
      });

      completedCount++;
    }

    return { completed: completedCount };
  },
});
