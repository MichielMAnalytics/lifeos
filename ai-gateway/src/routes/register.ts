import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { redis, userKey, ownerKey, setupTokenKey } from "../services/redis.js";
import { registerActivePod } from "../services/hostingTick.js";
import { gatewayEnv } from "../env.js";
import type { AppEnv } from "../types.js";

const register = new Hono<AppEnv>();

interface RegisterBody {
  podSecret: string;
  subdomain: string;
  userId: string;
  apiKeySource: string;
  ownerEmail: string;
  gatewayToken?: string;
}

register.post("/", async (c) => {
  // 1. Validate Authorization header
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }

  const body = await c.req.json<RegisterBody>();
  console.log(`[register] Registration request: subdomain=${body.subdomain} userId=${body.userId} apiKeySource=${body.apiKeySource} podSecret=${body.podSecret?.substring(0, 8)}...`);

  if (!body.podSecret || !body.subdomain || !body.userId) {
    console.error(`[register] Missing fields: podSecret=${!!body.podSecret} subdomain=${!!body.subdomain} userId=${!!body.userId}`);
    return c.json({ error: "Missing required fields: podSecret, subdomain, userId" }, 400);
  }

  const sourceIp = c.get("sourceIp") as string;

  // 2. Forward JWT to Convex for verification + status update
  const convexSiteUrl = gatewayEnv.CONVEX_SITE_URL;
  if (!convexSiteUrl) {
    console.error("[register] CONVEX_SITE_URL not configured");
    return c.json({ error: "Server misconfigured" }, 500);
  }

  const convexRes = await fetch(`${convexSiteUrl}/api/registerPod`, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ podIp: sourceIp }),
  });

  if (!convexRes.ok) {
    const errText = await convexRes.text();
    console.error(`[register] Convex registerPod failed: ${convexRes.status} ${errText}`);
    return c.json({ error: "Registration verification failed" }, convexRes.status as ContentfulStatusCode);
  }

  // 3. Convex verified the JWT — safe to register in Redis
  await redis.hset(userKey(body.podSecret), {
    userId: body.userId,
    apiKeySource: body.apiKeySource ?? "platform",
    subdomain: body.subdomain,
    sourceIp,
  });
  console.log(`[register] Stored user data in Redis key=${userKey(body.podSecret)}`);

  // Store owner email for auth verification
  if (body.ownerEmail) {
    await redis.set(ownerKey(body.subdomain), body.ownerEmail);
    console.log(`[register] Stored owner email for subdomain=${body.subdomain}`);
  }

  // Store gateway token for auth-gated setup page
  if (body.gatewayToken) {
    await redis.set(setupTokenKey(body.subdomain), body.gatewayToken);
    console.log(`[register] Stored setup token for subdomain=${body.subdomain}`);
  }

  await registerActivePod(body.podSecret);

  console.log(`[register] Registered pod ${body.subdomain} for user ${body.userId}`);
  return c.json({ ok: true }, 200);
});

export { register };
