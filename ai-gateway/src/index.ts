import { Hono } from "hono";
import { register } from "./routes/register.js";
import { proxy } from "./routes/proxy.js";
import { internal } from "./routes/internal.js";
import { auth } from "./routes/auth.js";
import { setup } from "./routes/setup.js";
import { podValidation } from "./middleware/podValidation.js";
import { redis } from "./services/redis.js";
import { startSync } from "./services/sync.js";
import { serve } from "@hono/node-server";
import { gatewayEnv } from "./env.js";
import type { AppEnv } from "./types.js";

const app = new Hono<AppEnv>();

// Auth verification — called by nginx auth_request, must be before podValidation
app.route("/auth", auth);

// Setup page — served at /_/setup, proxied from nginx via ExternalName service.
// Must be before podValidation since requests come from nginx, not from pods.
app.route("/_", setup);

// Health & readiness probes — before podValidation to avoid noisy logs
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/ready", async (c) => {
  try {
    const pong = await redis.ping();
    if (pong === "PONG") {
      return c.json({ status: "ready", redis: "connected" });
    }
    return c.json({ status: "not ready", redis: "unhealthy" }, 503);
  } catch (err) {
    return c.json({ status: "not ready", redis: "disconnected" }, 503);
  }
});

// Pod validation middleware for all routes
app.use("*", podValidation);

// Mount routes
app.route("/register", register);
app.route("/v1", proxy);
app.route("/internal", internal);

// Start background balance sync
startSync();

// Global error handlers so unhandled errors produce logs instead of silent crashes
process.on("uncaughtException", (err) => {
  console.error("[fatal] Uncaught exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[fatal] Unhandled rejection:", reason);
});

const port = gatewayEnv.PORT;

console.log(`[ai-gateway] Starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`[ai-gateway] Listening on port ${port}`);
