// Google Workspace OAuth token plumbing.
//
// Convex Auth's Google provider runs the OAuth dance and surfaces the
// returned tokens via `callbacks.afterUserCreatedOrUpdated` (see
// `convex/auth.ts`). That callback hands them to `_captureTokens` here,
// which writes the access + refresh tokens into GCP Secret Manager and
// stamps `users.googleConnectedAt` / `googleScopes` so the dashboard can
// render status without a Secret Manager round-trip.
//
// Access tokens expire in 60 minutes. `getAccessToken` is the single
// entry point every Workspace API client (Calendar, Gmail, Drive, …)
// uses — it returns the cached token if still fresh, or refreshes via
// the refresh_token first.

"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readByokSecret, writeByokSecret } from "./k8s";
import type { Id } from "./_generated/dataModel";

// ── Capture tokens after sign-in ──────────────────────
// Called from the auth callback in `convex/auth.ts`. Internal so only
// Convex-internal code can invoke it (the OAuth flow itself).

export const _captureTokens = internalAction({
  args: {
    userId: v.id("users"),
    profile: v.any(), // raw OAuth account/profile blob from Google
  },
  handler: async (ctx, args) => {
    // The shape of `profile` depends on the OAuth provider impl. For
    // Google via @auth/core, the token fields are on the account object,
    // which @convex-dev/auth bundles into the same blob alongside profile.
    // We probe a few common nesting paths to be resilient to upstream
    // shape shifts.
    const p = args.profile as Record<string, unknown>;
    const accessToken = pickString(p, ["access_token", "accessToken"]);
    const refreshToken = pickString(p, ["refresh_token", "refreshToken"]);
    const expiresIn = pickNumber(p, ["expires_in", "expiresIn"]);
    const expiresAt = pickNumber(p, ["expires_at", "expiresAt"]);
    const scopeStr = pickString(p, ["scope"]);
    const email = pickString(p, ["email"]) ?? pickString(p, ["preferred_username"]);

    if (!accessToken) {
      console.warn("[googleAuth] no access_token in OAuth response — fields:", Object.keys(p));
      return;
    }

    await writeByokSecret(String(args.userId), "google-access", accessToken);
    if (refreshToken) {
      await writeByokSecret(String(args.userId), "google-refresh", refreshToken);
    }

    const expiresAtMs = expiresAt
      ? expiresAt * 1000
      : expiresIn
        ? Date.now() + expiresIn * 1000
        : Date.now() + 50 * 60_000; // conservative fallback: 50 minutes

    const scopes = scopeStr ? scopeStr.split(/\s+/).filter(Boolean) : [];

    await ctx.runMutation(internal.googleAuthHelpers._markConnected, {
      userId: args.userId,
      scopes,
      expiresAtMs,
      email,
    });
    console.log("[googleAuth] captured tokens for user", String(args.userId), "scopes:", scopes.length);
  },
});

// ── Public: status query ──────────────────────────────

export const getStatus = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    connected: boolean;
    connectedAt?: number;
    scopes?: string[];
    googleEmail?: string;
    accessExpiresAt?: number;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const status = await ctx.runQuery(internal.googleAuthHelpers._getStatus, { userId });
    if (!status) return { connected: false };
    return {
      connected: status.connectedAt !== undefined,
      connectedAt: status.connectedAt,
      scopes: status.scopes,
      googleEmail: status.googleEmail,
      accessExpiresAt: status.accessExpiresAt,
    };
  },
});

// ── Public: disconnect ────────────────────────────────

export const disconnect = action({
  args: {},
  handler: async (ctx): Promise<{ ok: true }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    // Tombstone the secrets — `readByokSecret` returns null for "DELETED".
    await writeByokSecret(String(userId), "google-access", "DELETED");
    await writeByokSecret(String(userId), "google-refresh", "DELETED");
    await ctx.runMutation(internal.googleAuthHelpers._markDisconnected, { userId });
    return { ok: true };
  },
});

// ══════════════════════════════════════════════════════
// Internal — token resolution for downstream services.
// ══════════════════════════════════════════════════════

/**
 * Returns a fresh access token for the given user, refreshing it via the
 * refresh_token if the cached one is expired or about to expire (60-second
 * skew). Returns null if the user hasn't connected Google or if the refresh
 * itself fails (e.g. the user revoked access in Google's account settings).
 *
 * Every Workspace API client (Calendar, Gmail, …) uses this. Direct token
 * access is intentionally NOT exposed.
 */
export async function getAccessToken(
  ctx: { runQuery: (...args: any[]) => Promise<any>; runMutation: (...args: any[]) => Promise<any> },
  userId: Id<"users">,
): Promise<string | null> {
  const status = (await ctx.runQuery(internal.googleAuthHelpers._getStatus, { userId })) as
    | { connectedAt?: number; accessExpiresAt?: number }
    | null;
  if (!status?.connectedAt) return null;

  const cached = await readByokSecret(String(userId), "google-access");
  const now = Date.now();
  const expiresAt = status.accessExpiresAt ?? 0;

  // Use the cached token if it has at least 60s of life left.
  if (cached && expiresAt > now + 60_000) {
    return cached;
  }

  // Refresh.
  const refreshToken = await readByokSecret(String(userId), "google-refresh");
  if (!refreshToken) {
    console.warn("[googleAuth] no refresh token for user", String(userId));
    return null;
  }
  // AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are read directly from process.env
  // because they're set by Convex Auth (not in our `serverEnv` schema). We
  // need them here to drive the refresh-token grant directly against Google.
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[googleAuth] AUTH_GOOGLE_ID/SECRET not configured for refresh");
    return cached ?? null;
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[googleAuth] refresh failed", res.status, text.slice(0, 200));
    return null;
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  await writeByokSecret(String(userId), "google-access", data.access_token);
  const newExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
  await ctx.runMutation(internal.googleAuthHelpers._stampExpiry, {
    userId,
    accessExpiresAt: newExpiresAt,
  });
  return data.access_token;
}

// ── helpers ──────────────────────────────────────────

function pickString(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function pickNumber(o: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}
