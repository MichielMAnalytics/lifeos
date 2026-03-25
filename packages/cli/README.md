<p align="center">
  <img src="https://raw.githubusercontent.com/MichielMAnalytics/lifeos/main/packages/cli/logo.svg" alt="LifeOS" width="320" />
</p>

<h3 align="center">Personal Life Operating System</h3>

<p align="center">
  Manage tasks, goals, journals, day plans, weekly plans, ideas, thoughts, wins, resources, reminders, and reviews — all from your terminal.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/lifeos-cli"><img src="https://img.shields.io/npm/v/lifeos-cli.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/lifeos-cli"><img src="https://img.shields.io/npm/l/lifeos-cli.svg" alt="license" /></a>
</p>

---

## Install

```bash
npm install -g lifeos-cli
```

On first install, the CLI will offer to install agent skills for Claude Code or Codex.

## Setup

```bash
lifeos config set-url <your-convex-site-url>
lifeos config set-key <your-api-key>       # lifeos_sk_...
lifeos whoami                               # verify it works
```

Generate an API key from your LifeOS dashboard settings page.

## Agent Skills

LifeOS ships with embedded skills that let AI coding agents (Claude Code, Codex) manage your LifeOS hands-free.

```bash
lifeos skills install              # install for Claude Code (default)
lifeos skills install --agent codex  # install for Codex
```

### `/lifeos-init`

The init skill walks your agent through setting up LifeOS: connecting the CLI, learning about your goals and routines, creating your first goals and tasks, and setting up daily rhythms. Just type `/lifeos-init` in your agent.

After setup, your agent can:
- Pull your morning briefing and summarize your day
- Capture ideas, thoughts, and wins as you mention them
- Write your evening journal and log wins
- Run weekly reviews and help plan the next week

---

## Commands

Every command supports `--json` for machine-readable output. IDs can be passed as full Convex IDs or short 8-character prefixes (e.g. `ks7bgmwf`).

### Auth & Config

```
lifeos whoami                              Show current authenticated user
lifeos config set-url <url>                Set the API server URL
lifeos config set-key <key>                Set the API key
lifeos config show                         Display current config (URL + masked key)
```

### Tasks

```
lifeos task list [options]                 List tasks
  -s, --status <status>                      Filter: todo, done, dropped
  -d, --due <due>                            Filter: today, tomorrow, week, overdue, all

lifeos task create <title> [options]       Create a task
  -d, --due <date>                           Due date (YYYY-MM-DD)
  -p, --project <id>                         Link to project
  -g, --goal <id>                            Link to goal
  -n, --notes <notes>                        Add notes

lifeos task show <id>                      Show task details
lifeos task complete <id>                  Mark task as done
lifeos task update <id> [options]          Update a task
  -t, --title <title>                        New title
  -d, --due <date>                           Due date
  -n, --notes <notes>                        Notes
  -g, --goal <id>                            Goal ID

lifeos task delete <id>                    Delete a task
lifeos task bulk-complete <ids...>         Mark multiple tasks as done
```

### Projects

```
lifeos project list [options]              List projects
  -s, --status <status>                      Filter: active, completed, archived

lifeos project create <title> [options]    Create a project
  -d, --description <text>                   Description

lifeos project show <id>                   Show project details
```

### Goals

```
lifeos goal list [options]                 List goals
  -q, --quarter <quarter>                    Filter by quarter (e.g. 2026-Q2)
  -s, --status <status>                      Filter: active, completed, dropped

lifeos goal create <title> [options]       Create a goal
  -t, --target-date <date>                   Target date (YYYY-MM-DD)
  -q, --quarter <quarter>                    Quarter (e.g. 2026-Q2)
  -d, --description <desc>                   Description

lifeos goal show <id>                      Show goal details
lifeos goal health [id]                    Show health for one goal or all active goals
```

### Journal

```
lifeos journal [date]                      Show journal entry (default: today)
lifeos journal write [options]             Write today's journal entry
  --mit <text>                               Most Important Thing
  --p1 <text>                                Priority 1
  --p2 <text>                                Priority 2
  --notes <text>                             Notes

lifeos journal wins [date]                 List wins for a date (default: today)
```

### Day Plans

