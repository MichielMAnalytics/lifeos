// Google OAuth 2.0 authorization-code flow for the Calendar integration.
//
// Separate from the app's sign-in OAuth (which lives in auth.ts and only
// asks for openid/email/profile). Users connect their Google account here
// as a BYOK-style secondary connection — tokens are stored per-user in
// GCP Secret Manager as `byok-{userId}-google-calendar` (a JSON blob
// holding access_token, refresh_token, scope, expires_at_ms).
//
// Why "use node": we call `writeByokSecret` from k8s.ts which needs the
// Node buffer + GCP SA signing utilities. Queries/mutations that only
// need the metadata fields on `users` live in googleAuthHelpers.ts so
// this file can stay Node-only.

"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { serverEnv } from "./deploymentEnv";
import { readByokSecret, writeByokSecret } from "./k8s";
import type { Id } from "./_generated/dataModel";
import { isAdminEmail } from "./roles";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

// Read + write events on the user's calendars. `calendar.events` is the
// per-event scope (no calendar list / ACL access), narrower than the
// full `calendar` scope. Lets the bot create / update / delete events
// from Telegram.
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const REQUESTED_SCOPES = [
  "openid",
  "email",
  "profile",
  GOOGLE_CALENDAR_SCOPE,
].join(" ");

const SECRET_PROVIDER = "google-calendar";

// ── Shape of the blob we persist in Secret Manager ─
interface GoogleTokenBlob {
  access_token: string;
  refresh_token: string;
  scope: string;
  expires_at_ms: number;
  token_type: string;
}

function redirectUri(): string {
  // `CONVEX_SITE_URL` is the HTTP-action domain for the current
  // deployment (…convex.site). Our callback handler is registered at
  // /oauth/google/callback. Redirect URI MUST match one of the entries
  // registered on the OAuth client in GCP console.
  return `${serverEnv.CONVEX_SITE_URL.replace(/\/$/, "")}/oauth/google/callback`;
}

/** Mint the URL the user's browser gets redirected to. Returns the URL +
 * a freshly-minted state token that we persist in `googleOAuthStates`
 * so the callback can verify it and look up the owning user. */
export const getAuthorizeUrl = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) throw new Error("Not authenticated");

      // Gate to admins only until the app is verified and the test-user
      // cap is irrelevant. Mirrors the AdminGate component on the client.
      const adminOk = await ctx.runQuery(internal.googleAuthHelpers._isAdmin, { userId });
      if (!adminOk) throw new Error("Admin only");

      const clientId = serverEnv.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new Error(
          "GOOGLE_CLIENT_ID not configured (worker isolate may have stale env — redeploy convex)",
        );
      }

      // 32 bytes of URL-safe randomness.
      const { randomBytes } = await import("node:crypto");
      const state = randomBytes(24).toString("base64url");
      await ctx.runMutation(internal.googleAuthHelpers._saveOAuthState, {
        userId,
        state,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10-minute window
      });

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri(),
        response_type: "code",
        scope: REQUESTED_SCOPES,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
      });
      return { url: `${AUTHORIZE_URL}?${params.toString()}` };
    } catch (e) {
      // Re-throw with a logged message so the request ID has something
      // useful next to it instead of a bare "Server Error".
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[googleAuth.getAuthorizeUrl] failed:", msg);
      throw new Error(`getAuthorizeUrl: ${msg}`);
    }
  },
});

/** Exchange the `code` from the callback for access + refresh tokens,
 * look up the authorised email via OIDC userinfo, stash the blob in
 * Secret Manager, and stamp connection metadata on the user row. */
