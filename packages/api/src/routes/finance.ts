import { Hono } from 'hono';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  financeTransactions,
  financeCategories,
  netWorthSnapshots,
} from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import {
  createTransactionSchema,
  createCategorySchema,
  createNetWorthSnapshotSchema,
} from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// ── Transactions ──────────────────────────────────────

// GET /transactions - list, optional ?from=, ?to=, ?category_id= filters
app.get('/transactions', async (c) => {
  const user = c.get('user');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const categoryId = c.req.query('category_id');

  const conditions = [eq(financeTransactions.user_id, user.id)];
  if (from) {
    conditions.push(gte(financeTransactions.date, from));
  }
  if (to) {
    conditions.push(lte(financeTransactions.date, to));
  }
  if (categoryId) {
    conditions.push(eq(financeTransactions.category_id, categoryId));
  }

  const rows = await db
    .select()
    .from(financeTransactions)
    .where(and(...conditions))
    .orderBy(desc(financeTransactions.date));

  return c.json({ data: rows, count: rows.length });
});

// POST /transactions - create transaction
app.post('/transactions', async (c) => {
  const user = c.get('user');
  const body = createTransactionSchema.parse(await c.req.json());

  const [created] = await db
    .insert(financeTransactions)
    .values({
      ...body,
      amount: String(body.amount),
      user_id: user.id,
    })
    .returning();

  await logMutation(
    user.id,
    'create_transaction',
    'finance_transactions',
    created.id,
    null,
    created,
  );

  return c.json({ data: created }, 201);
});

// ── Categories ────────────────────────────────────────

// GET /categories - list categories for user
app.get('/categories', async (c) => {
  const user = c.get('user');

  const rows = await db
    .select()
    .from(financeCategories)
    .where(eq(financeCategories.user_id, user.id));

  return c.json({ data: rows, count: rows.length });
});

// POST /categories - create category
app.post('/categories', async (c) => {
  const user = c.get('user');
  const body = createCategorySchema.parse(await c.req.json());

  const [created] = await db
    .insert(financeCategories)
    .values({ ...body, user_id: user.id })
    .returning();

  await logMutation(
    user.id,
    'create_category',
    'finance_categories',
    created.id,
    null,
    created,
  );

  return c.json({ data: created }, 201);
});

// ── Net Worth ─────────────────────────────────────────

// GET /net-worth - list snapshots, optional ?latest=true
app.get('/net-worth', async (c) => {
  const user = c.get('user');
  const latest = c.req.query('latest');

  const query = db
    .select()
    .from(netWorthSnapshots)
    .where(eq(netWorthSnapshots.user_id, user.id))
    .orderBy(desc(netWorthSnapshots.date));

  if (latest === 'true') {
    const rows = await query.limit(1);
    const snapshot = rows[0] ?? null;
    return c.json({ data: snapshot });
  }

  const rows = await query;
  return c.json({ data: rows, count: rows.length });
});

// POST /net-worth - create snapshot
app.post('/net-worth', async (c) => {
  const user = c.get('user');
  const body = createNetWorthSnapshotSchema.parse(await c.req.json());

  const [created] = await db
    .insert(netWorthSnapshots)
    .values({
      ...body,
      total: String(body.total),
      user_id: user.id,
    })
    .returning();

  await logMutation(
    user.id,
    'create_net_worth_snapshot',
    'net_worth_snapshots',
    created.id,
    null,
    created,
  );

  return c.json({ data: created }, 201);
});

// ── Import ────────────────────────────────────────────

// POST /import - CSV import stub
app.post('/import', async (c) => {
  return c.json({ message: 'Import not yet implemented' }, 501);
});

export default app;
