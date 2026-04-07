import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const OPENAI_AUTH_BASE = "https://auth.openai.com";
const OPENAI_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const DEVICE_CODE_URL = `${OPENAI_AUTH_BASE}/api/accounts/deviceauth/usercode`;
const DEVICE_POLL_URL = `${OPENAI_AUTH_BASE}/api/accounts/deviceauth/token`;
const TOKEN_EXCHANGE_URL = `${OPENAI_AUTH_BASE}/oauth/token`;
const VERIFICATION_URL = "https://auth.openai.com/codex/device";

/**
 * Step 1: Initiate OpenAI device code auth flow.
 * Returns a user code + verification URL for the user to complete in their browser.
 */
export const initiateDeviceCode = action({
  args: {},
  returns: v.object({
    deviceAuthId: v.string(),
    userCode: v.string(),
    interval: v.number(),
    verificationUrl: v.string(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const res = await fetch(DEVICE_CODE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: OPENAI_CLIENT_ID }),
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(
          "Device code login is not enabled for your ChatGPT account. " +
          "Enable it at chatgpt.com → Settings → Security → Device code login.",
        );
      }
      const errBody = await res.text();
      throw new Error(`Failed to initiate device code: ${res.status} ${errBody}`);
    }

    const data = (await res.json()) as {
      device_auth_id: string;
      user_code: string;
      interval?: number;
    };

    return {
      deviceAuthId: data.device_auth_id,
      userCode: data.user_code,
      interval: Number(data.interval) || 5,
      verificationUrl: VERIFICATION_URL,
    };
  },
});

/**
 * Step 2: Poll OpenAI to check if user completed the device code auth.
 * Returns "pending" while waiting, or "complete" with tokens on success.
 */
export const pollDeviceCode = action({
  args: {
    deviceAuthId: v.string(),
    userCode: v.string(),
  },
  returns: v.union(
    v.object({ status: v.literal("pending") }),
    v.object({ status: v.literal("complete"), tokens: v.string() }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Poll device auth endpoint
    const res = await fetch(DEVICE_POLL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_auth_id: args.deviceAuthId,
        user_code: args.userCode,
      }),
    });

    // 403/404 = user hasn't completed auth yet
    if (res.status === 403 || res.status === 404) {
      return { status: "pending" as const };
    }

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Device code poll failed: ${res.status} ${errBody}`);
    }

    // User completed auth -- we get an authorization code + PKCE params
    const rawData = await res.json();
    console.log("[openaiDeviceAuth] Poll success response keys:", Object.keys(rawData as object));
    const data = rawData as {
      authorization_code: string;
      code_verifier: string;
      redirect_uri?: string;
    };

    // Exchange authorization code for access + refresh tokens
    const params: Record<string, string> = {
      grant_type: "authorization_code",
      code: data.authorization_code,
      client_id: OPENAI_CLIENT_ID,
      code_verifier: data.code_verifier,
      redirect_uri: `${OPENAI_AUTH_BASE}/deviceauth/callback`,
    };
    const tokenRes = await fetch(TOKEN_EXCHANGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      throw new Error(`Token exchange failed: ${tokenRes.status} ${errBody}`);
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
    };

    return {
      status: "complete" as const,
      tokens: JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      }),
    };
  },
});
