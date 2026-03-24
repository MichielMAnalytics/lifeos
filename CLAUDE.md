# LifeOS

Personal Life Operating System -- a single-user productivity platform for managing tasks, goals, projects, journals, day plans, weekly plans, ideas, thoughts, wins, resources, reminders, and reviews. Built as a monorepo with a Convex real-time backend, a Next.js 15 dashboard, and a CLI.

---

## Quick Start

```bash
bun install              # Install all dependencies
bun run dev              # Start Convex dev server + Next.js dashboard concurrently
bun run cli <cmd>        # Run a CLI command (via bun)
```

Individual services:

```bash
bun run dev:convex       # Convex dev server only
bun run dev:dashboard    # Next.js dashboard only (port 3000)
```

Build and check:

```bash
bun run build            # Build all packages (via Turbo)
bun run check            # Type-check all packages
bun run test             # Run tests across all packages
```

---

## Architecture

```
lifeos/                          # bun monorepo (pnpm-workspace.yaml)
  convex/                        # Convex backend -- schema, queries, mutations, HTTP API
    schema.ts                    # Data model (all tables)
    http.ts                      # HTTP router -- REST API for CLI and external integrations
    auth.ts                      # Google OAuth via @convex-dev/auth
    auth.config.ts               # Auth provider config
    apiKeyAuth.ts                # API key creation, hashing, validation
    authHelpers.ts               # Internal helpers for user/key operations
    tasks.ts                     # Task queries/mutations
    projects.ts                  # Project queries/mutations
    goals.ts                     # Goal queries/mutations (includes health scoring)
    journals.ts                  # Journal queries/mutations
    dayPlans.ts                  # Day plan queries/mutations
    weeklyPlans.ts               # Weekly plan queries/mutations
    ideas.ts                     # Idea queries/mutations (includes promote-to-project)
    thoughts.ts                  # Thought queries/mutations
    wins.ts                      # Win queries/mutations
    resources.ts                 # Resource queries/mutations
    reminders.ts                 # Reminder queries/mutations (includes snooze)
    reviews.ts                   # Review queries/mutations
    dashboardConfig.ts           # Dashboard layout config per user
    mutationLog.ts               # Mutation audit log + undo support
    search.ts                    # Cross-entity search
    triggers.ts                  # Automations (morning briefing, daily/weekly review, etc.)
  packages/
    shared/                      # @lifeos/shared -- types, schemas, constants
    cli/                         # @lifeos/cli -- Commander.js CLI over HTTP API
    dashboard/                   # @lifeos/dashboard -- Next.js 15 app with Convex React hooks
```

### How the pieces connect

- **Dashboard** talks to Convex directly via React hooks (`useQuery`, `useMutation` from `convex/react`).
- **CLI** talks to Convex via the HTTP API (`convex/http.ts`), authenticated with API keys (`Bearer lifeos_sk_...`).
- **Auth**: Google OAuth for the dashboard (via `@convex-dev/auth`). API keys for the CLI (hashed with SHA-256, stored in `apiKeys` table).
- **Mutations** are logged in `mutationLog` to support undo.

---

## Data Model

All tables are defined in `convex/schema.ts`. Every user-owned table has a `userId: v.id("users")` field for data isolation.

| Table | Purpose |
|-------|---------|
| `users` | Extends Convex Auth user table with `timezone` |
| `apiKeys` | API keys for CLI auth (keyPrefix, keyHash, name, lastUsedAt) |
| `tasks` | Tasks with title, status (todo/done/dropped), dueDate, projectId, goalId, position |
| `projects` | Projects with title, description, status (active/completed/archived) |
| `goals` | Goals with title, description, status (active/completed/dropped), targetDate, quarter |
| `journals` | Daily journal entries with MIT, P1, P2 priorities, notes, and wins array |
| `dayPlans` | Day plans with wake time, schedule blocks, overflow tasks, MIT/P1/P2 task links |
| `weeklyPlans` | Weekly plans with theme, goals list, review score |
| `ideas` | Idea capture with content, actionability (high/medium/low), nextStep |
| `thoughts` | Free-form thought capture with content and optional title |
| `wins` | Daily win entries with content and entryDate |
| `resources` | Saved resources with title, url, content, type (article/tool/book/video/other) |
| `reviews` | Reviews (daily/weekly/monthly/quarterly) with period, content, and score |
| `reminders` | Reminders with title, body, scheduledAt, status (pending/delivered/snoozed/done), snoozeCount |
| `dashboardConfig` | Per-user dashboard layout: nav mode, nav order, hidden pages, page presets, custom theme |
| `mutationLog` | Audit log of mutations for undo support (action, tableName, recordId, beforeData, afterData) |

