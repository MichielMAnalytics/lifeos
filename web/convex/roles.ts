// Role-based access control.
//
// LifeOS has exactly two roles right now:
//   • admin — sees every tab, including in-progress features (Meetings,
//     Marketing) that aren't ready for the wider beta.
//   • user — sees the public tab set.
//
// Admin status is derived server-side from the `ADMIN_EMAILS` Convex env
// var (comma-separated). No DB column for `role` — granting admin is a
// one-line `npx convex env set ADMIN_EMAILS "..."` and revocation is the
// same. When the per-user role list outgrows that, swap to a `role`
// column on `users`.

import { query } from "./_generated/server";
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { serverEnv } from "./deploymentEnv";

export type Role = "admin" | "user";

function adminEmailSet(): Set<string> {
  return new Set(
    (serverEnv.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailSet().has(email.trim().toLowerCase());
}

// ── Public — read-only ──────────────────────────────

export const getMyRole = query({
  args: {},
  handler: async (ctx): Promise<{ role: Role; isAdmin: boolean; email: string | null }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { role: "user", isAdmin: false, email: null };
    const user = await ctx.db.get(userId);
    const email = user?.email ?? null;
    const admin = isAdminEmail(email);
    return { role: admin ? "admin" : "user", isAdmin: admin, email };
  },
});

// ── Internal — for server-side gating ───────────────

export const _isAdmin = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await ctx.db.get(args.userId);
    return isAdminEmail(user?.email);
  },
});
