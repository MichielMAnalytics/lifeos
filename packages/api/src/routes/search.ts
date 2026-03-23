import { Hono } from 'hono';
import { eq, and, sql, ilike, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tasks, goals, ideas, journals, resources } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { searchSchema } from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const VALID_TYPES = ['tasks', 'goals', 'ideas', 'journal', 'resources'] as const;
type SearchType = (typeof VALID_TYPES)[number];

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET / - search across tables
app.get('/', async (c) => {
  const user = c.get('user');
  const q = c.req.query('q');
  const typeParam = c.req.query('type');

  if (!q || q.trim().length === 0) {
    return c.json({ error: 'Query parameter q is required' }, 400);
  }

  const pattern = `%${q}%`;

  // Determine which types to search
  let typesToSearch: SearchType[];
  if (typeParam) {
    typesToSearch = typeParam
      .split(',')
      .map((t) => t.trim() as SearchType)
      .filter((t) => VALID_TYPES.includes(t));

    if (typesToSearch.length === 0) {
      return c.json({ error: 'No valid types specified' }, 400);
    }
  } else {
    typesToSearch = [...VALID_TYPES];
  }

  const results: Record<string, unknown[]> = {};

  // Search tasks
  if (typesToSearch.includes('tasks')) {
    results.tasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.user_id, user.id),
          or(
            ilike(tasks.title, pattern),
            ilike(tasks.notes, pattern),
          ),
        ),
      )
      .limit(20);
  }

  // Search goals
  if (typesToSearch.includes('goals')) {
    results.goals = await db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.user_id, user.id),
          or(
            ilike(goals.title, pattern),
            ilike(goals.description, pattern),
          ),
        ),
      )
      .limit(20);
  }

  // Search ideas
  if (typesToSearch.includes('ideas')) {
    results.ideas = await db
      .select()
      .from(ideas)
      .where(
        and(
          eq(ideas.user_id, user.id),
          ilike(ideas.content, pattern),
        ),
      )
      .limit(20);
  }

  // Search journal
  if (typesToSearch.includes('journal')) {
    results.journal = await db
      .select()
      .from(journals)
      .where(
        and(
          eq(journals.user_id, user.id),
          or(
            ilike(journals.mit, pattern),
            ilike(journals.p1, pattern),
            ilike(journals.p2, pattern),
            ilike(journals.notes, pattern),
          ),
        ),
      )
      .limit(20);
  }

  // Search resources
  if (typesToSearch.includes('resources')) {
    results.resources = await db
      .select()
      .from(resources)
      .where(
        and(
          eq(resources.user_id, user.id),
          or(
            ilike(resources.title, pattern),
            ilike(resources.content, pattern),
          ),
        ),
      )
      .limit(20);
  }

  return c.json({ data: results });
});

export default app;
