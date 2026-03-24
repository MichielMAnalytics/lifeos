# LifeOS Hosted Deployment with OpenClaw AI Gateway

## Architecture

```
Azin: LifeOS dashboard (ONLY frontend)
  ├── Landing page, billing, onboarding
  ├── Tasks, goals, journals, plan, ideas, reviews (Convex)
  └── AI Agent page: deploy/config/channels/chat (Convex + gateway WS)

Convex cloud: single unified backend
  ├── LifeOS tables (tasks, goals, journals, etc.)
  ├── Deployment tables (from ClawNow: deployments, subscriptions, etc.)
  └── K8s orchestration (from ClawNow: create/delete pods via GKE API)

GKE pods: OpenClaw headless ONLY (no UI, no LifeOS code)
  └── Exact same Docker image as ClawNow, controlUi disabled
  └── AI gateway on port 8080
```

Browser connects to TWO backends:
- **Convex cloud** — all LifeOS data + deployment management
- **gw-{id}.domain** — OpenClaw gateway API (WebSocket, cross-origin)

Cross-origin browser→pod networking is already proven by ClawNow's InstanceTools.

## Key Decisions

- **Keep Next.js 15** — LifeOS has 29 sections, App Router, layout system. Porting ~12 ClawNow React components into Next.js is trivial. The reverse would be massive.
- **Deploy on Azin** — Dashboard runs as a containerized Next.js app deployed via `zin` CLI. Needs a Dockerfile with `output: 'standalone'`.
- **Single Convex project** — LifeOS data tables + ClawNow deployment/billing tables merged into one schema.
- **No code inside the pod** — Pod runs the exact same OpenClaw Docker image ClawNow already uses.

---

## Phase 1: Infrastructure & Codebase Merge

**Goal**: LifeOS dashboard deployable on Azin, single Convex project with all tables, infra code ready.

### 1.1 LifeOS Dockerfile

**Create**: `Dockerfile`

Multi-stage Next.js standalone build:
- Stage 1 (builder): node:22-bookworm-slim, install pnpm, copy monorepo, `pnpm install --frozen-lockfile`, build dashboard with `output: 'standalone'`
- Stage 2 (runner): node:22-bookworm-slim, copy `.next/standalone`, `.next/static`, `public/`. CMD `node server.js` on port 3000.

**Modify**: `packages/dashboard/next.config.ts` — add `output: 'standalone'`

### 1.2 Azin service config

**Create**: `azin.yaml` (or configure via `zin setup`)

Service definition for the Next.js dashboard:
- Type: web
- Port: 3000
- Build: Dockerfile
- Env: `NEXT_PUBLIC_CONVEX_URL`

### 1.3 Stripe component

**Create**: `convex/convex.config.ts` — register `@convex-dev/stripe` component

**Modify**: `package.json` — add `@convex-dev/stripe`, `stripe`

### 1.4 Schema merge — add 6 tables

**Modify**: `convex/schema.ts`

