import { Hono } from 'hono';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, apiKeys } from '../db/schema.js';
import { apiKeyAuth, type AuthUser } from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  createApiKeySchema,
} from '@lifeos/shared';

type AuthEnv = {
  Variables: {
    user: AuthUser;
  };
};

const auth = new Hono<AuthEnv>();

// ── POST /register ────────────────────────────────────

auth.post('/register', async (c) => {
  const body = registerSchema.parse(await c.req.json());

  // Check if email already exists
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email));

  if (existing) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  const password_hash = await bcrypt.hash(body.password, 12);

  const [user] = await db
    .insert(users)
    .values({
      email: body.email,
      password_hash,
      name: body.name ?? null,
      timezone: body.timezone,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      timezone: users.timezone,
      created_at: users.created_at,
    });

  return c.json({ data: user }, 201);
});

// ── POST /login ───────────────────────────────────────

auth.post('/login', async (c) => {
  const body = loginSchema.parse(await c.req.json());

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email));

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const valid = await bcrypt.compare(body.password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  // Return user data (without password_hash) and a simple session token
  const token = crypto.randomUUID();

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      created_at: user.created_at,
    },
  });
});

// ── Protected routes below ────────────────────────────

// GET /me
auth.get('/me', apiKeyAuth, async (c) => {
  const user = c.get('user');
  return c.json({ data: user });
});

// GET /api-keys
auth.get('/api-keys', apiKeyAuth, async (c) => {
  const user = c.get('user');

  const keys = await db
    .select({
      id: apiKeys.id,
      key_prefix: apiKeys.key_prefix,
      name: apiKeys.name,
      last_used_at: apiKeys.last_used_at,
      created_at: apiKeys.created_at,
    })
    .from(apiKeys)
    .where(eq(apiKeys.user_id, user.id));

  return c.json({ data: keys });
});

// POST /api-keys
auth.post('/api-keys', apiKeyAuth, async (c) => {
  const user = c.get('user');
  const body = createApiKeySchema.parse(await c.req.json());

  // Generate the raw key: lifeos_sk_ + 32 random hex bytes
  const randomHex = crypto.randomBytes(32).toString('hex');
  const rawKey = `lifeos_sk_${randomHex}`;

  // Extract prefix (first 8 chars after lifeos_sk_)
  const prefix = randomHex.slice(0, 8);

  // Hash the full key for storage
  const keyHash = await bcrypt.hash(rawKey, 10);

  const [created] = await db
    .insert(apiKeys)
    .values({
      user_id: user.id,
      key_prefix: prefix,
      key_hash: keyHash,
      name: body.name,
    })
    .returning({
      id: apiKeys.id,
      key_prefix: apiKeys.key_prefix,
      name: apiKeys.name,
      created_at: apiKeys.created_at,
    });

  // Return the full key exactly once
  return c.json({ data: { ...created, key: rawKey } }, 201);
});

// DELETE /api-keys/:id
auth.delete('/api-keys/:id', apiKeyAuth, async (c) => {
  const user = c.get('user');
  const keyId = c.req.param('id');

  // Verify key exists and belongs to user
  const [existing] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.user_id, user.id)));

  if (!existing) {
    return c.json({ error: 'API key not found' }, 404);
  }

  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.user_id, user.id)));

  return c.json({ data: { deleted: true } });
});

export default auth;
