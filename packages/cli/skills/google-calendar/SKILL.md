---
name: google-calendar
description: "Read or write the user's Google Calendar via the LifeOS broker endpoint. Use any time the user asks to read events, check schedule, add/move/cancel a calendar event, prepare for a meeting, or anything that touches Google Calendar. NEVER read or write any local google-token.json — auth is centralised in LifeOS."
user-invocable: false
metadata: { "openclaw": { "emoji": "📅", "requires": { "bins": [] } } }
---

# Google Calendar (via LifeOS broker)

You access the user's Google Calendar by getting a fresh access token from LifeOS on every call. **Never read, write, or trust a local `google-token.json` file.** That file (if present in the workspace) is stale by definition — the source of truth is LifeOS Secret Manager, and the dashboard reconnect flow propagates here automatically.

## Where the LifeOS connection comes from

The pod is started with two env vars set by LifeOS at provisioning time:

- `LIFEOS_API_URL` — base URL. **Always read from `$LIFEOS_API_URL` at runtime. Never hardcode this URL into a script, config file, or workspace file. The host changes per environment (dev / prod / self-hosted) and per region, so any literal you bake in will break elsewhere.**
- `LIFEOS_API_KEY` — per-user Bearer token. Same rule: read from `$LIFEOS_API_KEY` at runtime, never hardcode.

A copy is also written by the init container to the user's home dir as `~/.lifeos/config.json` (resolved as `/home/node/.lifeos/config.json` inside the running container — the PVC is mounted at `/home/node`, not `/mnt/data`, despite the init container writing to `/mnt/data` against its own mount). The file is `{ "api_url": "...", "api_key": "..." }`. **Use the env vars first**, fall back to the file if env vars are missing.

When you write helper scripts that call the broker, read BOTH `api_url` and `api_key` from one of these sources at runtime:

1. `process.env.LIFEOS_API_URL` and `process.env.LIFEOS_API_KEY` (preferred — they're injected into the pod env)
2. `/home/node/.lifeos/config.json` (fields: `api_url`, `api_key`)

Never hardcode the broker URL. Never construct it from a half-remembered example. The host varies per environment and changes when the deployment moves regions. Build the full token endpoint by appending `/api/v1/google-calendar/access-token` to whichever `api_url` you read.

Example fallback (Node):

```js
const apiUrl = process.env.LIFEOS_API_URL ?? JSON.parse(require('fs').readFileSync('/home/node/.lifeos/config.json', 'utf8')).api_url;
const apiKey = process.env.LIFEOS_API_KEY ?? JSON.parse(require('fs').readFileSync('/home/node/.lifeos/config.json', 'utf8')).api_key;
const tokenUrl = `${apiUrl.replace(/\/$/, '')}/api/v1/google-calendar/access-token`;
```

If you've already written a `google-calendar-config.json` cache anywhere, delete it.

If neither exists, LifeOS hasn't provisioned this pod yet — tell the user "Calendar isn't connected to LifeOS in this workspace. Reconnect at app.lifeos.zone/settings."

## The one call that gets you a token

```bash
curl -sS -H "Authorization: Bearer $LIFEOS_API_KEY" \
  "$LIFEOS_API_URL/api/v1/google-calendar/access-token"
```

Returns one of:

```json
// 200 — use access_token directly with Google Calendar API
{ "access_token": "ya29...", "expires_at_ms": 1777200000000 }

// 409 — Calendar is disconnected on the dashboard. User action required.
{ "error": "calendar_disconnected", "reason": "invalid_grant" | "not_connected",
  "reconnect_url": "https://app.lifeos.zone/settings" }

// 502 — transient Google refresh failure (5xx, network). Retry with backoff.
{ "error": "transient_upstream", "retry": true }

// 503 — server-side misconfiguration. NOT the user's fault. Don't ask them
// to reconnect; tell them to ping support.
{ "error": "no_credentials" }
```

Cache the access token in memory until `expires_at_ms - 60_000` ms before re-fetching. Never persist it.

## On 409

Don't loop. Tell the user verbatim:

> Your Google Calendar isn't connected. Reconnect at app.lifeos.zone/settings — once you do, I'll have access automatically (no need to send me anything).

Then stop trying calendar tools until they confirm.

## On 401 from the broker (LifeOS auth bad)

Means the per-user `LIFEOS_API_KEY` is wrong or revoked. Tell the user:

> Something is off with my LifeOS connection — the API key seems wrong. Tell Kemp / Michiel; you don't need to do anything yourself.

Don't ask the user for a new key — you should never accept calendar tokens by hand from the user.

## On 502 (transient_upstream)

Google's token endpoint had a hiccup. Don't tell the user to reconnect. Just retry with backoff: 1s, 3s, 9s. If three retries all fail, surface a one-liner:

> Google had a hiccup refreshing the calendar token. Try again in a minute.

## On 503 (no_credentials)

Server-side misconfig (LifeOS missing GOOGLE_CLIENT_ID/SECRET). NOT the user's fault. Don't ask them to reconnect — that won't fix it. Surface:

> LifeOS is missing the Google OAuth credentials on the server. Ping Kemp / Michiel.

## Calendar API calls (after you have access_token)

Use the standard Google Calendar v3 REST API with `Authorization: Bearer <access_token>`. Common endpoints:

- `GET https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=...&timeMax=...&singleEvents=true&orderBy=startTime`
- `POST https://www.googleapis.com/calendar/v3/calendars/primary/events` (create — gate on user approval)
- `PATCH https://www.googleapis.com/calendar/v3/calendars/primary/events/{id}` (update — gate on user approval)
- `DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/{id}` (delete — gate on user approval)

Default `calendarId` is `"primary"`.

## Wipe stale tokens

If you find a `google-token.json` lying around in the workspace (`/home/node/.openclaw/workspace/google-token.json` or similar), delete it. Don't read it. It's a leftover from a previous self-bootstrapped flow and will go stale.

## What NOT to do

- Don't ask the user for OAuth client IDs, refresh tokens, or any kind of credential file. The LifeOS dashboard handles all of that.
- Don't write any token, refresh_token, or client secret to disk inside the pod.
- Don't use a different OAuth client than the one LifeOS owns — there isn't one.
- Don't tell the user to "paste a token here" or similar. Calendar auth is a one-click dashboard flow.

## Approval

Calendar reads are low-risk. Creating, updating, or deleting events is mid-risk and requires explicit user approval before the API call (per the Operator AI approval framework).
