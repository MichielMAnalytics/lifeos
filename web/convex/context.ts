// "Right now" snapshot — the deterministic answer to "what time is it /
// what's happening / what's next". Used by the Life Coach via `lifeos
// context now` so it never has to do timezone math or guess.
//
// Returns:
//   - now (epoch ms) + the user's timezone
//   - the next pending reminder (with minutesUntil)
//   - the active task (oldest todo, due today or earlier)
//   - today's day-plan blocks
//
// Pure read — no writes, no fetches.

import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

interface ContextSnapshot {
  now: number;
  timezone: string;
  nextReminder?: { id: Id<"reminders">; title: string; scheduledAt: number; minutesUntil: number };
  activeTask?: { id: Id<"tasks">; title: string; dueDate?: string };
  todaysPlanBlocks?: Array<{ start: string; end: string; label: string; type: string; taskId?: string }>;
}

export const now = query({
  args: {},
  handler: async (ctx): Promise<ContextSnapshot> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await build(ctx, userId);
  },
});

export const _now = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<ContextSnapshot> => {
    return await build(ctx, args.userId);
  },
});

async function build(
  ctx: { db: { get: (id: Id<"users">) => Promise<{ timezone?: string } | null>; query: any } },
  userId: Id<"users">,
): Promise<ContextSnapshot> {
  const user = await ctx.db.get(userId);
  const timezone = user?.timezone ?? "UTC";
  const nowMs = Date.now();

  // Next pending reminder — index already sorts by status+scheduledAt.
  const upcoming = await ctx.db
    .query("reminders")
    .withIndex("by_status_scheduledAt", (q: any) =>
      q.eq("status", "pending").gt("scheduledAt", nowMs),
    )
    .take(20);
  const mine = upcoming.filter((r: any) => r.userId === userId);
  mine.sort((a: any, b: any) => a.scheduledAt - b.scheduledAt);
  const next = mine[0];

  // Oldest open task with a due date today or earlier (≈ "what should I be
  // doing right now"). Ignores tasks without due dates so we don't surface
  // someday/maybe items as "active".
  const todoTasks = await ctx.db
    .query("tasks")
    .withIndex("by_userId_status", (q: any) => q.eq("userId", userId).eq("status", "todo"))
    .take(200);
  const today = new Date(nowMs);
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const dueOrOverdue = todoTasks
    .filter((t: any) => t.dueDate && t.dueDate <= todayIso)
    .sort((a: any, b: any) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const activeTask = dueOrOverdue[0];

  // Today's day plan (if any).
  const plan = await ctx.db
    .query("dayPlans")
    .withIndex("by_userId_planDate", (q: any) => q.eq("userId", userId).eq("planDate", todayIso))
    .unique();

  return {
    now: nowMs,
    timezone,
    nextReminder: next
      ? {
          id: next._id,
          title: next.title,
          scheduledAt: next.scheduledAt,
          minutesUntil: Math.max(0, Math.round((next.scheduledAt - nowMs) / 60_000)),
        }
      : undefined,
    activeTask: activeTask
      ? { id: activeTask._id, title: activeTask.title, dueDate: activeTask.dueDate }
      : undefined,
    todaysPlanBlocks: plan?.schedule,
  };
}
