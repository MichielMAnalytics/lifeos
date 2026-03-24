import type { Context, Next } from "hono";
import { gatewayEnv } from "../env.js";

export async function systemKeyAuth(c: Context, next: Next): Promise<Response | void> {
  const systemKey = gatewayEnv.GATEWAY_SYSTEM_KEY;
  if (!systemKey) {
    console.error("[auth] GATEWAY_SYSTEM_KEY not configured");
    return c.json({ error: "Server misconfigured" }, 500);
  }

  const providedKey = c.req.header("X-System-Key");
  if (!providedKey || providedKey !== systemKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
}
