import { Hono } from "hono";
import { systemKeyAuth } from "../middleware/auth.js";
import { seedBalance, addCredits, getBalance } from "../services/balance.js";
import { redis, userKey, balanceKey, rateLimitKey, ownerKey, setupTokenKey } from "../services/redis.js";
import { unregisterActivePod } from "../services/hostingTick.js";
import { k8sExec } from "../services/k8s-exec.js";

const internal = new Hono();

internal.use("*", systemKeyAuth);

internal.post("/seedBalance", async (c) => {
  const { podSecret, amount } = await c.req.json<{ podSecret: string; amount: number }>();
  console.log(`[internal] /seedBalance called with podSecret=${podSecret?.substring(0, 8)}... amount=${amount}`);

  if (!podSecret || amount == null) {
    console.error(`[internal] /seedBalance missing fields: podSecret=${!!podSecret} amount=${amount}`);
    return c.json({ error: "Missing required fields: podSecret, amount" }, 400);
  }

  await seedBalance(podSecret, amount);
  console.log(`[internal] /seedBalance completed for ${podSecret.substring(0, 8)}...: ${amount}`);
  return c.json({ ok: true, balance: amount });
});

internal.post("/addCredits", async (c) => {
  const { podSecret, amount } = await c.req.json<{ podSecret: string; amount: number }>();
  console.log(`[internal] /addCredits called with podSecret=${podSecret?.substring(0, 8)}... amount=${amount}`);

  if (!podSecret || amount == null) {
    console.error(`[internal] /addCredits missing fields: podSecret=${!!podSecret} amount=${amount}`);
    return c.json({ error: "Missing required fields: podSecret, amount" }, 400);
  }

  const newBalance = await addCredits(podSecret, amount);
  console.log(`[internal] /addCredits completed: added ${amount} for ${podSecret.substring(0, 8)}..., newBalance=${newBalance}`);
  return c.json({ ok: true, balance: newBalance });
});

internal.post("/updateUser", async (c) => {
  const { podSecret, apiKeySource } = await c.req.json<{ podSecret: string; apiKeySource: string }>();

  if (!podSecret || !apiKeySource) {
    return c.json({ error: "Missing required fields: podSecret, apiKeySource" }, 400);
  }

  await redis.hset(userKey(podSecret), { apiKeySource });
  console.log(`[internal] Updated user ${podSecret} apiKeySource to ${apiKeySource}`);
  return c.json({ ok: true });
});

internal.post("/cleanupUser", async (c) => {
  const { podSecret, subdomain } = await c.req.json<{ podSecret: string; subdomain?: string }>();

  if (!podSecret) {
    return c.json({ error: "Missing required field: podSecret" }, 400);
  }

  await unregisterActivePod(podSecret);
  const keysToDelete = [balanceKey(podSecret), userKey(podSecret), rateLimitKey(podSecret)];
  if (subdomain) {
    keysToDelete.push(ownerKey(subdomain));
    keysToDelete.push(setupTokenKey(subdomain));
  }
  await redis.del(...keysToDelete);
  console.log(`[internal] Cleaned up all keys for ${podSecret}${subdomain ? ` (subdomain: ${subdomain})` : ""}`);
  return c.json({ ok: true });
});

internal.get("/getBalance", async (c) => {
  const podSecret = c.req.query("podSecret");

  if (!podSecret) {
    return c.json({ error: "Missing required query param: podSecret" }, 400);
  }

  const balance = await getBalance(podSecret);
  return c.json({ podSecret, balance });
});

internal.post("/setModel", async (c) => {
  const { subdomain, modelRef } = await c.req.json<{ subdomain: string; modelRef: string }>();

  if (!subdomain || !modelRef) {
    return c.json({ error: "Missing required fields: subdomain, modelRef" }, 400);
  }

  const podName = `claw-${subdomain}-0`;

  // Node one-liner: read openclaw.json, update agents.defaults.model.primary, write back
  const script = [
    `const fs = require('fs');`,
    `const p = require('os').homedir() + '/.openclaw/openclaw.json';`,
    `const c = JSON.parse(fs.readFileSync(p, 'utf8'));`,
    `if (!c.agents) c.agents = {};`,
    `if (!c.agents.defaults) c.agents.defaults = {};`,
    `if (!c.agents.defaults.model) c.agents.defaults.model = {};`,
    `c.agents.defaults.model.primary = ${JSON.stringify(modelRef)};`,
    `fs.writeFileSync(p, JSON.stringify(c));`,
    `console.log('ok');`,
  ].join(" ");

  const result = await k8sExec(podName, ["node", "-e", script]);

  if (result.ok) {
    console.log(`[internal] Hot-switched model for ${subdomain} to ${modelRef}`);
  } else {
    console.error(`[internal] Hot-switch failed for ${subdomain}: ${result.stderr}`);
  }

  return c.json({ ok: result.ok, stderr: result.stderr });
});

export { internal };