export const _completeOAuth = internalAction({
  args: { userId: v.id("users"), code: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const clientId = serverEnv.GOOGLE_CLIENT_ID;
    const clientSecret = serverEnv.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    // Exchange code for tokens
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: args.code,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }).toString(),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => "");
      throw new Error(`Token exchange failed: ${tokenRes.status} ${body}`);
    }
    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };
    if (!tokenData.refresh_token) {
      // Happens when the user previously authorised without forcing
      // consent. Clean up any stale secret and throw so the UI prompts
      // the user to revoke + retry — otherwise we'd store an access
      // token we can't ever refresh.
      throw new Error(
        "Google did not return a refresh_token. Revoke the old grant at " +
          "https://myaccount.google.com/permissions and try again.",
      );
    }

    // OIDC userinfo → grab the email that actually consented so we can
    // show "Connected as kemp@example.com" in settings and refuse if it
    // doesn't match the expected LifeOS identity.
    const userinfoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userinfo = userinfoRes.ok
      ? ((await userinfoRes.json()) as { email?: string })
      : { email: undefined };

    const blob: GoogleTokenBlob = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
      token_type: tokenData.token_type,
      expires_at_ms: Date.now() + tokenData.expires_in * 1000,
    };

    await writeByokSecret(args.userId, SECRET_PROVIDER, JSON.stringify(blob));
    await ctx.runMutation(internal.googleAuthHelpers._markConnected, {
      userId: args.userId,
      email: userinfo.email ?? null,
    });
  },
});

/** Revoke the refresh_token upstream and clear our side. Called when
 * the user clicks Disconnect. */
export const disconnect = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const raw = await readByokSecret(userId, SECRET_PROVIDER);
    if (raw) {
      try {
        const blob = JSON.parse(raw) as GoogleTokenBlob;
        // Best-effort revoke — even if Google 400s (already revoked) we
        // still wipe our local copy below.
        await fetch(`${REVOKE_URL}?token=${encodeURIComponent(blob.refresh_token)}`, {
          method: "POST",
        }).catch(() => {});
      } catch {
        // fall through — stored blob was malformed, just wipe it
      }
    }
    // Overwriting with the sentinel string is how the existing BYOK
    // helpers signal "deleted" (readByokSecret returns null for it).
    await writeByokSecret(userId, SECRET_PROVIDER, "DELETED");
    await ctx.runMutation(internal.googleAuthHelpers._markDisconnected, { userId });
  },
});

/** Read + refresh the access token, returning a still-valid one. Called
 * by the Calendar sync action before every list request.
 *
 * Returns:
 *   • access-token string → use it
 *   • `null` → no secret stored or refresh failed for a transient reason;
 *     caller should mark the sync as errored and try again next tick
 *   • `"invalid_grant"` → refresh token was revoked/expired on Google's
 *     side; the caller must flip the user to disconnected so the cron
 *     stops hammering a dead token forever. We also tombstone the
 *     stored secret here so a subsequent read returns null. */
export async function getValidAccessToken(
  userId: Id<"users">,
): Promise<string | null | "invalid_grant"> {
  const raw = await readByokSecret(userId, SECRET_PROVIDER);
  if (!raw) return null;
  let blob: GoogleTokenBlob;
  try {
    blob = JSON.parse(raw) as GoogleTokenBlob;
  } catch {
    return null;
  }

  // Refresh ~60s before expiry so an in-flight request doesn't race the
  // hard boundary. Access tokens are 1 hour; that margin is plenty.
  if (blob.expires_at_ms > Date.now() + 60_000) {
    return blob.access_token;
  }

  const clientId = serverEnv.GOOGLE_CLIENT_ID;
  const clientSecret = serverEnv.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: blob.refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // `invalid_grant` = user revoked / refresh token expired. Wipe our
    // local copy and let the caller flip the user metadata so Settings
    // shows "disconnected" instead of a stale "connected" row that
    // never syncs.
    if (res.status === 400 && body.includes("invalid_grant")) {
      await writeByokSecret(userId as unknown as string, SECRET_PROVIDER, "DELETED");
      return "invalid_grant";
    }
    console.warn(`[googleAuth] refresh failed: ${res.status} ${body}`);
    return null;
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };

  const refreshed: GoogleTokenBlob = {
    ...blob,
    access_token: data.access_token,
    expires_at_ms: Date.now() + data.expires_in * 1000,
    scope: data.scope ?? blob.scope,
    token_type: data.token_type ?? blob.token_type,
  };
  await writeByokSecret(userId as unknown as string, SECRET_PROVIDER, JSON.stringify(refreshed));
  return refreshed.access_token;
}

// Re-export for admin gate checks elsewhere
export { isAdminEmail };
