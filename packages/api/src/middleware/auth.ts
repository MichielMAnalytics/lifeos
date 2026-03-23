import { createMiddleware } from 'hono/factory';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { apiKeys, users } from '../db/schema.js';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
};

type AuthEnv = {
  Variables: {
    user: AuthUser;
  };
};

export const apiKeyAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const key = header.slice(7);
  if (!key.startsWith('lifeos_sk_')) {
    return c.json({ error: 'Invalid API key format' }, 401);
  }

  // Extract prefix for lookup (first 8 chars after lifeos_sk_)
  const prefix = key.slice(10, 18);

  // Find matching key by prefix
  const candidates = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.key_prefix, prefix));

  let matchedKey = null;
  for (const candidate of candidates) {
    const match = await bcrypt.compare(key, candidate.key_hash);
    if (match) {
      matchedKey = candidate;
      break;
    }
  }

  if (!matchedKey) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  // Update last used
  await db
    .update(apiKeys)
    .set({ last_used_at: new Date() })
    .where(eq(apiKeys.id, matchedKey.id));

  // Fetch user
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      timezone: users.timezone,
    })
    .from(users)
    .where(eq(users.id, matchedKey.user_id));

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  c.set('user', user);
  await next();
});
