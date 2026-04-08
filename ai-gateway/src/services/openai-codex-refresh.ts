import { getAccessToken } from "./keys.js";
import { gatewayEnv } from "../env.js";

const OPENAI_TOKEN_ENDPOINT = "https://auth.openai.com/oauth/token";
const OPENAI_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";

export interface CodexOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at?: number; // epoch ms
}

// In-memory cache: userId -> refreshed tokens
const tokenCache = new Map<string, CodexOAuthTokens>();

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
    // Handle tokens-only format
    if (typeof parsed.access_token === "string" && typeof parsed.refresh_token === "string") {
      return parsed as CodexOAuthTokens;
    }
    return null;
  } catch {
    return null;
  }
}

export function isTokenExpired(tokens: CodexOAuthTokens): boolean {
  if (!tokens.expires_at) return true;
  // Refresh 60s before expiry
  return Date.now() > tokens.expires_at - 60_000;
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
  // Check in-memory cache first
  const cached = tokenCache.get(userId);
  if (cached && !isTokenExpired(cached)) {
    return cached.access_token;
  }

  // Parse stored tokens
  const tokens = cached ?? parseCodexTokens(storedTokenJson);
  if (!tokens) {
    throw new Error("Invalid OpenAI OAuth token format");
  }

  // If not expired, cache and return
  if (!isTokenExpired(tokens)) {
    tokenCache.set(userId, tokens);
    return tokens.access_token;
  }

  // Refresh
  console.log(`[codex-refresh] Refreshing OpenAI Codex token for user ${userId.slice(0, 8)}...`);
  const refreshed = await refreshCodexToken(tokens.refresh_token);
  tokenCache.set(userId, refreshed);
  // Persist to GCP SM so tokens survive gateway restarts
  persistRefreshedTokens(userId, refreshed).catch(() => {});
  return refreshed.access_token;
}

async function persistRefreshedTokens(userId: string, tokens: CodexOAuthTokens): Promise<void> {
  try {
    const gcpToken = await getAccessToken();
    const secretName = `projects/${gatewayEnv.GCP_PROJECT_ID}/secrets/byok-${userId}-openai`;
    const payload = Buffer.from(JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })).toString("base64");

    // Add a new version with the refreshed tokens
    const res = await fetch(`https://secretmanager.googleapis.com/v1/${secretName}:addVersion`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gcpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: { data: payload } }),
    });

    if (!res.ok) {
      console.error(`[codex-refresh] Failed to persist refreshed tokens for ${userId.slice(0, 8)}...: ${res.status}`);
    } else {
      console.log(`[codex-refresh] Persisted refreshed tokens for ${userId.slice(0, 8)}...`);
    }
  } catch (err) {
    console.error(`[codex-refresh] Error persisting tokens for ${userId.slice(0, 8)}...:`, err);
  }
}

export function clearTokenCache(userId: string): void {
  tokenCache.delete(userId);
}