### Key indexes

- Tasks: `by_userId_status`, `by_userId_dueDate`, `by_userId`
- Goals: `by_userId_status`, `by_userId`
- Journals: `by_userId_entryDate`
- Day plans: `by_userId_planDate`
- Weekly plans: `by_userId_weekStart`
- Wins: `by_userId_entryDate`, `by_userId`
- Reminders: `by_userId_status`, `by_userId`
- API keys: `by_userId`, `by_keyPrefix`

---

## CLI Reference

The CLI binary is `lifeos`. Run via `bun run cli <command>` or after global install. All commands support `--json` for machine-readable output.

### Authentication and Configuration

```bash
lifeos whoami                              # Show current authenticated user
lifeos config set-url <url>                # Set the API server URL
lifeos config set-key <key>                # Set the API key (lifeos_sk_...)
lifeos config show                         # Display current config (URL + masked key)
```

### Tasks

```bash
lifeos task list [--status todo|done|dropped] [--due today|tomorrow|week|overdue|all]
lifeos task create <title> [--due YYYY-MM-DD] [--project <id>] [--goal <id>] [--notes <text>]
lifeos task show <id>
lifeos task complete <id>
lifeos task update <id> [--title <text>] [--due YYYY-MM-DD] [--notes <text>] [--goal <id>]
lifeos task delete <id>
lifeos task bulk-complete <id1> <id2> ...
```

### Projects

```bash
lifeos project list [--status active|completed|archived]
lifeos project create <title> [--description <text>]
lifeos project show <id>
```

### Goals

```bash
lifeos goal list [--quarter 2026-Q1] [--status active|completed|dropped]
lifeos goal create <title> [--target-date YYYY-MM-DD] [--quarter 2026-Q1] [--description <text>]
lifeos goal show <id>
lifeos goal health [id]                    # Health for one goal, or all active goals
```

### Journal

```bash
lifeos journal [date]                      # Show journal entry (default: today)
lifeos journal write [--mit <text>] [--p1 <text>] [--p2 <text>] [--notes <text>]
lifeos journal wins [date]                 # List wins for a date (default: today)
```

### Day Plans

```bash
lifeos plan today                          # Show today's plan
lifeos plan tomorrow                       # Show tomorrow's plan
lifeos plan set <YYYY-MM-DD> [--wake HH:MM] [--mit <taskId>] [--p1 <taskId>] [--p2 <taskId>]
lifeos plan complete-mit                   # Mark MIT done for today
lifeos plan complete-p1                    # Mark P1 done for today
lifeos plan complete-p2                    # Mark P2 done for today
```

### Weekly Plans

```bash
lifeos week [week-start]                   # Show weekly plan (default: current Monday)
lifeos week create [--theme <text>]        # Create weekly plan for this week
lifeos week score <1-10>                   # Set review score for this week
```

### Quick Capture

```bash
lifeos idea <content> [--actionability high|medium|low]
lifeos thought <content> [--title <text>]
lifeos win <content>
lifeos resource <title> [--url <url>] [--type article|tool|book|video|other]
```

### Reviews

```bash
lifeos review list [--type daily|weekly|monthly|quarterly]
lifeos review daily                        # Trigger daily review and show results
lifeos review weekly                       # Trigger weekly review and show results
lifeos review show <id>
```

### Reminders

```bash
lifeos reminder list [--status pending|delivered|snoozed|done]
lifeos reminder create <title> [--at <ISO-datetime>] [--body <text>]
lifeos reminder snooze <id> [--minutes <min>]    # Default: 60 minutes
lifeos reminder done <id>
```

