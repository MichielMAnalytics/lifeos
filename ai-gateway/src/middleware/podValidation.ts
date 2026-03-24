import type { Context, Next } from "hono";
import { getConnInfo } from '@hono/node-server/conninfo'
import type { AppEnv } from "../types.js";

export async function podValidation(c: Context<AppEnv>, next: Next): Promise<Response | void> {
  const connInfo = getConnInfo(c);

  const sourceIp =
    connInfo.remote.address ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown";

  c.set("sourceIp", sourceIp);
  console.log(`[pod-validation] Request from IP: ${sourceIp}, path: ${c.req.path}`);

  await next();
}
