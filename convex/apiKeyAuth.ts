"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import * as crypto from "node:crypto";

function hashKey(key: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(key, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyKey(key: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const buf = crypto.scryptSync(key, salt, 64);
  return crypto.timingSafeEqual(buf, Buffer.from(hash, "hex"));
}

// ── createApiKey ─────────────────────────────────────

export const createApiKey = action({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    _id: string;
    _creationTime: number;
    keyPrefix: string;
    name?: string;
    key: string;
  }> => {
    const randomHex = crypto.randomBytes(32).toString("hex");
    const rawKey = `lifeos_sk_${randomHex}`;
    const prefix = randomHex.slice(0, 8);
    const keyHash = hashKey(rawKey);

    const createdOrNull = await ctx.runMutation(
      internal.authHelpers._insertApiKey,
      { userId: args.userId, keyPrefix: prefix, keyHash, name: args.name },
    );
    const created = createdOrNull!;

    return {
      _id: created._id as string,
      _creationTime: created._creationTime,
      keyPrefix: created.keyPrefix,
      name: created.name,
      key: rawKey,
    };
  },
});

// ── validateKey (for HTTP router auth) ───────────────

export const validateKey = internalAction({
  args: { key: v.string() },
  handler: async (ctx, args): Promise<{ userId: Id<"users"> } | null> => {
    const key = args.key;
    if (!key.startsWith("lifeos_sk_")) return null;

    const prefix = key.slice(10, 18);
    const candidates: Doc<"apiKeys">[] = await ctx.runQuery(
      internal.authHelpers._findKeysByPrefix,
      { prefix },
    );

    for (const candidate of candidates) {
      try {
        if (verifyKey(key, candidate.keyHash)) {
          await ctx.runMutation(internal.authHelpers._updateKeyLastUsed, {
            keyId: candidate._id,
          });
          return { userId: candidate.userId };
        }
      } catch {
        continue;
      }
    }
    return null;
  },
});
