import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { reviews } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import { logMutation } from '../middleware/mutation-logger.js';
import { createReviewSchema } from '@lifeos/shared';

type Env = { Variables: { user: AuthUser } };

const app = new Hono<Env>();

app.use(apiKeyAuth);

// GET / - list reviews, optional ?type= filter
app.get('/', async (c) => {
  const user = c.get('user');
  const type = c.req.query('type');

  const conditions = [eq(reviews.user_id, user.id)];
  if (type) {
    conditions.push(eq(reviews.review_type, type));
  }

  const rows = await db
    .select()
    .from(reviews)
    .where(and(...conditions))
    .orderBy(desc(reviews.created_at));

  return c.json({ data: rows, count: rows.length });
});

// POST / - create review
app.post('/', async (c) => {
  const user = c.get('user');
  const body = createReviewSchema.parse(await c.req.json());

  const [created] = await db
    .insert(reviews)
    .values({ ...body, user_id: user.id })
    .returning();

  await logMutation(user.id, 'create_review', 'reviews', created.id, null, created);

  return c.json({ data: created }, 201);
});

// GET /:id - get single review
app.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const [review] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.id, id), eq(reviews.user_id, user.id)));

  if (!review) {
    return c.json({ error: 'Review not found' }, 404);
  }

  return c.json({ data: review });
});

export default app;
