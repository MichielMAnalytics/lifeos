import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { dayPlans } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import { upsertDayPlanSchema } from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET /:date - get plan for date
app.get('/:date', async (c) => {
  const user = c.get('user');
  const date = c.req.param('date');

  const [plan] = await db
    .select()
    .from(dayPlans)
    .where(and(eq(dayPlans.user_id, user.id), eq(dayPlans.plan_date, date)));

  if (!plan) {
    return c.json({ error: 'Day plan not found' }, 404);
  }

  return c.json({ data: plan });
});

// PUT /:date - upsert day plan
app.put('/:date', async (c) => {
  const user = c.get('user');
  const date = c.req.param('date');
  const body = upsertDayPlanSchema.parse(await c.req.json());

  // Check if plan already exists (for mutation logging)
  const [existing] = await db
    .select()
    .from(dayPlans)
    .where(and(eq(dayPlans.user_id, user.id), eq(dayPlans.plan_date, date)));

  const [upserted] = await db
    .insert(dayPlans)
    .values({
      ...body,
      user_id: user.id,
      plan_date: date,
    })
    .onConflictDoUpdate({
      target: [dayPlans.user_id, dayPlans.plan_date],
      set: body,
    })
    .returning();

  await logMutation(
    user.id,
    existing ? 'update' : 'create',
    'day_plans',
    upserted.id,
    existing ?? null,
    upserted,
  );

  return c.json({ data: upserted }, existing ? 200 : 201);
});

// PATCH /:date - partial update
app.patch('/:date', async (c) => {
  const user = c.get('user');
  const date = c.req.param('date');
  const body = upsertDayPlanSchema.partial().parse(await c.req.json());

  const [existing] = await db
    .select()
    .from(dayPlans)
    .where(and(eq(dayPlans.user_id, user.id), eq(dayPlans.plan_date, date)));

  if (!existing) {
    return c.json({ error: 'Day plan not found' }, 404);
  }

  const [updated] = await db
    .update(dayPlans)
    .set(body)
    .where(and(eq(dayPlans.user_id, user.id), eq(dayPlans.plan_date, date)))
    .returning();

  await logMutation(user.id, 'update', 'day_plans', updated.id, existing, updated);

  return c.json({ data: updated });
});

export default app;
