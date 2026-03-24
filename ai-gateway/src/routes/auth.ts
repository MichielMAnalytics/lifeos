import { Hono } from "hono";
import { html } from "hono/html";
import { redis, ownerKey } from "../services/redis.js";

const auth = new Hono();

export const OAUTH2_PROXY_AUTH_URL =
  "http://oauth2-proxy.clawnow-system.svc.cluster.local/oauth2/auth";

/**
 * Verify authentication via oauth2-proxy and check email ownership.
 * Returns `{ authed: true, email }` on success, or `{ authed: false, reason }` on failure.
 */
export async function verifyAuth(
  cookie: string,
  host: string,
  subdomain: string,
): Promise<
  | { authed: true; email: string }
  | { authed: false; reason: "no_session" | "service_unavailable" | "no_owner" | "email_mismatch"; cookieDomain?: string }
> {
  let proxyRes: Response;
  try {
    proxyRes = await fetch(OAUTH2_PROXY_AUTH_URL, {
      headers: { Cookie: cookie, Host: host },
      redirect: "manual",
    });
  } catch {
    return { authed: false, reason: "service_unavailable" };
  }

  if (!proxyRes.ok) {
    return { authed: false, reason: "no_session" };
  }

  const authedEmail =
    proxyRes.headers.get("x-auth-request-email") ??
    proxyRes.headers.get("gap-auth") ??
    "";
  const ownerEmail = await redis.get(ownerKey(subdomain));

  if (!ownerEmail) {
    return { authed: false, reason: "no_owner" };
  }

  if (authedEmail.toLowerCase() !== ownerEmail.toLowerCase()) {
    const cookieDomain = "." + host.split(".").slice(1).join(".");
    return { authed: false, reason: "email_mismatch", cookieDomain };
  }

  return { authed: true, email: authedEmail };
}

auth.get("/verify", async (c) => {
  // nginx ingress auth_request passes the original host via X-Original-URL
  const originalUrl = c.req.header("x-original-url") ?? "";
  let host = "";
  if (originalUrl) {
    try { host = new URL(originalUrl).hostname; } catch {}
  }
  if (!host) {
    host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? "";
  }
  const subdomain = host.split(".")[0];

  if (!subdomain) {
    return c.text("Missing subdomain", 400);
  }

  const cookie = c.req.header("cookie") ?? "";
  const result = await verifyAuth(cookie, host, subdomain);

  if (!result.authed) {
    switch (result.reason) {
      case "service_unavailable":
        return c.text("Auth service unavailable", 502);
      case "no_session":
        return c.body(null, 401);
      case "no_owner":
        return c.text("Instance not ready", 403);
      case "email_mismatch":
        return c.body(null, 401, {
          "Set-Cookie": `_clawnow_auth=; Path=/; Domain=${result.cookieDomain}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`,
        });
    }
  }

  return c.body(null, 200, {
    "X-Auth-Request-Email": result.authed ? result.email : "",
  });
});

// Login page — shown when nginx auth_request returns 401 (no session or account mismatch).
// Serves a branded page with a Google sign-in button instead of immediately
// redirecting to Google, giving the user context about what they're signing into.
auth.get("/login", (c) => {
  const rd = c.req.query("rd") || "/";

  // Derive the auth domain from the redirect URL
  let oauthStartUrl = "#";
  try {
    const rdHost = new URL(rd).hostname;
    const domain = rdHost.split(".").slice(1).join(".");
    oauthStartUrl = `https://auth.${domain}/oauth2/start?rd=${encodeURIComponent(rd)}`;
  } catch { /* fallback: button stays disabled */ }

  return c.html(loginPage(oauthStartUrl));
});

function loginPage(oauthStartUrl: string) {
  return html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in — Claw Now</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', monospace;
      background: #0f0d0b;
      color: #f4f4f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .grid-bg {
      position: fixed; inset: 0; opacity: 0.03; pointer-events: none;
      background-image:
        linear-gradient(to right, white 1px, transparent 1px),
        linear-gradient(to bottom, white 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .wrapper {
      position: relative; width: 100%; max-width: 360px; margin: 0 16px;
    }
    .accent-line {
      height: 2px;
      background: linear-gradient(to right, transparent, rgba(244,244,245,0.4), transparent);
    }
    .card {
      background: #171412;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 40px 32px 32px;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
    }
    .card-inner {
      display: flex; flex-direction: column; align-items: center; text-align: center;
    }
    .lock-icon {
      width: 36px; height: 36px; margin-bottom: 24px; opacity: 0.6;
    }
    h1 {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 14px; font-weight: 500; letter-spacing: -0.01em;
      margin-bottom: 4px;
    }
    h1 span { color: rgba(122, 154, 240, 0.7); }
    .subtitle {
      font-size: 11px; color: rgba(113,113,122,0.7); margin-bottom: 24px;
      line-height: 1.5;
    }
    .google-btn {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      width: 100%; height: 40px;
      background: white; color: #374151;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px; font-weight: 500;
      border: none; border-radius: 6px;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
      cursor: pointer; text-decoration: none;
      transition: all 150ms;
    }
    .google-btn:hover { background: #f9fafb; box-shadow: 0 0 0 1px rgba(0,0,0,0.2); }
    .google-btn:active { transform: scale(0.99); }
    .google-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
    .footer {
      margin-top: 24px; text-align: center;
      font-size: 10px; color: rgba(113,113,122,0.4);
      text-transform: uppercase; letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="wrapper">
    <div class="accent-line"></div>
    <div class="card">
      <div class="card-inner">
        <svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <h1>Sign in to Claw<span>Now</span></h1>
        <p class="subtitle">
          This instance is protected. Please sign in with the
          Google account that owns it.
        </p>
        <a href="${oauthStartUrl}" class="google-btn">
          <svg viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>
      </div>
    </div>
    <p class="footer">Secured by Azin</p>
  </div>
</body>
</html>`;
}

export { auth };
