"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import * as crypto from "node:crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const buf = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(buf, Buffer.from(hash, "hex"));
}

export const register = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    _id: string;
    _creationTime: number;
    email: string;
    name?: string;
    timezone: string;
  }> => {
    const existing: Doc<"users"> | null = await ctx.runQuery(
      internal.authHelpers._findUserByEmail,
      { email: args.email },
    );
    if (existing) throw new Error("Email already registered");

    const password_hash = hashPassword(args.password);
    const userOrNull = await ctx.runMutation(
      internal.authHelpers._insertUser,
      { email: args.email, password_hash, name: args.name, timezone: args.timezone ?? "UTC" },
    );
    const user = userOrNull!;

    return {
      _id: user._id as string,
      _creationTime: user._creationTime,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    };
  },
});

export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{
    _id: string;
    _creationTime: number;
    email: string;
    name?: string;
    timezone: string;
  }> => {
    const user: Doc<"users"> | null = await ctx.runQuery(
      internal.authHelpers._findUserByEmail,
      { email: args.email },
    );
    if (!user) throw new Error("Invalid email or password");

    const valid = verifyPassword(args.password, user.password_hash);
    if (!valid) throw new Error("Invalid email or password");

    return {
      _id: user._id as string,
      _creationTime: user._creationTime,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    };
  },
});

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
    const keyHash = hashPassword(rawKey);

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
        if (verifyPassword(key, candidate.keyHash)) {
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
