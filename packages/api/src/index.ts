import { serve } from '@hono/node-server';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import app from './app.js';
import { db } from './db/client.js';
import { users, apiKeys } from './db/schema.js';

async function bootstrap() {
  const mode = process.env.LIFEOS_MODE || 'self-hosted';

  if (mode === 'self-hosted') {
    // Check if any users exist
    const existing = await db.select({ id: users.id }).from(users).limit(1);

    if (existing.length === 0) {
      console.log('\n=== First-time setup (self-hosted mode) ===\n');

      // Create default user
      const passwordHash = await bcrypt.hash('lifeos', 12);
      const [user] = await db
        .insert(users)
        .values({
          email: 'admin@lifeos.local',
          password_hash: passwordHash,
          name: 'Admin',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
        .returning();

      // Generate API key
      const rawKey = `lifeos_sk_${crypto.randomBytes(32).toString('hex')}`;
      const prefix = rawKey.slice(10, 18);
      const keyHash = await bcrypt.hash(rawKey, 10);

      await db.insert(apiKeys).values({
        user_id: user.id,
        key_prefix: prefix,
        key_hash: keyHash,
        name: 'Default',
      });

      console.log(`  User created:  ${user.email}`);
      console.log(`  Password:      lifeos (change this!)`);
      console.log(`  API Key:       ${rawKey}`);
      console.log(`\n  Add this to packages/dashboard/.env.local:`);
      console.log(`    LIFEOS_API_KEY=${rawKey}`);
      console.log(`\n  Configure CLI:`);
      console.log(`    lifeos config set-url http://localhost:4100`);
      console.log(`    lifeos config set-key ${rawKey}`);
      console.log('\n===========================================\n');
    }
  }
}

const port = parseInt(process.env.PORT || '4100', 10);

bootstrap()
  .then(() => {
    serve({ fetch: app.fetch, port }, (info) => {
      console.log(`LifeOS API running on http://localhost:${info.port}`);
    });
  })
  .catch((err) => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  });