| New Table | Purpose | Indexes |
|---|---|---|
| `balances` | User credit balances | `by_userId` |
| `subscriptions` | Stripe subscriptions | `by_userId`, `by_stripeSubscriptionId` |
| `deploymentSettings` | BYOK keys, model, channel tokens (renamed from ClawNow's `userSettings`) | `by_userId` |
| `deployments` | Pod status, subdomain, gatewayToken | `by_userId`, `by_subdomain`, `by_podSecret`, `by_status` |
| `coupons` | Promo codes | `by_code` |
| `couponRedemptions` | Redemption log | `by_couponId_userId`, `by_userId` |

### 1.5 Port ClawNow Convex backend

**Create** (all in `convex/`):

| File | Source | Purpose | Key changes |
|---|---|---|---|
| `env.ts` | ClawNow | Server env parsing, plan definitions | `CLAWNOW_DOMAIN` → `LIFEOS_DOMAIN` |
| `stripe.ts` | ClawNow | Subscription + credit management | `userSettings` → `deploymentSettings` |
| `deploymentQueries.ts` | ClawNow `deployments.ts` | Deployment queries | None (renamed to avoid clash with existing file if any) |
| `deploymentActions.ts` | ClawNow | Deploy/restart/destroy via K8s API | `userSettings` → `deploymentSettings` |
| `k8s.ts` | ClawNow | Raw GKE API calls | Namespace: `clawnow-users` → `lifeos-users` |
| `deploymentSettings.ts` | ClawNow `userSettings.ts` | Settings queries/mutations | Rename table + function references |
| `deploymentHealthCheck.ts` | ClawNow | Health polling | Domain references |
| `stripeCheckout.ts` | ClawNow | Checkout session creation | `userSettings` → `deploymentSettings` |
| `coupons.ts` | ClawNow | Coupon redemption | None |
| `modelProxy.ts` | ClawNow | Model proxy config | None |
| `adminCleanup.ts` | ClawNow | Admin maintenance | Namespace references |

### 1.6 Extend HTTP router

**Modify**: `convex/http.ts` — add routes from ClawNow:
- Stripe webhook: `POST /stripe/webhook`
- Pod registration: `POST /api/registerPod`
- Balance sync: `POST /api/syncBalances`
- Suspension: `POST /api/suspendDeployment`
- Desired state: `GET /api/getDesiredState`

### 1.7 Port infrastructure

**Create**: `infra/` — copy from `clawnow/infra/`

Changes:
- `index.ts` — stack name `clawnow` → `lifeos`
- `namespaces.ts` — `clawnow-system`/`clawnow-users` → `lifeos-system`/`lifeos-users`
- `gateway.ts` — domain refs, callback URLs → LifeOS Convex deployment
- `Pulumi.dev.yaml` / `Pulumi.prod.yaml` — domain, project refs
- `package.json` — name update

**Modify**: `pnpm-workspace.yaml` — add `infra`

### 1.8 Shared types

**Modify**: `packages/shared/types.ts` — add:
- `DeploymentStatus` union type
- `SubscriptionPlanType` union type
- `ApiKeySource` union type

### Acceptance Criteria
- [ ] `pnpm run dev:convex` starts without schema errors
- [ ] `pnpm run check` passes
- [ ] All existing LifeOS features work unchanged
- [ ] `docker build .` produces a working Next.js image
- [ ] `zin deploy` deploys the dashboard on Azin
- [ ] New Convex tables exist (empty)
- [ ] Stripe webhook endpoint registered

### Parallelism
- 1.1 + 1.2 (Dockerfile/Azin) can run in parallel with 1.3-1.6 (Convex merge)
- 1.7 (infra) is independent of everything else
- 1.8 can run in parallel with anything

---

## Phase 2: Deployment Integration (Frontend)

**Goal**: "AI Agent" page in LifeOS nav with full deploy/manage flow.

### 2.1 Dashboard dependencies

**Modify**: `packages/dashboard/package.json` — add:
- `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links` (terminal)

### 2.2 Add "AI Agent" to nav system

**Modify**:
- `src/components/nav.tsx` — add `'ai-agent': { label: 'AI Agent', abbr: 'Ai' }` to `allPages`
- `src/components/nav-marks.tsx` — add `MarkAiAgent` SVG icon
- `src/lib/presets.ts` — add `'ai-agent'` as a `PageKey` with presets
- `src/lib/dashboard-config.tsx` — add `'ai-agent'` to `DEFAULT_NAV_ORDER`
- `convex/dashboardConfig.ts` — update default navOrder

### 2.3 AI Agent page route

**Create**: `src/app/(app)/ai-agent/page.tsx`

Queries `api.deploymentQueries.getMyDeployment`, `api.stripe.getMySubscription`, `api.deploymentSettings.getMySettings`. Renders:
- No settings → Onboarding
- Settings but no deployment → Config card
- Active deployment → Dashboard + model switcher + channels + API keys + instance tools

### 2.4 Port & restyle ClawNow components

**Create** (all in `src/components/ai-agent/`):

| File | Source | Restyling |
|---|---|---|
| `deployment-dashboard.tsx` | `DeploymentDashboard.tsx` | `bg-background`→`bg-bg`, `text-foreground`→`text-text`, etc. |
| `model-switcher.tsx` | `ModelSwitcher.tsx` | Same class renames |
| `channel-config.tsx` | `ChannelConfig.tsx` | Same class renames |
| `api-keys-byok.tsx` | `ApiKeys.tsx` + `ByokCredentials.tsx` | Same class renames |
| `custom-env-vars.tsx` | `CustomEnvVars.tsx` | Same class renames |
| `onboarding.tsx` | `Onboarding.tsx` | Same class renames |
| `config-card.tsx` | `ConfigCard.tsx` | Same class renames |
| `subscription-picker.tsx` | `SubscriptionPicker.tsx` | Same class renames |
| `instance-tools.tsx` | `InstanceTools.tsx` | Same class renames |
| `xterm-terminal.tsx` | `XtermTerminal.tsx` | Same class renames |
| `file-browser.tsx` | `FileBrowser.tsx` | Same class renames |
| `command-runner.tsx` | `CommandRunner.tsx` | Same class renames |
| `payment-status.tsx` | `PaymentStatus.tsx` | Same class renames |

All components also need:
- `import { api } from "../../convex/_generated/api"` → `import { api } from '@/lib/convex-api'`
- `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`
- `userSettings` → `deploymentSettings` in all API refs

### 2.5 Settings page summary

**Modify**: `src/app/(app)/settings/settings-client.tsx` — add "AI Agent" section showing deployment status badge + link to `/ai-agent`

### 2.6 Landing page

**Modify**: `src/app/page.tsx` — show marketing landing page for unauthenticated users

**Create**: `src/components/landing-page.tsx` — port from ClawNow's `LandingPage.tsx`, rethemed for LifeOS

### 2.7 UI primitives

Copy any missing UI primitives from ClawNow `src/components/ui/` to LifeOS `src/components/ui/`:
- `dialog.tsx`, `secret-input.tsx`, `password-input.tsx`, `copy-code.tsx`, `explosion-effect.tsx`
- Only copy what's needed by the ported components

### Acceptance Criteria
- [ ] "AI Agent" appears in sidebar nav
- [ ] Onboarding → Stripe checkout → auto-deploy works
- [ ] Status badge shows provisioning → starting → running
- [ ] Restart and destroy work
- [ ] Model switcher syncs within seconds
- [ ] Channel config saves Telegram/Discord tokens
- [ ] Terminal connects cross-origin to pod
- [ ] Landing page shows for unauthenticated users

### Parallelism
- 2.1, 2.2, 2.6 can all run in parallel
- 2.4 components can each be ported independently
- 2.3 depends on 2.2 + at least a few components from 2.4
- 2.5, 2.7 can run in parallel with anything

### Dependencies
- Phase 1 complete (schema + backend functions exist)

---

## Phase 3: OpenClaw Gateway Client

**Goal**: Reusable WebSocket client for browser → pod real-time communication.

### 3.1 Gateway client library

**Create** (all in `src/lib/gateway/`):

| File | Purpose |
|---|---|
| `client.ts` | `GatewayClient` class: WS to `wss://{subdomain}.{domain}/ws?token={gatewayToken}`, JSON-RPC messages, auth challenge, auto-reconnect with backoff, heartbeat |
| `types.ts` | Protocol types: sessions, agents, channels, cron, models, config, events |
| `hooks.ts` | `useGatewayQuery(method, params)` — request-response. `useGatewaySubscription(topic)` — streaming events. `useGatewayConnection()` — connection state. |
| `context.tsx` | `GatewayProvider`: reads `useQuery(api.deploymentQueries.getMyDeployment)`, auto-connects when status is "running", exposes client via context |

### 3.2 Mount provider

**Modify**: `src/app/(app)/layout.tsx` — wrap children with `<GatewayProvider>`. Lazy: only connects when deployment is running.

### 3.3 Connection indicator

**Create**: `src/components/gateway-status.tsx` — dot indicator (green/yellow/red/gray)

**Modify**: `src/components/nav.tsx` — add `<GatewayStatus />` in bottom nav area

### Acceptance Criteria
- [ ] Auto-connects when deployment status is "running"
- [ ] `useGatewayQuery('sessions.list', {})` returns data
- [ ] Auto-reconnect after network interruption
- [ ] No connection attempt when no deployment
- [ ] Indicator shows correct state

### Parallelism
- 3.1 is self-contained
- 3.2, 3.3 depend on 3.1

### Dependencies
- Phase 2 complete (deployment data in Convex, `getMyDeployment` returns subdomain + token)

---

## Phase 4: AI Management via Gateway

**Goal**: Real-time agent config, channel status, sessions — via WebSocket.

### 4.1 New components

**Create** (all in `src/components/ai-agent/`):

| File | Gateway methods | Purpose |
|---|---|---|
| `agent-config.tsx` | `config.get`, `config.set` | System prompt, agent name, personality |
| `channels-live.tsx` | `channels.status` | Real-time channel status, WhatsApp QR |
| `sessions-list.tsx` | `sessions.list` | Active sessions with participant/channel |
| `skills-status.tsx` | `skills.status` | Installed skills with toggle |

### 4.2 Enhance model switcher

**Modify**: `src/components/ai-agent/model-switcher.tsx` — add live switch via `config.set` (instant, no pod restart) alongside the existing Convex mutation (for persistence)

### 4.3 Register sections

**Modify**: `src/components/section-renderer.tsx` — add: `agent-config`, `agent-model-switcher`, `agent-channels`, `agent-sessions`, `agent-skills`

**Modify**: `src/lib/presets.ts` — add ai-agent page presets per persona:
- `default`: deployment-dashboard, model-switcher, channels, sessions
- `developer`: deployment-dashboard, instance-tools, model-switcher, skills
- `minimalist`: deployment-dashboard, model-switcher

### Acceptance Criteria
- [ ] System prompt editable + saved via gateway
- [ ] Model switches instantly (no pod restart)
- [ ] Channel status is real-time (connected/disconnected)
- [ ] Sessions listed with live updates
- [ ] Skills toggleable
- [ ] All sections follow LifeOS theme + preset system

### Parallelism
- 4.1 components are all independent of each other
- 4.2, 4.3 depend on components existing

### Dependencies
- Phase 3 complete (gateway client available)

---

## Phase 5: Automations & Live Features

**Goal**: Cron jobs, event log, chat widget, LifeOS↔agent bridge.

### 5.1 New components

**Create** (all in `src/components/ai-agent/`):

| File | Purpose |
|---|---|
| `cron-manager.tsx` | Cron CRUD via gateway. LifeOS templates: Morning Briefing, Daily Review, Weekly Review, Goal Health Check |
| `event-log.tsx` | Real-time activity stream via `useGatewaySubscription('events')` |
| `chat-widget.tsx` | Floating chat bubble (bottom-right), direct conversation with AI agent |

### 5.2 Server-to-pod bridge

**Create**: `convex/gatewayBridge.ts` — internal action that sends data to a user's pod via HTTP. Used by triggers to forward data to the AI agent.

**Modify**: `convex/triggers.ts` — after generating trigger data (morning briefing, daily review, etc.), optionally forward to gateway if user has active deployment

### 5.3 Mount chat widget

**Modify**: `src/app/(app)/layout.tsx` — add `<ChatWidget />` positioned fixed

### 5.4 Register sections

**Modify**: `section-renderer.tsx` — add `agent-cron`, `agent-events`, `agent-chat`
**Modify**: `presets.ts` — update ai-agent presets

### Acceptance Criteria
- [ ] Cron jobs: create, list, delete, manual trigger
- [ ] Event log streams real-time
- [ ] Chat widget sends/receives messages with streaming
- [ ] Morning briefing trigger forwards to agent
- [ ] All components respect LifeOS theme

### Parallelism
- 5.1 components are all independent
- 5.2 is independent backend work
- 5.3, 5.4 depend on components

### Dependencies
- Phase 4 complete

---

## Environment Variables

### Convex dashboard (server-side)

| Variable | Purpose |
|---|---|
| `K8S_API_URL` | GKE cluster API endpoint |
| `K8S_CA_CERT` | GKE CA certificate (base64) |
| `GCP_SA_KEY` | Service account key JSON |
| `JWT_SIGNING_KEY` | Pod registration JWT secret |
| `GATEWAY_SYSTEM_KEY` | Gateway↔Convex shared secret |
| `AI_GATEWAY_INTERNAL_URL` | AI gateway service URL |
| `OPENCLAW_IMAGE_TAG` | Docker image tag for pods |
| `LIFEOS_DOMAIN` | Domain for pod subdomains |
| `GCP_PROJECT_ID` | GCP project |
| `STRIPE_SUB_BYOK` / `BASIC` / `STANDARD` / `PREMIUM` | Stripe price IDs |
| `STRIPE_PRICE_10` / `25` / `50` | Credit top-up price IDs |

### Next.js (client-side, set in Azin)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `NEXT_PUBLIC_LIFEOS_DOMAIN` | Domain for pod URLs in browser |

---

## File Count Summary

| Phase | New Files | Modified Files |
|---|---|---|
| 1. Infrastructure & Merge | ~13 Convex + Dockerfile + azin config + infra dir | 5 (schema, http, package.json, workspace, next.config) |
| 2. Deployment Frontend | ~14 components + page + landing | 7 (nav, marks, presets, config, dashboardConfig, settings, root page) |
| 3. Gateway Client | 5 (client, types, hooks, context, status) | 2 (layout, nav) |
| 4. AI Management | 4 components | 3 (section-renderer, presets, model-switcher) |
| 5. Live Features | 4 components + 1 bridge | 4 (triggers, layout, section-renderer, presets) |

---

## Critical Path

```
Phase 1: Schema merge + Dockerfile + Azin deploy
    ↓
Phase 2: AI Agent page + ported components
    ↓
Phase 3: Gateway WebSocket client
    ↓
Phase 4 + 5 fan out (can partially overlap)
```
