import { getAccessToken } from "./keys.js";
import { gatewayEnv } from "../env.js";

const OPENAI_TOKEN_ENDPOINT = "https://auth.openai.com/oauth/token";
const OPENAI_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";

// Cross-replica refresh coordination.
// LOCK_TTL_MS is generous: a single OpenAI token refresh is normally <1s,
// but we allow slow networks + SM writes to complete before the TTL expires.
const LOCK_TTL_MS = 30_000;
// Budget for a lock-losing replica to wait for the lock-holder's SM write
// to land and return the freshly-refreshed token.
const WAIT_FOR_OTHER_REPLICA_MS = 5_000;
const WAIT_POLL_INTERVAL_MS = 250;

export interface CodexOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at?: number; // epoch ms
}

// In-memory cache: userId -> refreshed tokens
const tokenCache = new Map<string, CodexOAuthTokens>();

// In-process singleflight: userId -> in-flight refresh promise.
// Prevents two concurrent requests in the SAME replica from both firing
// refresh calls (which would race on the rotating refresh_token).
const inflightRefreshes = new Map<string, Promise<CodexOAuthTokens>>();

export function parseCodexTokens(stored: string): CodexOAuthTokens | null {
  try {
    const parsed = JSON.parse(stored);
    // Handle full auth.json format (from ~/.codex/auth.json)
    if (parsed.tokens?.access_token) {
      return {
        access_token: parsed.tokens.access_token,
        refresh_token: parsed.tokens.refresh_token,
      };
    }
    // Handle tokens-only format (with optional expires_at)
    if (typeof parsed.access_token === "string" && typeof parsed.refresh_token === "string") {
      return {
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
        expires_at: typeof parsed.expires_at === "number" ? parsed.expires_at : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function extractJwtExpiry(accessToken: string): number | undefined {
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return undefined;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof payload.exp === "number") return payload.exp * 1000; // epoch ms
    return undefined;
  } catch {
    return undefined;
  }
}

export function isTokenExpired(tokens: CodexOAuthTokens): boolean {
  // Use explicit expires_at if available
  if (tokens.expires_at) {
    return Date.now() > tokens.expires_at - 60_000;
  }
  // Fall back to JWT exp claim
  const jwtExpiry = extractJwtExpiry(tokens.access_token);
  if (jwtExpiry) {
    return Date.now() > jwtExpiry - 60_000;
  }
  // Unknown expiry — assume expired to trigger refresh
  return true;
}

export async function refreshCodexToken(refreshToken: string): Promise<CodexOAuthTokens> {
  const res = await fetch(OPENAI_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: OPENAI_CLIENT_ID,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI token refresh failed: ${res.status} ${errBody}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: data.expires_in
      ? Date.now() + data.expires_in * 1000
      : Date.now() + 3600_000,
  };
}

export async function getValidAccessToken(userId: string, storedTokenJson: string): Promise<string> {
  // Fast path: in-memory cache
  const cached = tokenCache.get(userId);
  if (cached && !isTokenExpired(cached)) {
    return cached.access_token;
  }

  // Parse stored tokens from Secret Manager
  const tokens = cached ?? parseCodexTokens(storedTokenJson);
  if (!tokens) {
    throw new Error("Invalid OpenAI OAuth token format");
  }

  // If the stored (or cached) tokens are still valid, cache and return.
  if (!isTokenExpired(tokens)) {
    tokenCache.set(userId, tokens);
    return tokens.access_token;
  }

  // Expired — coordinate the refresh across concurrent callers and replicas.
  const existing = inflightRefreshes.get(userId);
  if (existing) {
    const result = await existing;
    return result.access_token;
  }

  const refreshPromise = doCoordinatedRefresh(userId, tokens);
  inflightRefreshes.set(userId, refreshPromise);
  try {
    const refreshed = await refreshPromise;
    return refreshed.access_token;
  } finally {
    inflightRefreshes.delete(userId);
  }
}

async function doCoordinatedRefresh(userId: string, currentTokens: CodexOAuthTokens): Promise<CodexOAuthTokens> {
  const lockResult = await acquireConvexLock(userId, LOCK_TTL_MS);

  if (!lockResult.acquired) {
    // Another replica (or a very recent refresh on our replica that cleared
    // in-memory cache) is refreshing. Wait for their SM write, then return.
    return await waitForOtherReplicaRefresh(userId, currentTokens);
  }

  // If the refresh succeeds at OpenAI but we then fail to persist to SM,
  // the refresh_token has already rotated upstream and only the in-memory
  // cache holds the new one. Releasing the lock in that state would let
  // another replica try to refresh with the now-dead token. Keep the lock
  // (let its TTL expire) so callers wait until we recover or the TTL clears.
  let keepLock = false;
  try {
    // Re-read latest SM version — another replica may have already
    // refreshed between our cache check and lock acquisition.
    const latest = await readLatestTokensFromSM(userId);
    if (latest && !isTokenExpired(latest)) {
      tokenCache.set(userId, latest);
      return latest;
    }

    // Use the freshest refresh_token we have — prefer SM latest (may contain
    // a rotation another replica persisted before dying) over caller-supplied.
    const sourceTokens = latest ?? currentTokens;
    console.log(`[codex-refresh] Refreshing OpenAI Codex token for user ${userId.slice(0, 8)}...`);
    const refreshed = await refreshCodexToken(sourceTokens.refresh_token);

    // Once OpenAI has rotated the token, the old one is dead. From here on,
    // the lock must not be released unless SM is also updated.
    keepLock = true;
    await persistRefreshedTokens(userId, refreshed);
    keepLock = false; // SM is now in sync with OpenAI; safe to release.

    tokenCache.set(userId, refreshed);
    return refreshed;
  } finally {
    if (!keepLock) {
      releaseConvexLock(userId).catch((err) => {
        console.error(`[codex-refresh] Failed to release lock for ${userId.slice(0, 8)}...:`, err);
      });
    } else {
      console.warn(`[codex-refresh] Keeping lock for ${userId.slice(0, 8)}... (persist failed after OpenAI rotation); TTL will expire naturally`);
    }
  }
}

async function waitForOtherReplicaRefresh(
  userId: string,
  fallback: CodexOAuthTokens,
): Promise<CodexOAuthTokens> {
  const start = Date.now();
  while (Date.now() - start < WAIT_FOR_OTHER_REPLICA_MS) {
    await new Promise((r) => setTimeout(r, WAIT_POLL_INTERVAL_MS));
    const latest = await readLatestTokensFromSM(userId);
    if (latest && !isTokenExpired(latest)) {
      tokenCache.set(userId, latest);
      return latest;
    }
  }
  // The other replica didn't finish in time. As a last resort, return the
  // fallback (which is expired) — the next OpenAI call will surface a 401
  // and the caller will re-authenticate.
  console.warn(`[codex-refresh] Timed out waiting for another replica to refresh user ${userId.slice(0, 8)}...`);
  return fallback;
}

async function readLatestTokensFromSM(userId: string): Promise<CodexOAuthTokens | null> {
  try {
    const gcpToken = await getAccessToken();
    const secretName = `projects/${gatewayEnv.GCP_PROJECT_ID}/secrets/byok-${userId}-openai/versions/latest`;
    const res = await fetch(`https://secretmanager.googleapis.com/v1/${secretName}:access`, {
      headers: { Authorization: `Bearer ${gcpToken}` },
    });
    if (!res.ok) return null;
    const body = await res.json() as { payload?: { data?: string } };
    const b64 = body.payload?.data;
    if (!b64) return null;
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    return parseCodexTokens(decoded);
  } catch (err) {
    console.error(`[codex-refresh] Failed to read latest tokens from SM for ${userId.slice(0, 8)}...:`, err);
    return null;
  }
}

async function persistRefreshedTokens(userId: string, tokens: CodexOAuthTokens): Promise<void> {
  try {
    const gcpToken = await getAccessToken();
    const secretName = `projects/${gatewayEnv.GCP_PROJECT_ID}/secrets/byok-${userId}-openai`;
    const payload = Buffer.from(JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
    })).toString("base64");

    const res = await fetch(`https://secretmanager.googleapis.com/v1/${secretName}:addVersion`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gcpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: { data: payload } }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Failed to persist refreshed tokens: ${res.status} ${errBody}`);
    }
    console.log(`[codex-refresh] Persisted refreshed tokens for ${userId.slice(0, 8)}...`);
  } catch (err) {
    // Surface — we must not release the lock if persist failed, otherwise
    // another replica could try to refresh with the now-dead refresh_token.
    console.error(`[codex-refresh] Error persisting tokens for ${userId.slice(0, 8)}...:`, err);
    throw err;
  }
}

async function acquireConvexLock(userId: string, ttlMs: number): Promise<{ acquired: boolean; heldUntil?: number; reason?: string }> {
  const convexSiteUrl = gatewayEnv.CONVEX_SITE_URL;
  const systemKey = gatewayEnv.GATEWAY_SYSTEM_KEY;
  if (!convexSiteUrl || !systemKey) {
    // If Convex coordination is not configured, behave as if we acquired —
    // this preserves prior (racy) behavior in environments without Convex.
    console.warn("[codex-refresh] CONVEX_SITE_URL or GATEWAY_SYSTEM_KEY not set; skipping cross-replica lock");
    return { acquired: true };
  }
  try {
    const res = await fetch(`${convexSiteUrl}/api/openaiOAuthLock/acquire`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-System-Key": systemKey,
      },
      body: JSON.stringify({ userId, ttlMs }),
    });
    if (!res.ok) {
      console.error(`[codex-refresh] Lock acquire returned ${res.status}; proceeding without cross-replica lock`);
      return { acquired: true };
    }
    return (await res.json()) as { acquired: boolean; heldUntil?: number; reason?: string };
  } catch (err) {
    console.error("[codex-refresh] Lock acquire failed; proceeding without cross-replica lock:", err);
    return { acquired: true };
  }
}

async function releaseConvexLock(userId: string): Promise<void> {
  const convexSiteUrl = gatewayEnv.CONVEX_SITE_URL;
  const systemKey = gatewayEnv.GATEWAY_SYSTEM_KEY;
  if (!convexSiteUrl || !systemKey) return;
  const res = await fetch(`${convexSiteUrl}/api/openaiOAuthLock/release`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-System-Key": systemKey,
    },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    throw new Error(`Lock release returned ${res.status}`);
  }
}

export function clearTokenCache(userId: string): void {
  tokenCache.delete(userId);
}
