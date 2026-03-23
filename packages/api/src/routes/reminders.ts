import { Hono } from 'hono';
import { eq, and, asc, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { reminders } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import {
  createReminderSchema,
  updateReminderSchema,
  snoozeReminderSchema,
} from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET / - list reminders, optional ?status= filter
app.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');

  const conditions = [eq(reminders.user_id, user.id)];
  if (status) {
    conditions.push(eq(reminders.status, status));
  }

  const rows = await db
    .select()
    .from(reminders)
    .where(and(...conditions))
    .orderBy(asc(reminders.scheduled_at));

  return c.json({ data: rows, count: rows.length });
});

// POST / - create reminder
app.post('/', async (c) => {
  const user = c.get('user');
  const body = createReminderSchema.parse(await c.req.json());

  const [created] = await db
    .insert(reminders)
    .values({
      ...body,
      scheduled_at: new Date(body.scheduled_at),
      user_id: user.id,
    })
    .returning();

  await logMutation(user.id, 'create_reminder', 'reminders', created.id, null, created);

  return c.json({ data: created }, 201);
});

// PATCH /:id - update reminder
app.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = updateReminderSchema.parse(await c.req.json());

  const [existing] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Reminder not found' }, 404);
  }

  const updates: Record<string, unknown> = { ...body };
  if (body.scheduled_at) {
    updates.scheduled_at = new Date(body.scheduled_at);
  }

  const [updated] = await db
    .update(reminders)
    .set(updates)
    .where(and(eq(reminders.id, id), eq(reminders.user_id, user.id)))
    .returning();

  await logMutation(user.id, 'update_reminder', 'reminders', id, existing, updated);

  return c.json({ data: updated });
});

// DELETE /:id - delete reminder
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const [existing] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Reminder not found' }, 404);
  }

  await db
    .delete(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.user_id, user.id)));

  await logMutation(user.id, 'delete_reminder', 'reminders', id, existing, null);

  return c.json({ data: { id } });
});

// POST /:id/snooze - snooze reminder
app.post('/:id/snooze', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = snoozeReminderSchema.parse(await c.req.json());

  const [existing] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Reminder not found' }, 404);
  }

  const newScheduledAt = new Date(existing.scheduled_at.getTime() + body.minutes * 60 * 1000);

  const [updated] = await db
    .update(reminders)
    .set({
      scheduled_at: newScheduledAt,
      snooze_count: existing.snooze_count + 1,
      status: 'snoozed',
    })
    .where(and(eq(reminders.id, id), eq(reminders.user_id, user.id)))
    .returning();

  await logMutation(user.id, 'update_reminder', 'reminders', id, existing, updated);

  return c.json({ data: updated });
});

// POST /:id/done - mark reminder as done
app.post('/:id/done', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const [existing] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Reminder not found' }, 404);
  }

  const [updated] = await db
    .update(reminders)
    .set({ status: 'done' })
    .where(and(eq(reminders.id, id), eq(reminders.user_id, user.id)))
    .returning();

  await logMutation(user.id, 'complete_reminder', 'reminders', id, existing, updated);

  return c.json({ data: updated });
});

export default app;
