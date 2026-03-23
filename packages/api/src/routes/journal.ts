import { Hono } from 'hono';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { journals } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import { upsertJournalSchema } from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET / - list journal entries, optional ?from= and ?to= date filters
app.get('/', async (c) => {
  const user = c.get('user');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const conditions = [eq(journals.user_id, user.id)];
  if (from) {
    conditions.push(gte(journals.entry_date, from));
  }
  if (to) {
    conditions.push(lte(journals.entry_date, to));
  }

  const rows = await db
    .select()
    .from(journals)
    .where(and(...conditions))
    .orderBy(desc(journals.entry_date));

  return c.json({ data: rows, count: rows.length });
});

// GET /:date - get single entry by date
app.get('/:date', async (c) => {
  const user = c.get('user');
  const date = c.req.param('date');

  const [entry] = await db
    .select()
    .from(journals)
    .where(and(eq(journals.user_id, user.id), eq(journals.entry_date, date)));

  if (!entry) {
    return c.json({ error: 'Journal entry not found' }, 404);
  }

  return c.json({ data: entry });
});

// PUT /:date - upsert journal entry
app.put('/:date', async (c) => {
  const user = c.get('user');
  const date = c.req.param('date');
  const body = upsertJournalSchema.parse(await c.req.json());

  // Check if entry already exists (for mutation logging)
  const [existing] = await db
    .select()
    .from(journals)
    .where(and(eq(journals.user_id, user.id), eq(journals.entry_date, date)));

  const [upserted] = await db
    .insert(journals)
    .values({
      ...body,
      user_id: user.id,
      entry_date: date,
    })
    .onConflictDoUpdate({
      target: [journals.user_id, journals.entry_date],
      set: {
        ...body,
        updated_at: new Date(),
      },
    })
    .returning();

  await logMutation(
    user.id,
    existing ? 'update' : 'create',
    'journals',
    upserted.id,
    existing ?? null,
    upserted,
  );

  return c.json({ data: upserted }, existing ? 200 : 201);
});

export default app;
