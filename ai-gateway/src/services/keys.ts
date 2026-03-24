import { redis, userKey } from "./redis.js";
import { gatewayEnv } from "../env.js";

interface CachedKey {
  key: string;
  expiresAt: number;
}

const KEY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const keyCache = new Map<string, CachedKey>();

const PLATFORM_KEY_MAP: Record<string, "OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "GOOGLE_API_KEY" | "MOONSHOT_API_KEY" | "MINIMAX_API_KEY"> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  moonshot: "MOONSHOT_API_KEY",
  minimax: "MINIMAX_API_KEY",
};

export function getPlatformKey(provider: string): string {
  const envVar = PLATFORM_KEY_MAP[provider];
  if (!envVar) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  const key = gatewayEnv[envVar];
  if (!key) {
    throw new Error(`Platform key not configured for provider: ${provider} (env: ${envVar})`);
  }
  return key;
}

// GCP metadata server token for Workload Identity
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token;
  }

  const res = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } },
  );

  if (!res.ok) {
    throw new Error(`Failed to get GCP access token: ${res.status}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

async function fetchSecretFromGCP(secretName: string): Promise<string> {
  const token = await getAccessToken();
  const url = `https://secretmanager.googleapis.com/v1/${secretName}:access`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Secret Manager API error for ${secretName}: ${res.status}`);
  }

  const data = await res.json() as { payload: { data: string } };
  return Buffer.from(data.payload.data, "base64").toString("utf-8");
}

async function getBYOKey(userId: string, provider: string): Promise<string | null> {
  const cacheKey = `${userId}:${provider}`;
  const cached = keyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  const secretName = `projects/${gatewayEnv.GCP_PROJECT_ID}/secrets/byok-${userId}-${provider}/versions/latest`;
  try {
    const key = await fetchSecretFromGCP(secretName);
    if (key === "DELETED") return null;

    keyCache.set(cacheKey, {
      key,
      expiresAt: Date.now() + KEY_CACHE_TTL_MS,
    });

    return key;
  } catch {
    return null;
  }
}

export async function resolveKey(podSecret: string, provider: string): Promise<{ key: string; isBYOK: boolean }> {
  const userInfo = await redis.hgetall(userKey(podSecret));
  const apiKeySource = userInfo?.apiKeySource ?? "platform";

  if (apiKeySource === "byok") {
    const userId = userInfo?.userId;
    if (!userId) throw new Error("userId not found in Redis for BYOK lookup");
    const key = await getBYOKey(userId, provider);
    if (key) {
      return { key, isBYOK: true };
    }
    throw new Error(`No ${provider} API key configured. Please add your ${provider} API key in the ClawNow dashboard.`);
  }

  return { key: getPlatformKey(provider), isBYOK: false };
}
