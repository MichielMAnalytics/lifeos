import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { resources } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import { createResourceSchema, updateResourceSchema } from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET / - list resources, optional ?type= filter
app.get('/', async (c) => {
  const user = c.get('user');
  const type = c.req.query('type');

  const conditions = [eq(resources.user_id, user.id)];
  if (type) {
    conditions.push(eq(resources.type, type));
  }

  const rows = await db
    .select()
    .from(resources)
    .where(and(...conditions));

  return c.json({ data: rows, count: rows.length });
});

// POST / - create resource
app.post('/', async (c) => {
  const user = c.get('user');
  const body = createResourceSchema.parse(await c.req.json());

  const [created] = await db
    .insert(resources)
    .values({ ...body, user_id: user.id })
    .returning();

  await logMutation(user.id, 'create', 'resources', created.id, null, created);

  return c.json({ data: created }, 201);
});

// PATCH /:id - update resource
app.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = updateResourceSchema.parse(await c.req.json());

  const [existing] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, id), eq(resources.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Resource not found' }, 404);
  }

  const [updated] = await db
    .update(resources)
    .set(body)
    .where(and(eq(resources.id, id), eq(resources.user_id, user.id)))
    .returning();

  await logMutation(user.id, 'update', 'resources', id, existing, updated);

  return c.json({ data: updated });
});

// DELETE /:id - delete resource
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const [existing] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, id), eq(resources.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Resource not found' }, 404);
  }

  await db
    .delete(resources)
    .where(and(eq(resources.id, id), eq(resources.user_id, user.id)));

  await logMutation(user.id, 'delete', 'resources', id, existing, null);

  return c.json({ data: { id } });
});

export default app;