### Search

```bash
lifeos search <query> [--type tasks|goals|ideas|journal|resources]
```

### Undo

```bash
lifeos undo                                # Undo the last mutation
```

### Triggers

```bash
lifeos trigger <name>
# Valid triggers: morning-briefing, daily-review, weekly-review,
#                 overdue-triage, reminder-check, goal-health
```

### Dashboard Configuration (via CLI)

```bash
lifeos dashboard config                    # Show current dashboard configuration
lifeos dashboard nav-mode <sidebar|header> # Set navigation mode
lifeos dashboard nav-order <pages...>      # Set page order (e.g., today tasks goals)
lifeos dashboard hide <page>               # Hide a page from navigation
lifeos dashboard show <page>               # Unhide a page
lifeos dashboard preset <page> <preset>    # Set page preset (e.g., today solopreneur)
lifeos dashboard presets <page>            # List available presets for a page
lifeos dashboard reset                     # Reset dashboard to defaults
```

---

## Dashboard Configuration

### Navigation Modes

- **sidebar** (default): Vertical sidebar navigation on the left
- **header**: Horizontal navigation bar at the top

### Pages

8 pages in default order: `today`, `tasks`, `projects`, `goals`, `journal`, `ideas`, `plan`, `reviews`

Pages can be reordered or hidden per user.

### Page Presets (7 Personas)

Every page supports 7 persona-based layouts that determine which section components are shown:

| Preset | Description |
|--------|-------------|
| `default` | Balanced, general-purpose layout |
| `solopreneur` | Execution-focused for founders -- goals at risk, strategic grouping |
| `content-creator` | Ideas pipeline and content focus |
| `developer` | Compact, data-dense, no fluff (kanban, compact lists) |
| `executive` | High-level metrics, OKRs, weekly themes |
| `minimalist` | Just the essentials, stripped down |
| `journaler` | Reflection-first, journal and wins prominent |

### Theme System

6 built-in themes (stored in `localStorage` as `lifeos-theme`):

| Theme | Description |
|-------|-------------|
| `midnight` (default) | Near-black with white accents |
| `zen` | Warm, minimal Japanese-inspired aesthetics |
| `nord` | Cool arctic blues and clean lines |
| `sunset` | Warm gradients of amber and violet |
| `forest` | Deep greens and organic earth tones |
| `light` | Crisp white with refined accents |

Each theme provides 12 CSS custom properties: `bg`, `bg-subtle`, `surface`, `surface-hover`, `border`, `text`, `text-muted`, `accent`, `accent-hover`, `accent-glow`, `success`, `warning`, `danger`.

Custom themes can be saved to the `dashboardConfig` table.

### Font Options

10 font choices (stored in `localStorage` as `lifeos-font`):

`satoshi` (default), `inter`, `jetbrains` (monospace), `space-grotesk`, `dm-sans`, `outfit`, `geist`, `ibm-plex`, `source-serif`, `system`

### Configure Mode

The dashboard has a configure mode (toggled via `toggleConfigMode` in the DashboardConfigProvider) that enables in-place editing of layout, preset selection, page visibility, and nav order.

---

## API Reference (HTTP)

All endpoints are defined in `convex/http.ts`. Auth is via `Authorization: Bearer lifeos_sk_...` header. All responses are JSON.

### General

```
GET  /api/v1/health                             # No auth required. Returns { status, timestamp }
```

### Auth

```
GET    /api/v1/auth/me                          # Current user info
PATCH  /api/v1/auth/me                          # Update user { name?, timezone? }
GET    /api/v1/auth/api-keys                    # List API keys
POST   /api/v1/auth/api-keys                    # Create API key { name? }
DELETE /api/v1/auth/api-keys/:id                # Delete API key
```

### Tasks

```
GET    /api/v1/tasks                            # List tasks ?status=&due=&projectId=&goalId=
POST   /api/v1/tasks                            # Create task { title, dueDate?, notes?, projectId?, goalId? }
GET    /api/v1/tasks/:id                        # Get task by ID
PATCH  /api/v1/tasks/:id                        # Update task { title?, notes?, dueDate?, status?, projectId?, goalId?, position? }
DELETE /api/v1/tasks/:id                        # Delete task
POST   /api/v1/tasks/:id/complete               # Mark task as done
POST   /api/v1/tasks/bulk-complete              # Bulk complete { ids: string[] }
```

