import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { todayStr, mondayOfCurrentWeek } from "./lib/helpers";
import { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

// ── Goal health helper ───────────────────────────────

interface GoalHealth {
  totalTasks: number;
  doneTasks: number;
  velocity: number;
  status: "on_track" | "at_risk" | "off_track" | "unknown";
}

async function computeGoalHealth(
  ctx: QueryCtx,
  goalId: Id<"goals">,
  userId: Id<"users">,
): Promise<GoalHealth> {
  const allTasks = await ctx.db
    .query("tasks")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  const goalTasks = allTasks.filter((t) => t.goalId === goalId);
  const total = goalTasks.length;

  if (total === 0) {
    return { totalTasks: 0, doneTasks: 0, velocity: 0, status: "unknown" };
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
    totalTasks: total,
    doneTasks: done,
    velocity: Math.round(velocity * 100) / 100,
    status,
  };
}

// ── morningBriefing ──────────────────────────────────

export const morningBriefing = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const today = todayStr();

    // Overdue tasks: status=todo, dueDate < today
    const todoTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "todo"),
      )
      .collect();

    const overdueTasks = todoTasks.filter(
      (t) => t.dueDate !== undefined && t.dueDate < today,
    );

    // Today's tasks
    const todayTasks = todoTasks.filter((t) => t.dueDate === today);

    // Today's day plan
    const dayPlans = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) =>
        q.eq("userId", userId).eq("planDate", today),
      )
      .collect();
    const todayPlan = dayPlans[0] ?? null;

    // Active goals with health at_risk or off_track
    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "active"),
      )
      .collect();

    const atRiskGoals = [];
    for (const goal of activeGoals) {
      const health = await computeGoalHealth(ctx, goal._id, userId);
      if (health.status === "at_risk" || health.status === "off_track") {
        atRiskGoals.push({ ...goal, health });
      }
    }

    return {
      data: {
        overdueTasks,
        todayTasks,
        todayPlan,
        atRiskGoals,
      },
    };
  },
});

// ── dailyReview ──────────────────────────────────────

export const dailyReview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const today = todayStr();

    // Today's day plan
    const dayPlans = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) =>
        q.eq("userId", userId).eq("planDate", today),
      )
      .collect();
    const todayPlan = dayPlans[0] ?? null;

    // Tasks completed today (completedAt is epoch ms, compare to start/end of today)
    const todayStart = new Date(today + "T00:00:00Z").getTime();
    const todayEnd = todayStart + 86_400_000; // + 24 hours

    const doneTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "done"),
      )
      .collect();

    const completedToday = doneTasks.filter(
      (t) =>
        t.completedAt !== undefined &&
        t.completedAt >= todayStart &&
        t.completedAt < todayEnd,
    );

    // Today's journal entry
    const journals = await ctx.db
      .query("journals")
      .withIndex("by_userId_entryDate", (q) =>
        q.eq("userId", userId).eq("entryDate", today),
      )
      .collect();
    const todayJournal = journals[0] ?? null;

    // Today's wins
    const wins = await ctx.db
      .query("wins")
      .withIndex("by_userId_entryDate", (q) =>
        q.eq("userId", userId).eq("entryDate", today),
      )
      .collect();

    return {
      data: {
        todayPlan,
        completedToday,
        todayJournal,
        todayWins: wins,
      },
    };
  },
});

// ── weeklyReview ─────────────────────────────────────

export const weeklyReview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const today = todayStr();
    const weekStart = mondayOfCurrentWeek();
    const weekStartEpoch = new Date(weekStart + "T00:00:00Z").getTime();

    // Current weekly plan
    const weeklyPlans = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_userId_weekStart", (q) =>
        q.eq("userId", userId).eq("weekStart", weekStart),
      )
      .collect();
    const currentWeeklyPlan = weeklyPlans[0] ?? null;

    // Tasks completed this week
    const doneTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "done"),
      )
      .collect();

    const completedThisWeek = doneTasks.filter(
      (t) => t.completedAt !== undefined && t.completedAt >= weekStartEpoch,
    );

    // Active goals
    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "active"),
      )
      .collect();

    // This week's journal entries (entryDate >= weekStart and <= today)
    const allJournals = await ctx.db
      .query("journals")
      .withIndex("by_userId_entryDate", (q) => q.eq("userId", userId))
      .collect();

    const weekJournals = allJournals.filter(
      (j) => j.entryDate >= weekStart && j.entryDate <= today,
    );

    // This week's wins
    const allWins = await ctx.db
      .query("wins")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const weekWins = allWins.filter(
      (w) => w.entryDate >= weekStart && w.entryDate <= today,
    );

    return {
      data: {
        weeklyPlan: currentWeeklyPlan,
        completedThisWeek,
        activeGoals,
        weekJournals,
        weekWins,
      },
    };
  },
});

// ── overdueTriage ────────────────────────────────────

export const overdueTriage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const today = todayStr();

    const todoTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "todo"),
      )
      .collect();

    const overdueTasks = todoTasks.filter(
      (t) => t.dueDate !== undefined && t.dueDate < today,
    );

    // Enrich with project and goal data
    const enriched = [];
    for (const task of overdueTasks) {
      const project = task.projectId
        ? await ctx.db.get(task.projectId)
        : null;
      const goal = task.goalId ? await ctx.db.get(task.goalId) : null;
      enriched.push({ task, project, goal });
    }

    return { data: { overdueTasks: enriched } };
  },
});

