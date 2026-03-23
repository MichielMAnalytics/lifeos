import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { ideas, projects } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import { createIdeaSchema, updateIdeaSchema, promoteIdeaSchema } from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET / - list ideas, optional ?actionability= filter
app.get('/', async (c) => {
  const user = c.get('user');
  const actionability = c.req.query('actionability');

  const conditions = [eq(ideas.user_id, user.id)];
  if (actionability) {
    conditions.push(eq(ideas.actionability, actionability));
  }

  const rows = await db
    .select()
    .from(ideas)
    .where(and(...conditions));

  return c.json({ data: rows, count: rows.length });
});

// POST / - create idea
app.post('/', async (c) => {
  const user = c.get('user');
  const body = createIdeaSchema.parse(await c.req.json());

  const [created] = await db
    .insert(ideas)
    .values({ ...body, user_id: user.id })
    .returning();

  await logMutation(user.id, 'create', 'ideas', created.id, null, created);

  return c.json({ data: created }, 201);
});

// PATCH /:id - update idea
app.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = updateIdeaSchema.parse(await c.req.json());

  const [existing] = await db
    .select()
    .from(ideas)
    .where(and(eq(ideas.id, id), eq(ideas.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Idea not found' }, 404);
  }

  const [updated] = await db
    .update(ideas)
    .set(body)
    .where(and(eq(ideas.id, id), eq(ideas.user_id, user.id)))
    .returning();

  await logMutation(user.id, 'update', 'ideas', id, existing, updated);

  return c.json({ data: updated });
});

// DELETE /:id - delete idea
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const [existing] = await db
    .select()
    .from(ideas)
    .where(and(eq(ideas.id, id), eq(ideas.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Idea not found' }, 404);
  }

  await db
    .delete(ideas)
    .where(and(eq(ideas.id, id), eq(ideas.user_id, user.id)));

  await logMutation(user.id, 'delete', 'ideas', id, existing, null);

  return c.json({ data: { id } });
});

// POST /:id/promote - promote idea to project
app.post('/:id/promote', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = promoteIdeaSchema.parse(await c.req.json());

  const [existing] = await db
    .select()
    .from(ideas)
    .where(and(eq(ideas.id, id), eq(ideas.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Idea not found' }, 404);
  }

  // Create a new project from the idea
  const [project] = await db
    .insert(projects)
    .values({
      title: body.project_title,
      user_id: user.id,
    })
    .returning();

  await logMutation(user.id, 'create', 'projects', project.id, null, project);

  // Link the idea to the new project
  const [updatedIdea] = await db
    .update(ideas)
    .set({ project_id: project.id })
    .where(and(eq(ideas.id, id), eq(ideas.user_id, user.id)))
    .returning();

  await logMutation(user.id, 'update', 'ideas', id, existing, updatedIdea);

  return c.json({ data: { idea: updatedIdea, project } }, 201);
});

export default app;