### Projects

```
GET    /api/v1/projects                         # List projects ?status=
POST   /api/v1/projects                         # Create project { title, description?, status? }
GET    /api/v1/projects/:id                     # Get project by ID
PATCH  /api/v1/projects/:id                     # Update project { title?, description?, status? }
DELETE /api/v1/projects/:id                     # Delete project
```

### Goals

```
GET    /api/v1/goals                            # List goals ?status=&quarter=
POST   /api/v1/goals                            # Create goal { title, description?, status?, targetDate?, quarter? }
GET    /api/v1/goals/:id                        # Get goal by ID
GET    /api/v1/goals/:id/health                 # Get goal health (score, velocity, task progress)
PATCH  /api/v1/goals/:id                        # Update goal { title?, description?, status?, targetDate?, quarter? }
DELETE /api/v1/goals/:id                        # Delete goal
```

### Journal

```
GET    /api/v1/journal                          # List journal entries ?from=&to= (YYYY-MM-DD)
GET    /api/v1/journal/:date                    # Get entry by date (YYYY-MM-DD)
PUT    /api/v1/journal/:date                    # Upsert entry { mit?, p1?, p2?, notes?, wins? }
```

### Day Plans

```
GET    /api/v1/day-plans/:date                  # Get day plan by date (YYYY-MM-DD)
PUT    /api/v1/day-plans/:date                  # Upsert day plan { wakeTime?, mitTaskId?, p1TaskId?, p2TaskId?, schedule?, overflow? }
PATCH  /api/v1/day-plans/:date                  # Partial update { mitDone?, p1Done?, p2Done?, ... }
```

### Weekly Plans

```
GET    /api/v1/weekly-plans                     # List weekly plans ?current=true
GET    /api/v1/weekly-plans/:weekStart          # Get plan by week start (YYYY-MM-DD, Monday)
PUT    /api/v1/weekly-plans/:weekStart          # Upsert weekly plan { theme?, goals?, reviewScore? }
```

### Ideas

```
GET    /api/v1/ideas                            # List ideas ?actionability=
POST   /api/v1/ideas                            # Create idea { content, actionability?, nextStep? }
PATCH  /api/v1/ideas/:id                        # Update idea { content?, actionability?, nextStep? }
DELETE /api/v1/ideas/:id                        # Delete idea
POST   /api/v1/ideas/:id/promote               # Promote idea to project { projectTitle }
```

### Thoughts

```
GET    /api/v1/thoughts                         # List thoughts
POST   /api/v1/thoughts                         # Create thought { content, title? }
DELETE /api/v1/thoughts/:id                     # Delete thought
```

### Wins

```
GET    /api/v1/wins                             # List wins ?from=&to= (YYYY-MM-DD)
POST   /api/v1/wins                             # Create win { content, entryDate? }
```

### Resources

```
GET    /api/v1/resources                        # List resources ?type=
POST   /api/v1/resources                        # Create resource { title, url?, content?, type? }
PATCH  /api/v1/resources/:id                    # Update resource { title?, url?, content?, type? }
DELETE /api/v1/resources/:id                    # Delete resource
```

### Reviews

```
GET    /api/v1/reviews                          # List reviews ?type=daily|weekly|monthly|quarterly
POST   /api/v1/reviews                          # Create review { reviewType, periodStart, periodEnd, content, score? }
GET    /api/v1/reviews/:id                      # Get review by ID
```

### Reminders

```
GET    /api/v1/reminders                        # List reminders ?status=
POST   /api/v1/reminders                        # Create reminder { title, body?, scheduledAt }
PATCH  /api/v1/reminders/:id                    # Update reminder { title?, body?, scheduledAt?, status? }
DELETE /api/v1/reminders/:id                    # Delete reminder
POST   /api/v1/reminders/:id/snooze            # Snooze { minutes }
POST   /api/v1/reminders/:id/done              # Mark as done
```

