import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const exerciseValidator = v.object({
  name: v.string(),
  sets: v.optional(v.float64()),
  reps: v.optional(v.float64()),
  weight: v.optional(v.float64()),
  unit: v.optional(v.string()),
});

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    type: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    programmeId: v.optional(v.id("programmes")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let results = await ctx.db
      .query("workouts")
      .withIndex("by_userId_workoutDate", (q) =>
        q.eq("userId", userId),
      )
      .order("desc")
      .collect();

    if (args.from) {
      results = results.filter((w) => w.workoutDate >= args.from!);
    }
    if (args.to) {
      results = results.filter((w) => w.workoutDate <= args.to!);
    }
    if (args.type) {
      results = results.filter((w) => w.type === args.type);
    }
    if (args.programmeId) {
      results = results.filter((w) => w.programmeId === args.programmeId);
    }

    return results;
  },
});

// ── get ───────────────────────────────────────────────

export const get = query({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workout = await ctx.db.get(args.id);
    if (!workout || workout.userId !== userId) return null;
    return workout;
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    workoutDate: v.string(),
    type: v.string(),
    title: v.string(),
    durationMinutes: v.optional(v.float64()),
    exercises: v.optional(v.array(exerciseValidator)),
    notes: v.optional(v.string()),
    programmeId: v.optional(v.id("programmes")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const workoutId = await ctx.db.insert("workouts", {
      userId,
      workoutDate: args.workoutDate,
      type: args.type,
      title: args.title,
      durationMinutes: args.durationMinutes,
      exercises: args.exercises,
      notes: args.notes,
      programmeId: args.programmeId,
      updatedAt: now,
    });

    const workout = await ctx.db.get(workoutId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "workouts",
      recordId: workoutId,
      beforeData: null,
      afterData: workout,
    });

    return workout;
  },
});

// ── update ────────────────────────────────────────────

export const update = mutation({
  args: {
    id: v.id("workouts"),
    workoutDate: v.optional(v.string()),
    type: v.optional(v.string()),
    title: v.optional(v.string()),
    durationMinutes: v.optional(v.float64()),
    exercises: v.optional(v.array(exerciseValidator)),
    notes: v.optional(v.string()),
    programmeId: v.optional(v.id("programmes")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Workout not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.workoutDate !== undefined) updates.workoutDate = args.workoutDate;
    if (args.type !== undefined) updates.type = args.type;
    if (args.title !== undefined) updates.title = args.title;
    if (args.durationMinutes !== undefined) updates.durationMinutes = args.durationMinutes;
    if (args.exercises !== undefined) updates.exercises = args.exercises;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.programmeId !== undefined) updates.programmeId = args.programmeId;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "workouts",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Workout not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "workouts",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

// ── summary ──────────────────────────────────────────

export const summary = query({
  args: {
    weekStart: v.string(), // "YYYY-MM-DD" (Monday)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Calculate week end (Sunday)
    const start = new Date(args.weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const weekEnd = end.toISOString().split("T")[0];

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_userId_workoutDate", (q) =>
        q.eq("userId", userId).gte("workoutDate", args.weekStart).lte("workoutDate", weekEnd),
      )
      .collect();

    const totalDurationMinutes = workouts.reduce(
      (sum, w) => sum + (w.durationMinutes ?? 0),
      0,
    );

    const byType: Record<string, number> = {};
    for (const w of workouts) {
      byType[w.type] = (byType[w.type] ?? 0) + 1;
    }

    return {
      weekStart: args.weekStart,
      weekEnd,
      totalWorkouts: workouts.length,
      totalDurationMinutes,
      byType,
      workouts,
    };
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    type: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    programmeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("workouts")
      .withIndex("by_userId_workoutDate", (q) =>
        q.eq("userId", args.userId),
      )
      .order("desc")
      .collect();

    if (args.from) {
      results = results.filter((w) => w.workoutDate >= args.from!);
    }
    if (args.to) {
      results = results.filter((w) => w.workoutDate <= args.to!);
    }
    if (args.type) {
      results = results.filter((w) => w.type === args.type);
    }
    if (args.programmeId) {
      results = results.filter((w) => w.programmeId === args.programmeId);
    }

    return { data: results, count: results.length };
  },
});

export const _get = internalQuery({
  args: {
    userId: v.id("users"),
    id: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.id);
    if (!workout || workout.userId !== args.userId) return null;
    return workout;
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    workoutDate: v.string(),
    type: v.string(),
    title: v.string(),
    durationMinutes: v.optional(v.float64()),
    exercises: v.optional(v.array(exerciseValidator)),
    notes: v.optional(v.string()),
    programmeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const workoutId = await ctx.db.insert("workouts", {
      userId: args.userId,
      workoutDate: args.workoutDate,
      type: args.type,
      title: args.title,
      durationMinutes: args.durationMinutes,
      exercises: args.exercises,
      notes: args.notes,
      programmeId: args.programmeId as any,
      updatedAt: now,
    });

    const workout = await ctx.db.get(workoutId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "workouts",
      recordId: workoutId,
      beforeData: null,
      afterData: workout,
    });

    return workout;
  },
});

export const _update = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("workouts"),
    workoutDate: v.optional(v.string()),
    type: v.optional(v.string()),
    title: v.optional(v.string()),
    durationMinutes: v.optional(v.float64()),
    exercises: v.optional(v.array(exerciseValidator)),
    notes: v.optional(v.string()),
    programmeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Workout not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.workoutDate !== undefined) updates.workoutDate = args.workoutDate;
    if (args.type !== undefined) updates.type = args.type;
    if (args.title !== undefined) updates.title = args.title;
    if (args.durationMinutes !== undefined) updates.durationMinutes = args.durationMinutes;
    if (args.exercises !== undefined) updates.exercises = args.exercises;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.programmeId !== undefined) updates.programmeId = args.programmeId;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "workouts",
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
    id: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Workout not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "workouts",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

export const _summary = internalQuery({
  args: {
    userId: v.id("users"),
    weekStart: v.string(),
  },
  handler: async (ctx, args) => {
    const start = new Date(args.weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const weekEnd = end.toISOString().split("T")[0];

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_userId_workoutDate", (q) =>
        q.eq("userId", args.userId).gte("workoutDate", args.weekStart).lte("workoutDate", weekEnd),
      )
      .collect();

    const totalDurationMinutes = workouts.reduce(
      (sum, w) => sum + (w.durationMinutes ?? 0),
      0,
    );

    const byType: Record<string, number> = {};
    for (const w of workouts) {
      byType[w.type] = (byType[w.type] ?? 0) + 1;
    }

    return {
      weekStart: args.weekStart,
      weekEnd,
      totalWorkouts: workouts.length,
      totalDurationMinutes,
      byType,
      workouts,
    };
  },
});
