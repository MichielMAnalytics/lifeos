/**
 * Seed function for local development ONLY.
 * Populates dummy data across all entity types.
 * Run with: npx convex run seed:seedAll
 *
 * DO NOT deploy to production.
 */
import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function mondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated — sign in first");

    const now = Date.now();
    const today = todayISO();

    // ── Goals ──────────────────────────────────────
    const goal1 = await ctx.db.insert("goals", {
      userId,
      title: "Ship LifeOS v1.0",
      description: "Complete the core LifeOS product and launch publicly",
      status: "active",
      targetDate: "2026-06-30",
      quarter: "2026-Q2",
    });

    const goal2 = await ctx.db.insert("goals", {
      userId,
      title: "Run a half marathon",
      description: "Train consistently and complete a half marathon",
      status: "active",
      targetDate: "2026-09-15",
      quarter: "2026-Q3",
    });

    const goal3 = await ctx.db.insert("goals", {
      userId,
      title: "Read 24 books this year",
      description: "Two books per month — mix of business and personal growth",
      status: "active",
      quarter: "2026-Q2",
    });

    // ── Projects ──────────────────────────────────
    const proj1 = await ctx.db.insert("projects", {
      userId,
      title: "Dashboard Redesign",
      description: "Overhaul the LifeOS dashboard with new sections and presets",
      status: "active",
    });

    const proj2 = await ctx.db.insert("projects", {
      userId,
      title: "Health Tab",
      description: "Workouts, programmes, and nutrition tracking",
      status: "active",
    });

    // ── Tasks ──────────────────────────────────────
    const tasks = [
      { title: "Finalize health tab UI", dueDate: today, status: "todo", goalId: goal1, projectId: proj2, position: 1 },
      { title: "Write CLI tests for workout commands", dueDate: daysAgo(-1), status: "todo", goalId: goal1, projectId: proj2, position: 2 },
      { title: "Design nutrition plan schema", dueDate: daysAgo(-2), status: "todo", goalId: goal1, projectId: proj2, position: 3 },
      { title: "Review PR feedback from Michiel", dueDate: today, status: "todo", goalId: goal1, projectId: proj1, position: 4 },
      { title: "Morning 5K run", dueDate: today, status: "done", goalId: goal2, position: 5 },
      { title: "Read chapter 3 of Atomic Habits", dueDate: today, status: "done", goalId: goal3, position: 6 },
      { title: "Deploy dashboard v0.7", dueDate: daysAgo(1), status: "done", goalId: goal1, projectId: proj1, position: 7 },
      { title: "Fix sidebar navigation bug", dueDate: daysAgo(2), status: "done", goalId: goal1, projectId: proj1, position: 8 },
      { title: "Plan Dubai trip logistics", dueDate: daysAgo(-3), status: "todo", position: 9 },
      { title: "Prepare weekly review template", dueDate: daysAgo(3), status: "dropped", position: 10 },
    ];

    for (const t of tasks) {
      await ctx.db.insert("tasks", {
        userId,
        title: t.title,
        dueDate: t.dueDate,
        status: t.status,
        goalId: t.goalId,
        projectId: t.projectId,
        position: t.position,
        updatedAt: now,
        completedAt: t.status === "done" ? now : undefined,
      });
    }

    // ── Journals ──────────────────────────────────
    const journals = [
      {
        entryDate: today,
        mit: "Finalize health tab UI",
        p1: "Review PR feedback",
        p2: "Plan Dubai trip",
        notes: "Good day so far. Started the morning with a run which set the tone for the rest of the day. Got deep focus time on the health tab — the nutrition plan with macros rings looks great.\n\nHad a productive sync with Michiel about the roadmap. We aligned on shipping the health tab this week and the finance tab next.\n\nNeed to remember to book the Dubai flights before prices go up. Also thinking about how to integrate Whoop data into the health tab eventually.",
        wins: ["Completed the nutrition plan section with macro ring charts", "5K morning run in under 25 minutes"],
      },
      {
        entryDate: daysAgo(1),
        mit: "Deploy dashboard v0.7",
        p1: "Fix sidebar navigation",
        p2: "Write journal timeline redesign",
        notes: "Deployed v0.7 successfully — the new journal timeline with week grouping looks so much cleaner than before. The wins section at the bottom with the + button is exactly what I wanted.\n\nPlayed padel in the evening with Nick and Vince. Good game but they were on their phones during breaks which killed the vibe a bit. Need to set boundaries around that.\n\nRealized I should be more intentional about deep work blocks. The scattered approach isn't working.",
        wins: ["Shipped dashboard v0.7 with zero issues", "Journal timeline redesign complete"],
      },
      {
        entryDate: daysAgo(2),
        mit: "Fix sidebar navigation bug",
        p1: "Design resource views",
        notes: "Frustrating morning — the sidebar bug took longer than expected because it was a CSS specificity issue buried three components deep. Finally fixed it after lunch.\n\nSpent the afternoon on resource views — added sort, group, and three view modes. The table view turned out cleaner than expected.",
        wins: ["Squashed the sidebar navigation bug", "Resource views with sort/group/view modes"],
      },
    ];

    for (const j of journals) {
      await ctx.db.insert("journals", {
        userId,
        entryDate: j.entryDate,
        mit: j.mit,
        p1: j.p1,
        p2: j.p2,
        notes: j.notes,
        wins: j.wins ?? [],
        updatedAt: now,
      });
    }

    // ── Wins ──────────────────────────────────────
    const wins = [
      { content: "Completed the nutrition plan section with macro ring charts", entryDate: today },
      { content: "5K morning run in under 25 minutes", entryDate: today },
      { content: "Shipped dashboard v0.7 with zero issues", entryDate: daysAgo(1) },
      { content: "Had a great deep conversation with Faye about life goals", entryDate: daysAgo(2) },
    ];
    for (const w of wins) {
      await ctx.db.insert("wins", { userId, content: w.content, entryDate: w.entryDate });
    }

    // ── Ideas ──────────────────────────────────────
    const ideas = [
      { content: "Build a habit tracker that integrates with the daily plan — each habit gets a streak counter", actionability: "high", nextStep: "Design the schema for habits table" },
      { content: "What if LifeOS could generate a weekly email digest summarizing your progress?", actionability: "medium", nextStep: "Research email sending from Convex" },
      { content: "Add a 'focus mode' that hides everything except the current task and a timer", actionability: "medium" },
      { content: "Integration with Readwise to auto-import book highlights as resources", actionability: "low" },
      { content: "A 'Life Score' composite metric based on consistency across all areas", actionability: "high", nextStep: "Define the scoring algorithm" },
    ];
    for (const idea of ideas) {
      await ctx.db.insert("ideas", {
        userId,
        content: idea.content,
        actionability: idea.actionability,
        nextStep: idea.nextStep,
      });
    }

    // ── Thoughts ──────────────────────────────────
    const thoughts = [
      { title: "On deep work", content: "I'm most productive in 90-minute blocks with no distractions. The phone needs to be in another room. Music helps but only instrumental — lyrics break the flow." },
      { title: "Reflection on relationships", content: "Noticed I'm better at initiating plans than maintaining regular contact. Should build a simple system for staying in touch with important people." },
      { content: "The best software feels like it was designed for exactly one person — you. That's what LifeOS should feel like." },
    ];
    for (const t of thoughts) {
      await ctx.db.insert("thoughts", {
        userId,
        content: t.content,
        title: t.title,
      });
    }

    // ── Resources ─────────────────────────────────
    const resources = [
      { title: "Atomic Habits by James Clear", content: "Key insight: focus on identity-based habits rather than outcome-based goals. Instead of 'I want to run a marathon', think 'I am a runner'.", type: "book" },
      { title: "Convex Documentation", content: "Real-time backend with automatic reactivity. Great for building collaborative apps.", type: "tool", url: "https://docs.convex.dev" },
      { title: "The Art of Focus", content: "Cal Newport's framework for deep work applied to everyday productivity.", type: "article" },
      { title: "Figma Design System Template", content: "Clean design system with components for building consistent UIs.", type: "tool" },
      { title: "Ali Abdaal — How to Study for Exams", content: "Active recall and spaced repetition are the two most effective study techniques.", type: "video" },
    ];
    for (const r of resources) {
      await ctx.db.insert("resources", {
        userId,
        title: r.title,
        content: r.content,
        type: r.type,
        url: r.url,
      });
    }

    // ── Day Plan ──────────────────────────────────
    await ctx.db.insert("dayPlans", {
      userId,
      planDate: today,
      wakeTime: "06:30",
      schedule: [
        { start: "06:30", end: "07:00", label: "Morning run", type: "health" },
        { start: "07:00", end: "07:30", label: "Shower + breakfast", type: "personal" },
        { start: "07:30", end: "10:00", label: "Deep work: Health tab", type: "work" },
        { start: "10:00", end: "10:15", label: "Break", type: "break" },
        { start: "10:15", end: "12:00", label: "Code review + PR feedback", type: "work" },
        { start: "12:00", end: "13:00", label: "Lunch", type: "personal" },
        { start: "13:00", end: "15:00", label: "Deep work: Nutrition plan", type: "work" },
        { start: "15:00", end: "16:00", label: "Admin + Dubai planning", type: "personal" },
        { start: "16:00", end: "17:00", label: "Reading", type: "personal" },
      ],
      overflow: [],
      mitDone: false,
      p1Done: false,
      p2Done: false,
    });

    // ── Weekly Plan ──────────────────────────────
    const weekStart = mondayOfWeek(new Date());
    await ctx.db.insert("weeklyPlans", {
      userId,
      weekStart,
      theme: "Ship the health tab and prepare for Dubai",
      goals: [
        { title: "Complete health tab with nutrition tracking", status: "in_progress" },
        { title: "Book Dubai flights and visa", status: "not_started" },
        { title: "Run 3x this week", status: "in_progress" },
      ],
    });

    // ── Workouts ──────────────────────────────────
    const workouts = [
      {
        workoutDate: today,
        type: "cardio",
        title: "Morning 5K Run",
        durationMinutes: 24,
        notes: "Felt strong. Negative split — second half faster than the first.",
      },
      {
        workoutDate: daysAgo(1),
        type: "strength",
        title: "Upper Body Push",
        durationMinutes: 55,
        exercises: [
          { name: "Bench Press", sets: 4, reps: 8, weight: 80, unit: "kg" },
          { name: "Overhead Press", sets: 3, reps: 10, weight: 40, unit: "kg" },
          { name: "Incline Dumbbell Press", sets: 3, reps: 12, weight: 30, unit: "kg" },
          { name: "Lateral Raises", sets: 3, reps: 15, weight: 12, unit: "kg" },
          { name: "Tricep Pushdowns", sets: 3, reps: 12, weight: 25, unit: "kg" },
        ],
      },
      {
        workoutDate: daysAgo(2),
        type: "cardio",
        title: "Interval Sprints",
        durationMinutes: 30,
        notes: "8x400m intervals with 90s rest. Averaged 1:35 per rep.",
      },
      {
        workoutDate: daysAgo(3),
        type: "strength",
        title: "Lower Body",
        durationMinutes: 60,
        exercises: [
          { name: "Squats", sets: 4, reps: 6, weight: 100, unit: "kg" },
          { name: "Romanian Deadlift", sets: 3, reps: 10, weight: 80, unit: "kg" },
          { name: "Leg Press", sets: 3, reps: 12, weight: 150, unit: "kg" },
          { name: "Calf Raises", sets: 4, reps: 15, weight: 60, unit: "kg" },
        ],
      },
      {
        workoutDate: daysAgo(5),
        type: "mobility",
        title: "Yoga Flow",
        durationMinutes: 45,
        notes: "Full body stretch session. Hip flexors still tight.",
      },
    ];

    for (const w of workouts) {
      await ctx.db.insert("workouts", {
        userId,
        workoutDate: w.workoutDate,
        type: w.type,
        title: w.title,
        durationMinutes: w.durationMinutes,
        exercises: w.exercises,
        notes: w.notes,
        updatedAt: now,
      });
    }

    // ── Programme ─────────────────────────────────
    await ctx.db.insert("programmes", {
      userId,
      title: "Half Marathon Training Plan",
      description: "16-week progressive running programme building up to 21.1km. 4 runs per week: easy run, intervals, tempo, long run.",
      status: "active",
      startDate: daysAgo(21),
      endDate: "2026-07-20",
      updatedAt: now,
    });

    // ── Reminders ─────────────────────────────────
    await ctx.db.insert("reminders", {
      userId,
      title: "Book Dubai flights",
      body: "Prices are going up — book before end of this week",
      scheduledAt: now + 86400000,
      status: "pending",
      snoozeCount: 0,
    });

    await ctx.db.insert("reminders", {
      userId,
      title: "Weekly review",
      body: "Sunday evening review session",
      scheduledAt: now + 5 * 86400000,
      status: "pending",
      snoozeCount: 0,
    });

    return { success: true, message: "Seed data created successfully" };
  },
});
