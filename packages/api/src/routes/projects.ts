import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { projects, tasks } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import { createProjectSchema, updateProjectSchema } from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET / - list projects, optional ?status= filter
app.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');

  const conditions = [eq(projects.user_id, user.id)];
  if (status) {
    conditions.push(eq(projects.status, status));
  }

  const rows = await db
    .select()
    .from(projects)
    .where(and(...conditions));

  return c.json({ data: rows, count: rows.length });
});

// POST / - create project
app.post('/', async (c) => {
  const user = c.get('user');
  const body = createProjectSchema.parse(await c.req.json());

  const [created] = await db
    .insert(projects)
    .values({ ...body, user_id: user.id })
    .returning();

  await logMutation(user.id, 'create', 'projects', created.id, null, created);

  return c.json({ data: created }, 201);
});

// GET /:id - get project with its tasks
app.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.user_id, user.id)));

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const projectTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.project_id, id), eq(tasks.user_id, user.id)));

  return c.json({ data: { ...project, tasks: projectTasks } });
});

// PATCH /:id - update project
app.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = updateProjectSchema.parse(await c.req.json());

  const [existing] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const [updated] = await db
    .update(projects)
    .set(body)
    .where(and(eq(projects.id, id), eq(projects.user_id, user.id)))
    .returning();

  await logMutation(user.id, 'update', 'projects', id, existing, updated);

  return c.json({ data: updated });
});

// DELETE /:id - delete project
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const [existing] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'Project not found' }, 404);
  }

  await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.user_id, user.id)));

  await logMutation(user.id, 'delete', 'projects', id, existing, null);

  return c.json({ data: { id } });
});

export default app;