```
lifeos plan today                          Show today's plan
lifeos plan tomorrow                       Show tomorrow's plan
lifeos plan set <date> [options]           Create or update a day plan
  -w, --wake <time>                          Wake time (HH:MM)
  --mit <taskId>                             MIT task ID
  --p1 <taskId>                              P1 task ID
  --p2 <taskId>                              P2 task ID

lifeos plan complete-mit                   Mark MIT as done for today
lifeos plan complete-p1                    Mark P1 as done for today
lifeos plan complete-p2                    Mark P2 as done for today
```

### Weekly Plans

```
lifeos week [week-start]                   Show weekly plan (default: current Monday)
lifeos week create [options]               Create weekly plan for this week
  -t, --theme <theme>                        Week theme

lifeos week score <1-10>                   Set review score for this week
```

### Quick Capture

```
lifeos idea <content> [options]            Capture an idea
  -a, --actionability <level>                high, medium, or low

lifeos thought <content> [options]         Capture a thought
  -t, --title <title>                        Optional title

lifeos win <content>                       Record a win

lifeos resource <title> [options]          Save a resource
  -u, --url <url>                            URL
  -t, --type <type>                          article, tool, book, video, other
```

### Reviews

```
lifeos review list [options]               List reviews
  -t, --type <type>                          Filter: daily, weekly, monthly, quarterly

lifeos review daily                        Trigger daily review
lifeos review weekly                       Trigger weekly review
lifeos review show <id>                    Show review details
```

### Reminders

```
lifeos reminder list [options]             List reminders
  -s, --status <status>                      Filter: pending, delivered, snoozed, done

lifeos reminder create <title> [options]   Create a reminder
  -a, --at <datetime>                        Scheduled time (ISO datetime)
  -b, --body <body>                          Reminder body

lifeos reminder snooze <id> [options]      Snooze a reminder
  -m, --minutes <min>                        Duration in minutes (default: 60)

lifeos reminder done <id>                  Mark reminder as done
```

### Search

```
lifeos search <query> [options]            Search across all entities
  -t, --type <type>                          Filter: tasks, goals, ideas, journal, resources
```

### Triggers

```
lifeos trigger <name>                      Fire a named trigger
```

Available triggers:

| Trigger | Description |
|---------|-------------|
| `morning-briefing` | Pull today's plan, tasks, and reminders |
| `daily-review` | Summarize the day's activity |
| `weekly-review` | Summarize the week with stats |
| `overdue-triage` | Surface overdue tasks for triage |
| `reminder-check` | Check pending reminders |
| `goal-health` | Health check across all active goals |

### Dashboard Config

```
lifeos dashboard config                    Show current dashboard configuration
lifeos dashboard nav-mode <mode>           Set nav mode: sidebar or header
lifeos dashboard nav-order <pages...>      Set page order (e.g. today tasks goals)
lifeos dashboard hide <page>               Hide a page from navigation
lifeos dashboard show <page>               Unhide a page
lifeos dashboard preset <page> <preset>    Set page preset
lifeos dashboard presets <page>            List available presets for a page
lifeos dashboard reset                     Reset dashboard to defaults
```

### Undo

```
lifeos undo                                Undo the last mutation
```

---

## Daily Rhythm

LifeOS is built around the **MIT + P1 + P2** priority system:

- **MIT** — Most Important Thing. The one task that makes your day a success.
- **P1** — Priority 1. Important but secondary.
- **P2** — Priority 2. Nice to get done.

Each day plan has a wake time, your three priorities linked to tasks, and optional time-block schedule. Journals track reflections with the same MIT/P1/P2 structure plus wins.

## Architecture

```
lifeos-cli
  ├── dist/lifeos.mjs          Single-file bundle (ships to npm)
  ├── skills/                   Embedded agent skills
  │   └── lifeos-init/          Setup & onboarding skill
  └── scripts/
      └── postinstall.mjs       Auto-installs skills on npm install -g
```

The CLI talks to a Convex backend via HTTP API, authenticated with API keys (`Bearer lifeos_sk_...`). It's part of the [LifeOS monorepo](https://github.com/MichielMAnalytics/lifeos) which also includes the real-time dashboard and shared type definitions.

## License

MIT