// ── reminderCheck ────────────────────────────────────

export const reminderCheck = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();

    const pendingReminders = await ctx.db
      .query("reminders")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "pending"),
      )
      .collect();

    const dueReminders = pendingReminders.filter(
      (r) => r.scheduledAt <= now,
    );

    return { data: { dueReminders } };
  },
});

// ── goalHealth ───────────────────────────────────────

export const goalHealth = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "active"),
      )
      .collect();

    const goalsWithHealth = [];
    for (const goal of activeGoals) {
      const health = await computeGoalHealth(ctx, goal._id, userId);
      goalsWithHealth.push({ ...goal, health });
    }

    return { data: { goals: goalsWithHealth } };
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _morningBriefing = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = todayStr();

    const todoTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "todo"),
      )
      .collect();

    const overdueTasks = todoTasks.filter(
      (t) => t.dueDate !== undefined && t.dueDate < today,
    );

    const todayTasks = todoTasks.filter((t) => t.dueDate === today);

    const dayPlans = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) =>
        q.eq("userId", args.userId).eq("planDate", today),
      )
      .collect();
    const todayPlan = dayPlans[0] ?? null;

    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active"),
      )
      .collect();

    const atRiskGoals = [];
    for (const goal of activeGoals) {
      const health = await computeGoalHealth(ctx, goal._id, args.userId);
      if (health.status === "at_risk" || health.status === "off_track") {
        atRiskGoals.push({ ...goal, health });
      }
    }

    return {
      data: {
        overdueTasks,
        todayTasks,
        todayPlan,
        atRiskGoals,
      },
    };
  },
});

export const _dailyReview = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = todayStr();

    const dayPlans = await ctx.db
      .query("dayPlans")
      .withIndex("by_userId_planDate", (q) =>
        q.eq("userId", args.userId).eq("planDate", today),
      )
      .collect();
    const todayPlan = dayPlans[0] ?? null;

    const todayStart = new Date(today + "T00:00:00Z").getTime();
    const todayEnd = todayStart + 86_400_000;

    const doneTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "done"),
      )
      .collect();

    const completedToday = doneTasks.filter(
      (t) =>
        t.completedAt !== undefined &&
        t.completedAt >= todayStart &&
        t.completedAt < todayEnd,
    );

    const journals = await ctx.db
      .query("journals")
      .withIndex("by_userId_entryDate", (q) =>
        q.eq("userId", args.userId).eq("entryDate", today),
      )
      .collect();
    const todayJournal = journals[0] ?? null;

    const wins = await ctx.db
      .query("wins")
      .withIndex("by_userId_entryDate", (q) =>
        q.eq("userId", args.userId).eq("entryDate", today),
      )
      .collect();

    return {
      data: {
        todayPlan,
        completedToday,
        todayJournal,
        todayWins: wins,
      },
    };
  },
});

export const _weeklyReview = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = todayStr();
    const weekStart = mondayOfCurrentWeek();
    const weekStartEpoch = new Date(weekStart + "T00:00:00Z").getTime();

    const weeklyPlans = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_userId_weekStart", (q) =>
        q.eq("userId", args.userId).eq("weekStart", weekStart),
      )
      .collect();
    const currentWeeklyPlan = weeklyPlans[0] ?? null;

    const doneTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "done"),
      )
      .collect();

    const completedThisWeek = doneTasks.filter(
      (t) => t.completedAt !== undefined && t.completedAt >= weekStartEpoch,
    );

    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active"),
      )
      .collect();

    const allJournals = await ctx.db
      .query("journals")
      .withIndex("by_userId_entryDate", (q) => q.eq("userId", args.userId))
      .collect();

    const weekJournals = allJournals.filter(
      (j) => j.entryDate >= weekStart && j.entryDate <= today,
    );

    const allWins = await ctx.db
      .query("wins")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const weekWins = allWins.filter(
      (w) => w.entryDate >= weekStart && w.entryDate <= today,
    );

    return {
      data: {
        weeklyPlan: currentWeeklyPlan,
        completedThisWeek,
        activeGoals,
        weekJournals,
        weekWins,
      },
    };
  },
});

export const _overdueTriage = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = todayStr();

    const todoTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "todo"),
      )
      .collect();

    const overdueTasks = todoTasks.filter(
      (t) => t.dueDate !== undefined && t.dueDate < today,
    );

    const enriched = [];
    for (const task of overdueTasks) {
      const project = task.projectId
        ? await ctx.db.get(task.projectId)
        : null;
      const goal = task.goalId ? await ctx.db.get(task.goalId) : null;
      enriched.push({ task, project, goal });
    }

    return { data: { overdueTasks: enriched } };
  },
});

export const _reminderCheck = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const pendingReminders = await ctx.db
      .query("reminders")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending"),
      )
      .collect();

    const dueReminders = pendingReminders.filter(
      (r) => r.scheduledAt <= now,
    );

    return { data: { dueReminders } };
  },
});

export const _goalHealth = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "active"),
      )
      .collect();

    const goalsWithHealth = [];
    for (const goal of activeGoals) {
      const health = await computeGoalHealth(ctx, goal._id, args.userId);
      goalsWithHealth.push({ ...goal, health });
    }

    return { data: { goals: goalsWithHealth } };
  },
});
