import { Hono } from 'hono';
import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tasks } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import {
  createTaskSchema,
  updateTaskSchema,
  bulkCompleteSchema,
} from '@lifeos/shared';

type AuthEnv = {
  Variables: {
    user: AuthUser;
  };
};

const app = new Hono<AuthEnv>();

// All task routes require authentication
app.use(apiKeyAuth);

// ── Helper: get today's date as YYYY-MM-DD in user's timezone ──

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function weekFromNowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

// ── GET / ─────────────────────────────────────────────

app.get('/', async (c) => {
  const user = c.get('user');

  const status = c.req.query('status') ?? 'todo';
  const due = c.req.query('due') ?? 'all';
  const projectId = c.req.query('project_id');
  const goalId = c.req.query('goal_id');

  // Build conditions array
  const conditions = [eq(tasks.user_id, user.id)];

  // Status filter
  if (status !== 'all') {
    conditions.push(eq(tasks.status, status));
  }

  // Due date filter
  const today = todayStr();
  switch (due) {
    case 'today':
      conditions.push(eq(tasks.due_date, today));
      break;
    case 'tomorrow':
      conditions.push(eq(tasks.due_date, tomorrowStr()));
      break;
    case 'week':
      conditions.push(gte(tasks.due_date, today));
      conditions.push(lte(tasks.due_date, weekFromNowStr()));
      break;
    case 'overdue':
      conditions.push(sql`${tasks.due_date} < ${today}`);
      conditions.push(eq(tasks.status, 'todo'));
      break;
    // 'all' - no date filter
  }

  // Optional relationship filters
  if (projectId) {
    conditions.push(eq(tasks.project_id, projectId));
  }
  if (goalId) {
    conditions.push(eq(tasks.goal_id, goalId));
  }

  const result = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(sql`${tasks.due_date} ASC NULLS LAST`, tasks.position);

  return c.json({ data: result, count: result.length });
});

// ── POST / ────────────────────────────────────────────

app.post('/', async (c) => {
  const user = c.get('user');
  const body = createTaskSchema.parse(await c.req.json());

  const [task] = await db
    .insert(tasks)
    .values({
      user_id: user.id,
      title: body.title,
      notes: body.notes ?? null,
      due_date: body.due_date ?? null,
      project_id: body.project_id ?? null,
      goal_id: body.goal_id ?? null,
    })
    .returning();

  await logMutation(user.id, 'create', 'tasks', task.id, null, task);

  return c.json({ data: task }, 201);
});

// ── POST /bulk-complete ───────────────────────────────
// (Must be defined before /:id to avoid route conflict)

app.post('/bulk-complete', async (c) => {
  const user = c.get('user');
  const body = bulkCompleteSchema.parse(await c.req.json());

  const now = new Date();
  const completed: string[] = [];

  for (const id of body.ids) {
    // Fetch current state
    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.user_id, user.id)));

    if (!existing) continue;

    const [updated] = await db
      .update(tasks)
      .set({
        status: 'done',
        completed_at: now,
        updated_at: now,
      })
      .where(and(eq(tasks.id, id), eq(tasks.user_id, user.id)))
      .returning();

    await logMutation(user.id, 'update', 'tasks', id, existing, updated);
    completed.push(id);
  }

  return c.json({ data: { completed: completed.length } });
});

// ── GET /:id ──────────────────────────────────────────

app.get('/:id', async (c) => {
  const user = c.get('user');
  const taskId = c.req.param('id');

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.user_id, user.id)));

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({ data: task });
});

// ── PATCH /:id ────────────────────────────────────────

app.patch('/:id', async (c) => {
  const user = c.get('user');
  const taskId = c.req.param('id');
  const body = updateTaskSchema.parse(await c.req.json());

  // Fetch current state for mutation log
  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const [updated] = await db
    .update(tasks)
    .set({
      ...body,
      updated_at: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.user_id, user.id)))
    .returning();

  await logMutation(user.id, 'update', 'tasks', taskId, existing, updated);

  return c.json({ data: updated });
});

// ── DELETE /:id ───────────────────────────────────────

app.delete('/:id', async (c) => {
  const user = c.get('user');
  const taskId = c.req.param('id');

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.user_id, user.id)));

  await logMutation(user.id, 'delete', 'tasks', taskId, existing, null);

  return c.json({ data: { deleted: true } });
});

// ── POST /:id/complete ────────────────────────────────

app.post('/:id/complete', async (c) => {
  const user = c.get('user');
  const taskId = c.req.param('id');

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const now = new Date();
  const [updated] = await db
    .update(tasks)
    .set({
      status: 'done',
      completed_at: now,
      updated_at: now,
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.user_id, user.id)))
    .returning();

  await logMutation(user.id, 'update', 'tasks', taskId, existing, updated);

  return c.json({ data: updated });
});

export default app;