### Dashboard Config

```
GET    /api/v1/dashboard/config                 # Get dashboard config
PATCH  /api/v1/dashboard/config                 # Update config { navMode?, navOrder?, navHidden?, pagePresets?, customTheme? }
POST   /api/v1/dashboard/nav-mode               # Set nav mode { mode }
POST   /api/v1/dashboard/nav-order              # Set nav order { order: string[] }
POST   /api/v1/dashboard/preset                 # Set page preset { page, preset }
POST   /api/v1/dashboard/visibility             # Toggle page visibility { page, visible }
POST   /api/v1/dashboard/reset                  # Reset to defaults
```

### Search

```
GET    /api/v1/search                           # Search across entities ?q=&type=tasks,goals,ideas,journal,resources
```

### Mutations (Undo)

```
GET    /api/v1/mutations                        # List mutation log ?limit=
POST   /api/v1/mutations/undo                   # Undo last mutation
```

### Triggers

```
POST   /api/v1/triggers/morning-briefing        # Morning briefing data
POST   /api/v1/triggers/daily-review            # Daily review summary
POST   /api/v1/triggers/weekly-review           # Weekly review summary
POST   /api/v1/triggers/overdue-triage          # Overdue tasks triage
POST   /api/v1/triggers/reminder-check          # Check pending reminders
POST   /api/v1/triggers/goal-health             # Goal health check across all goals
```

---

## Testing

```bash
# Tests directory exists at /tests/ -- add E2E scripts here
bash tests/cli-e2e.sh     # CLI end-to-end tests (when available)
bun run test             # Run tests across all packages via Turbo
bun run check            # Type-check all packages
```

---

## Development

### File Structure Overview

```
convex/
  schema.ts               # Single source of truth for all tables
  http.ts                 # HTTP router (REST API for CLI)
  auth.ts                 # Auth config (Google OAuth)
  <entity>.ts             # One file per entity (tasks.ts, goals.ts, etc.)
  triggers.ts             # Scheduled/manual trigger functions
  mutationLog.ts          # Audit log + undo
  search.ts               # Cross-entity search
  lib/                    # Shared Convex utilities

packages/shared/
  types.ts                # Shared TypeScript types
  schemas.ts              # Shared validation schemas
  constants.ts            # Shared constants
  index.ts                # Barrel export

packages/cli/
  src/index.ts            # CLI entry point (Commander.js)
  src/commands/<name>.ts  # One file per command group
  src/api-client.ts       # HTTP client for Convex API
  src/config.ts           # Local config file management
  src/output.ts           # Output formatting (tables, JSON, colors)

packages/dashboard/
  src/app/                # Next.js 15 App Router
    layout.tsx            # Root layout (theme, fonts, providers)
    page.tsx              # Root page (redirects to dashboard)
    (app)/                # Authenticated app routes
    (auth)/               # Auth pages (sign-in, sign-up)
  src/components/
    section-renderer.tsx  # Maps section IDs to React components
    sections/             # 26 section components (one per section ID)
    page-shell.tsx        # Page layout shell
    nav.tsx               # Sidebar/header navigation
    header-nav.tsx        # Header navigation variant
    configure-toolbar.tsx # Configure mode toolbar
    preset-selector.tsx   # Preset picker UI
    theme-provider.tsx    # Theme context provider
    ui/                   # Shared UI primitives
  src/lib/
    presets.ts            # Page presets (7 personas x 8 pages)
    themes.ts             # Theme definitions (6 themes)
    dashboard-config.tsx  # Dashboard config context + mutations
    convex.tsx            # Convex client provider
    convex-api.ts         # Generated Convex API reference
    useCurrentUser.ts     # Current user hook
    utils.ts              # Utility functions
```

### How to Add a New Section Component

1. Create `packages/dashboard/src/components/sections/<name>.tsx` -- export a component:
   ```tsx
   'use client';
   export function MySection() { return <div>...</div>; }
   ```
2. Register it in `packages/dashboard/src/components/section-renderer.tsx`:
   ```tsx
   import { MySection } from './sections/my-section';
   // Add to SECTION_MAP:
   'my-section': MySection,
   ```
