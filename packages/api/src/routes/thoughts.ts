import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { thoughts } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import { createThoughtSchema } from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET / - list all thoughts, ordered by created_at DESC
app.get('/', async (c) => {
  const user = c.get('user');

  const rows = await db
    .select()
    .from(thoughts)
    .where(eq(thoughts.user_id, user.id))
    .orderBy(desc(thoughts.created_at));

  return c.json({ data: rows, count: rows.length });
});

// POST / - create thought
app.post('/', async (c) => {
  const user = c.get('user');
  const body = createThoughtSchema.parse(await c.req.json());

  const [created] = await db
    .insert(thoughts)
    .values({ ...body, user_id: user.id })
    .returning();

  await logMutation(user.id, 'create', 'thoughts', created.id, null, created);

  return c.json({ data: created }, 201);
});

// DELETE /:id - delete thought
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const [existing] = await db
    .select()
    .from(thoughts)
    .where(and(eq(thoughts.id, id), eq(thoughts.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Thought not found' }, 404);
  }

  await db
    .delete(thoughts)
    .where(and(eq(thoughts.id, id), eq(thoughts.user_id, user.id)));

  await logMutation(user.id, 'delete', 'thoughts', id, existing, null);

  return c.json({ data: { id } });
});

export default app;
