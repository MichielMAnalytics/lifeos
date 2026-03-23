import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  mutationLog,
  tasks,
  projects,
  goals,
  journals,
  dayPlans,
  weeklyPlans,
  ideas,
  thoughts,
  wins,
  resources,
  reviews,
  reminders,
  financeTransactions,
  financeCategories,
  netWorthSnapshots,
} from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// Map table names to their Drizzle schema objects
const tableMap: Record<string, any> = {
  tasks,
  projects,
  goals,
  journals,
  day_plans: dayPlans,
  weekly_plans: weeklyPlans,
  ideas,
  thoughts,
  wins,
  resources,
  reviews,
  reminders,
  finance_transactions: financeTransactions,
  finance_categories: financeCategories,
  net_worth_snapshots: netWorthSnapshots,
};

// GET / - list recent mutations
app.get('/', async (c) => {
  const user = c.get('user');
  const limitParam = c.req.query('limit');

  let limit = 10;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
      limit = parsed;
    }
  }

  const rows = await db
    .select()
    .from(mutationLog)
    .where(eq(mutationLog.user_id, user.id))
    .orderBy(desc(mutationLog.created_at))
    .limit(limit);

  return c.json({ data: rows, count: rows.length });
});

// POST /undo - undo the most recent mutation
app.post('/undo', async (c) => {
  const user = c.get('user');

  // Get most recent mutation for user
  const [mutation] = await db
    .select()
    .from(mutationLog)
    .where(eq(mutationLog.user_id, user.id))
    .orderBy(desc(mutationLog.created_at))
    .limit(1);

  if (!mutation) {
    return c.json({ error: 'No mutations to undo' }, 404);
  }

  const table = tableMap[mutation.table_name];
  if (!table) {
    return c.json({ error: `Unknown table: ${mutation.table_name}` }, 400);
  }

  const action = mutation.action;
  const isCreate = action === 'create' || action.startsWith('create_');
  const isUpdate = action === 'update' || action.startsWith('update_') || action.startsWith('complete');
  const isDelete = action === 'delete' || action.startsWith('delete_');

  if (isCreate) {
    // Undo create: delete the record
    await db
      .delete(table)
      .where(and(eq(table.id, mutation.record_id), eq(table.user_id, user.id)));
  } else if (isUpdate) {
    // Undo update: restore before_data
    if (!mutation.before_data) {
      return c.json({ error: 'No before_data available for undo' }, 400);
    }

    const beforeData = mutation.before_data as Record<string, unknown>;
    const { id, user_id, ...restoreData } = beforeData;

    await db
      .update(table)
      .set(restoreData)
      .where(and(eq(table.id, mutation.record_id), eq(table.user_id, user.id)));
  } else if (isDelete) {
    // Undo delete: re-insert before_data
    if (!mutation.before_data) {
      return c.json({ error: 'No before_data available for undo' }, 400);
    }

    await db.insert(table).values(mutation.before_data as Record<string, unknown>);
  } else {
    return c.json({ error: `Cannot undo action: ${action}` }, 400);
  }

  // Delete the mutation log entry
  await db.delete(mutationLog).where(eq(mutationLog.id, mutation.id));

  return c.json({
    data: {
      undone: action,
      table: mutation.table_name,
      record_id: mutation.record_id,
    },
  });
});

export default app;
