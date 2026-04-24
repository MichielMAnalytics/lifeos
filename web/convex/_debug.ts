import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { serverEnv } from "./deploymentEnv";
import { isAdminEmail } from "./roles";

export const debugRole = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const user = userId ? await ctx.db.get(userId) : null;
    return {
      userId,
      identitySubject: identity?.subject ?? null,
      identityEmail: identity?.email ?? null,
      identityTokenIdentifier: identity?.tokenIdentifier ?? null,
      dbEmail: user?.email ?? null,
      adminEmailsRaw: serverEnv.ADMIN_EMAILS ?? "<unset>",
      isAdminCheck: isAdminEmail(user?.email),
    };
  },
});

export const debugRoleByUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return {
      userId: args.userId,
      email: user?.email ?? null,
      adminEmailsRaw: serverEnv.ADMIN_EMAILS ?? "<unset>",
      adminEmailsLen: (serverEnv.ADMIN_EMAILS ?? "").length,
      isAdminCheck: isAdminEmail(user?.email),
    };
  },
});

export const listUsersByEmailPrefix = internalQuery({
  args: { prefix: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("users").take(500);
    const p = args.prefix.toLowerCase();
    return all
      .filter((u) => (u.email ?? "").toLowerCase().includes(p) || (u.name ?? "").toLowerCase().includes(p))
      .map((u) => ({ _id: u._id, email: u.email, name: u.name, _creationTime: u._creationTime }));
  },
});

export const listAllUsersSummary = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("users").take(500);
    return {
      count: all.length,
      users: all.map((u) => ({
        _id: u._id,
        email: u.email ?? null,
        name: u.name ?? null,
        hasImage: !!u.image,
      })),
    };
  },
});

// Attach the debug info as a side channel to the actual getMyRole so we
// can see what the live session sees, not just what we get from the CLI.
// Writes to a `roleDebug` log row on every call. Read back via latest.
export const dumpLastRoleCall = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("mutationLog").order("desc").take(20);
    return rows
      .filter((r) => r.action === "debug-role")
      .slice(0, 5);
  },
});
