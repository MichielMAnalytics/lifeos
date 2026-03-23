import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { weeklyPlans } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import { upsertWeeklyPlanSchema } from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET / - list weekly plans, optional ?current=true returns current week only
app.get('/', async (c) => {
  const user = c.get('user');
  const current = c.req.query('current');

  if (current === 'true') {
    // Get the Monday of the current week
    const [row] = await db
      .select()
      .from(weeklyPlans)
      .where(
        and(
          eq(weeklyPlans.user_id, user.id),
          eq(weeklyPlans.week_start, sql`date_trunc('week', CURRENT_DATE)::date`),
        ),
      );

    if (!row) {
      return c.json({ error: 'No plan for current week' }, 404);
    }

    return c.json({ data: row });
  }

  const rows = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.user_id, user.id));

  return c.json({ data: rows, count: rows.length });
});

// GET /:week_start - get by week start date
app.get('/:week_start', async (c) => {
  const user = c.get('user');
  const weekStart = c.req.param('week_start');

  const [plan] = await db
    .select()
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.user_id, user.id),
        eq(weeklyPlans.week_start, weekStart),
      ),
    );

  if (!plan) {
    return c.json({ error: 'Weekly plan not found' }, 404);
  }

  return c.json({ data: plan });
});

// PUT /:week_start - upsert weekly plan
app.put('/:week_start', async (c) => {
  const user = c.get('user');
  const weekStart = c.req.param('week_start');
  const body = upsertWeeklyPlanSchema.parse(await c.req.json());

  // Check if plan already exists (for mutation logging)
  const [existing] = await db
    .select()
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.user_id, user.id),
        eq(weeklyPlans.week_start, weekStart),
      ),
    );

  const [upserted] = await db
    .insert(weeklyPlans)
    .values({
      ...body,
      user_id: user.id,
      week_start: weekStart,
    })
    .onConflictDoUpdate({
      target: [weeklyPlans.user_id, weeklyPlans.week_start],
      set: body,
    })
    .returning();

  await logMutation(
    user.id,
    existing ? 'update' : 'create',
    'weekly_plans',
    upserted.id,
    existing ?? null,
    upserted,
  );

  return c.json({ data: upserted }, existing ? 200 : 201);
});

export default app;
