import { Hono } from 'hono';
import { eq, and, lt, lte, gte, sql, count, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  tasks,
  goals,
  dayPlans,
  weeklyPlans,
  journals,
  wins,
  reminders,
  projects,
} from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// Helper: compute goal health for a single goal
async function computeGoalHealth(goalId: string, userId: string) {
  const [totalResult] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(eq(tasks.goal_id, goalId), eq(tasks.user_id, userId)));

  const total = totalResult.value;

  if (total === 0) {
    return { total_tasks: 0, done_tasks: 0, velocity: 0, status: 'unknown' as const };
  }

  const [doneResult] = await db
    .select({ value: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.goal_id, goalId),
        eq(tasks.user_id, userId),
        eq(tasks.status, 'done'),
      ),
    );

  const done = doneResult.value;
  const velocity = done / total;

  let status: 'on_track' | 'at_risk' | 'off_track';
  if (velocity > 0.7) {
    status = 'on_track';
  } else if (velocity > 0.4) {
    status = 'at_risk';
  } else {
    status = 'off_track';
  }

  return {
    total_tasks: total,
    done_tasks: done,
    velocity: Math.round(velocity * 100) / 100,
    status,
  };
}

// POST /morning-briefing
app.post('/morning-briefing', async (c) => {
  const user = c.get('user');

  // Overdue tasks: status=todo and due_date < today
  const overdueTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.user_id, user.id),
        eq(tasks.status, 'todo'),
        lt(tasks.due_date, sql`CURRENT_DATE`),
      ),
    );

  // Today's tasks: due_date = today
  const todayTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.user_id, user.id),
        eq(tasks.due_date, sql`CURRENT_DATE`),
      ),
    );

  // Today's day plan
  const [todayPlan] = await db
    .select()
    .from(dayPlans)
    .where(
      and(
        eq(dayPlans.user_id, user.id),
        eq(dayPlans.plan_date, sql`CURRENT_DATE`),
      ),
    );

  // Goals with health at_risk or off_track
  const activeGoals = await db
    .select()
    .from(goals)
    .where(and(eq(goals.user_id, user.id), eq(goals.status, 'active')));

  const atRiskGoals = [];
  for (const goal of activeGoals) {
    const health = await computeGoalHealth(goal.id, user.id);
    if (health.status === 'at_risk' || health.status === 'off_track') {
      atRiskGoals.push({ ...goal, health });
    }
  }

  return c.json({
    data: {
      overdue_tasks: overdueTasks,
      today_tasks: todayTasks,
      today_plan: todayPlan ?? null,
      at_risk_goals: atRiskGoals,
    },
  });
});

// POST /daily-review
app.post('/daily-review', async (c) => {
  const user = c.get('user');

  // Today's day plan
  const [todayPlan] = await db
    .select()
    .from(dayPlans)
    .where(
      and(
        eq(dayPlans.user_id, user.id),
        eq(dayPlans.plan_date, sql`CURRENT_DATE`),
      ),
    );

  // Tasks completed today
  const completedToday = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.user_id, user.id),
        eq(tasks.status, 'done'),
        gte(tasks.completed_at, sql`CURRENT_DATE::timestamptz`),
        lt(tasks.completed_at, sql`(CURRENT_DATE + 1)::timestamptz`),
      ),
    );

  // Today's journal
  const [todayJournal] = await db
    .select()
    .from(journals)
    .where(
      and(
        eq(journals.user_id, user.id),
        eq(journals.entry_date, sql`CURRENT_DATE`),
      ),
    );

  // Today's wins
  const todayWins = await db
    .select()
    .from(wins)
    .where(
      and(
        eq(wins.user_id, user.id),
        eq(wins.entry_date, sql`CURRENT_DATE`),
      ),
    );

  return c.json({
    data: {
      today_plan: todayPlan ?? null,
      completed_today: completedToday,
      today_journal: todayJournal ?? null,
      today_wins: todayWins,
    },
  });
});

// POST /weekly-review
app.post('/weekly-review', async (c) => {
  const user = c.get('user');

  // Current weekly plan (most recent week_start <= today)
  const [currentWeeklyPlan] = await db
    .select()
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.user_id, user.id),
        lte(weeklyPlans.week_start, sql`CURRENT_DATE`),
      ),
    )
    .orderBy(desc(weeklyPlans.week_start))
    .limit(1);

  // Tasks completed this week (monday through today)
  const completedThisWeek = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.user_id, user.id),
        eq(tasks.status, 'done'),
        gte(tasks.completed_at, sql`date_trunc('week', CURRENT_DATE)::timestamptz`),
      ),
    );

  // Active goals
  const activeGoals = await db
    .select()
    .from(goals)
    .where(and(eq(goals.user_id, user.id), eq(goals.status, 'active')));

  // This week's journals
  const weekJournals = await db
    .select()
    .from(journals)
    .where(
      and(
        eq(journals.user_id, user.id),
        gte(journals.entry_date, sql`date_trunc('week', CURRENT_DATE)::date`),
        lte(journals.entry_date, sql`CURRENT_DATE`),
      ),
    );

  // This week's wins
  const weekWins = await db
    .select()
    .from(wins)
    .where(
      and(
        eq(wins.user_id, user.id),
        gte(wins.entry_date, sql`date_trunc('week', CURRENT_DATE)::date`),
        lte(wins.entry_date, sql`CURRENT_DATE`),
      ),
    );

  return c.json({
    data: {
      weekly_plan: currentWeeklyPlan ?? null,
      completed_this_week: completedThisWeek,
      active_goals: activeGoals,
      week_journals: weekJournals,
      week_wins: weekWins,
    },
  });
});

// POST /overdue-triage
app.post('/overdue-triage', async (c) => {
  const user = c.get('user');

  // All overdue tasks with goal/project context
  const overdueTasks = await db
    .select({
      task: tasks,
      project: projects,
      goal: goals,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.project_id, projects.id))
    .leftJoin(goals, eq(tasks.goal_id, goals.id))
    .where(
      and(
        eq(tasks.user_id, user.id),
        eq(tasks.status, 'todo'),
        lt(tasks.due_date, sql`CURRENT_DATE`),
      ),
    );

  return c.json({ data: { overdue_tasks: overdueTasks } });
});

// POST /reminder-check
app.post('/reminder-check', async (c) => {
  const user = c.get('user');

  const dueReminders = await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.user_id, user.id),
        eq(reminders.status, 'pending'),
        lte(reminders.scheduled_at, sql`NOW()`),
      ),
    );

  return c.json({ data: { due_reminders: dueReminders } });
});

// POST /goal-health
app.post('/goal-health', async (c) => {
  const user = c.get('user');

  const activeGoals = await db
    .select()
    .from(goals)
    .where(and(eq(goals.user_id, user.id), eq(goals.status, 'active')));

  const goalsWithHealth = [];
  for (const goal of activeGoals) {
    const health = await computeGoalHealth(goal.id, user.id);
    goalsWithHealth.push({ ...goal, health });
  }

  return c.json({ data: { goals: goalsWithHealth } });
});

export default app;
