import { Hono } from 'hono';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { wins } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import { createWinSchema } from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET / - list wins, optional ?from= and ?to= date filters
app.get('/', async (c) => {
  const user = c.get('user');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const conditions = [eq(wins.user_id, user.id)];
  if (from) {
    conditions.push(gte(wins.entry_date, from));
  }
  if (to) {
    conditions.push(lte(wins.entry_date, to));
  }

  const rows = await db
    .select()
    .from(wins)
    .where(and(...conditions))
    .orderBy(desc(wins.entry_date));

  return c.json({ data: rows, count: rows.length });
});

// POST / - create win
app.post('/', async (c) => {
  const user = c.get('user');
  const body = createWinSchema.parse(await c.req.json());

  const [created] = await db
    .insert(wins)
    .values({ ...body, user_id: user.id })
    .returning();

  await logMutation(user.id, 'create', 'wins', created.id, null, created);

  return c.json({ data: created }, 201);
});

export default app;
