import { Hono } from "hono";
import { redis, setupTokenKey } from "../services/redis.js";

const setup = new Hono();

// Served at /_/setup — nginx auth_request has already verified the user is
// authenticated and is the owner of this subdomain before the request reaches here.
setup.get("/setup", async (c) => {
  const host = c.req.header("host") ?? "";
  const subdomain = host.split(".")[0];

  if (!subdomain) {
    return c.text("Bad request", 400);
  }

  const gatewayToken = await redis.get(setupTokenKey(subdomain));

  if (!gatewayToken) {
    return c.html(
      `<!DOCTYPE html><html><head><title>Please wait...</title>` +
      `<meta http-equiv="refresh" content="5">` +
      `<style>body{font-family:monospace;background:#0f0d0b;color:#f4f4f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}` +
      `.msg{text-align:center;opacity:0.7}p{margin-top:8px;font-size:12px;color:#71717a}</style>` +
      `</head><body><div class="msg"><h2>Instance is starting up...</h2><p>This page will refresh automatically.</p></div></body></html>`,
      200,
    );
  }

  // Persist token in localStorage so the nginx-injected restore script can
  // re-inject it on subsequent page loads (OpenClaw strips it from the URL).
  // Then redirect with the token in the hash for the initial connection.
  return c.html(
    `<!DOCTYPE html>` +
    `<html><head><title>Setting up...</title></head><body>` +
    `<script>` +
    `localStorage.setItem("__clawnow_gw_token",${JSON.stringify(gatewayToken)});` +
    `location.replace("/#token="+encodeURIComponent(${JSON.stringify(gatewayToken)}))` +
    `</script>` +
    `</body></html>`,
    200,
  );
});

export { setup };
