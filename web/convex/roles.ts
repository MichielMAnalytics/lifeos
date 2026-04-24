// Role-based access control.
//
// LifeOS has exactly two roles right now:
//   • admin — sees every tab, including in-progress features (Meetings,
//     Marketing) that aren't ready for the wider beta.
//   • user — sees the public tab set.
//
// Admin emails are hardcoded below. Originally this read from an
// ADMIN_EMAILS env var, but Convex V8 isolates cache env values at module
// load — a long-lived WebSocket subscription pinned an isolate from
// before the env var was set, so `getMyRole` kept returning isAdmin:false
// for the logged-in session while CLI invocations (fresh isolates)
// correctly returned true. Hardcoding bakes the value into the bundle so
// every invocation reads the same list. To grant admin: edit this list,
// redeploy.

import { query } from "./_generated/server";
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export type Role = "admin" | "user";

// Comma-separated list of admin emails (lowercased). Edit and redeploy
// to change. Keep small — if this ever grows past ~5 people, move to a
// DB-backed `admins` table or users.role column.
const ADMIN_EMAILS: ReadonlySet<string> = new Set([
  "zumpollekemp@gmail.com",
]);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}

// ── Public — read-only ──────────────────────────────

export const getMyRole = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ role: Role; isAdmin: boolean; email: string | null } | null> => {
    // Return `null` while auth is still resolving so AdminGate shows the
    // loading skeleton instead of flashing the restricted page.
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
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