3. Add the section ID to relevant presets in `packages/dashboard/src/lib/presets.ts`:
   ```ts
   { id: "my-section", label: "My Section", span: "full" }
   ```

### How to Add a New Page Preset

1. Open `packages/dashboard/src/lib/presets.ts`.
2. Add your preset key to every page in the `PAGE_PRESETS` record.
3. Add the key to `ALL_PRESET_KEYS`.
4. Update `packages/cli/src/commands/dashboard.ts` if the CLI validates preset names.

### How to Add a New CLI Command

1. Create `packages/cli/src/commands/<name>.ts` -- export a `Command`:
   ```ts
   import { Command } from 'commander';
   export const myCommand = new Command('my-command')
     .description('...')
     .action(async () => { ... });
   ```
2. Register in `packages/cli/src/index.ts`:
   ```ts
   import { myCommand } from './commands/my-command.js';
   program.addCommand(myCommand);
   ```
3. If it needs a new HTTP endpoint, add the route in `convex/http.ts`.

### How to Add a New Convex Table

1. Add the table definition to `convex/schema.ts` with a `userId` field.
2. Create `convex/<tableName>.ts` with internal queries and mutations.
3. Add HTTP routes in `convex/http.ts` for CLI/API access.
4. Add types to `packages/shared/types.ts`.
5. Log mutations in `mutationLog` for undo support.

---

## Environment Variables

### Convex (required)

| Variable | Description |
|----------|-------------|
| `CONVEX_DEPLOYMENT` | Convex deployment name (e.g., `dev:your-project`) |
| `NEXT_PUBLIC_CONVEX_URL` | Public Convex URL (e.g., `https://your-project.convex.cloud`) |

### Auth (set in Convex dashboard environment variables)

| Variable | Description |
|----------|-------------|
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `SITE_URL` | Dashboard URL for OAuth redirects |
| `CONVEX_SITE_URL` | Convex site URL (for auth callback) |
| `JWT_PRIVATE_KEY` | JWT signing key for Convex Auth |
| `JWKS` | JSON Web Key Set for token verification |

### Optional

| Variable | Description |
|----------|-------------|
| `LIFEOS_SECRET` | Secret for self-hosted mode |

---

## Code Quality Rules

### TypeScript

- No `as any` -- everything must be type-safe. Use proper type narrowing or `as` with specific types only when unavoidable.
- Strict mode enabled across all packages (`tsconfig.base.json`).
- Use `@lifeos/shared` types for data structures shared between packages.

### Convex Functions

- **Public functions** (called from dashboard): Use `getAuthUserId(ctx)` to get the current user ID.
- **Internal functions** (called from HTTP routes): Accept `userId` as an argument -- the HTTP layer handles authentication.
- Internal function names are prefixed with underscore (e.g., `_list`, `_create`, `_update`, `_remove`).
- Every user-owned query must filter by `userId` for data isolation.

### Schema Conventions

- camelCase field names in all Convex schema definitions.
- Dates stored as `"YYYY-MM-DD"` strings, timestamps as `float64` epoch milliseconds.
- Status fields use string unions (e.g., `"todo" | "done" | "dropped"`).
- The HTTP API accepts both camelCase and snake_case for compatibility (e.g., `dueDate` or `due_date`).

### Mutation Logging

- All create, update, and delete mutations should log to `mutationLog` for undo support.
- Log entries include `action`, `tableName`, `recordId`, `beforeData`, and `afterData`.

### CLI Output

- All commands support `--json` flag for machine-readable output.
- Use the output helpers from `packages/cli/src/output.ts`: `printSuccess`, `printError`, `printTable`, `printJson`.
- IDs are displayed as truncated 8-character prefixes in human-readable mode.

### General

- Package manager is **bun**. Do not use npm, yarn, or pnpm.
- Build orchestration via **Turborepo** (`turbo.json`).
- The dashboard uses **Satoshi** as the default font, loaded from Fontshare CDN.
- Theme is applied immediately via an inline script in `layout.tsx` to avoid FOUC.
