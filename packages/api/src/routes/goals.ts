import { Hono } from 'hono';
import { eq, and, count, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { goals, tasks } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import { createGoalSchema, updateGoalSchema } from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET / - list goals, optional ?status= and ?quarter= filters
app.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const quarter = c.req.query('quarter');

  const conditions = [eq(goals.user_id, user.id)];
  if (status) {
    conditions.push(eq(goals.status, status));
  }
  if (quarter) {
    conditions.push(eq(goals.quarter, quarter));
  }

  const rows = await db
    .select()
    .from(goals)
    .where(and(...conditions));

  return c.json({ data: rows, count: rows.length });
});

// POST / - create goal
app.post('/', async (c) => {
  const user = c.get('user');
  const body = createGoalSchema.parse(await c.req.json());

  const [created] = await db
    .insert(goals)
    .values({ ...body, user_id: user.id })
    .returning();

  await logMutation(user.id, 'create', 'goals', created.id, null, created);

  return c.json({ data: created }, 201);
});

// GET /:id - get goal with its tasks
app.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.user_id, user.id)));

  if (!goal) {
    return c.json({ error: 'Goal not found' }, 404);
  }

  const goalTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.goal_id, id), eq(tasks.user_id, user.id)));

  return c.json({ data: { ...goal, tasks: goalTasks } });
});

// PATCH /:id - update goal
app.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = updateGoalSchema.parse(await c.req.json());

  const [existing] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Goal not found' }, 404);
  }

  // If status is being set to completed, set completed_at
  const updates: Record<string, unknown> = { ...body };
  if (body.status === 'completed') {
    updates.completed_at = new Date();
  }

  const [updated] = await db
    .update(goals)
    .set(updates)
    .where(and(eq(goals.id, id), eq(goals.user_id, user.id)))
    .returning();

  await logMutation(user.id, 'update', 'goals', id, existing, updated);

  return c.json({ data: updated });
});

// DELETE /:id - delete goal
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const [existing] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Goal not found' }, 404);
  }

  await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.user_id, user.id)));

  await logMutation(user.id, 'delete', 'goals', id, existing, null);

  return c.json({ data: { id } });
});

// GET /:id/health - compute goal health
app.get('/:id/health', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.user_id, user.id)));

  if (!goal) {
    return c.json({ error: 'Goal not found' }, 404);
  }

  const [totalResult] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(eq(tasks.goal_id, id), eq(tasks.user_id, user.id)));

  const total = totalResult.value;

  if (total === 0) {
    return c.json({
      data: {
        goal_id: id,
        total_tasks: 0,
        done_tasks: 0,
        velocity: 0,
        status: 'unknown' as const,
      },
    });
  }

  const [doneResult] = await db
    .select({ value: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.goal_id, id),
        eq(tasks.user_id, user.id),
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

  return c.json({
    data: {
      goal_id: id,
      total_tasks: total,
      done_tasks: done,
      velocity: Math.round(velocity * 100) / 100,
      status,
    },
  });
});

export default app;
