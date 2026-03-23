---
name: lifeos
description: Personal life operating system — manage tasks, goals, day plans, journal, finances, and more via CLI
required_binaries: [lifeos]
---

You have access to the `lifeos` CLI for managing the user's personal operating system. LifeOS tracks tasks, projects, goals, day plans, weekly plans, journal entries, ideas, thoughts, wins, resources, reviews, reminders, and finances.

## Core Concepts

- **MIT/P1/P2**: Most Important Task, Priority 1, Priority 2 — the daily focus framework
- **Day Plan**: A scheduled timeline for the day with wake time, MIT, P1, P2, and other blocks
- **Weekly Plan**: A theme + weekly goals + review score for the week
- **Goal Health**: Goals are scored as on_track, at_risk, or off_track based on task completion velocity
- **Mutation Log**: Every change is logged and can be undone with `lifeos undo`

## Commands

### Tasks
```bash
lifeos task list [--status todo|done|dropped] [--due today|tomorrow|week|overdue]
lifeos task create <title> [--due <YYYY-MM-DD>] [--project <id>] [--goal <id>] [--notes <text>]
lifeos task show <id>
lifeos task complete <id>
lifeos task update <id> [--title <t>] [--due <d>] [--notes <n>]
lifeos task delete <id>
lifeos task bulk-complete <id1> <id2> ...
```

### Projects
```bash
lifeos project list [--status active|completed|archived]
lifeos project create <title> [--description <d>]
lifeos project show <id>
```

### Goals
```bash
lifeos goal list [--quarter 2026-Q1] [--status active|completed|dropped]
lifeos goal create <title> [--target-date <d>] [--quarter <q>] [--description <d>]
lifeos goal health [<id>]
lifeos goal show <id>
```

### Journal
```bash
lifeos journal [<YYYY-MM-DD>]           # Show entry (default: today)
lifeos journal write [--mit <text>] [--p1 <text>] [--p2 <text>] [--notes <text>]
lifeos journal wins [<YYYY-MM-DD>]
```

### Day Plan
```bash
lifeos plan today
lifeos plan tomorrow
lifeos plan set <YYYY-MM-DD> [--wake <HH:MM>] [--mit <task-id>] [--p1 <task-id>] [--p2 <task-id>]
lifeos plan complete-mit
lifeos plan complete-p1
lifeos plan complete-p2
```

### Weekly Plan
```bash
lifeos week [<YYYY-MM-DD>]              # Show plan (default: current week)
lifeos week create [--theme <t>]
lifeos week score <1-10>
```

### Quick Capture
```bash
lifeos idea <content> [--actionability high|medium|low]
lifeos thought <content> [--title <t>]
lifeos win <content>
lifeos resource <title> [--url <u>] [--type article|tool|book|video]
```

### Reviews
```bash
lifeos review list [--type daily|weekly|monthly|quarterly]
lifeos review daily
lifeos review weekly
lifeos review show <id>
```

### Finance
```bash
lifeos finance list [--from <d>] [--to <d>]
lifeos finance add <amount> <merchant> [--category <c>] [--date <d>]
lifeos finance import <csv-file>
lifeos finance net-worth
lifeos finance snapshot [--total <n>] [--notes <text>]
lifeos finance categories
```

### Reminders
```bash
lifeos reminder list [--status pending|delivered|snoozed|done]
lifeos reminder create <title> --at <ISO-datetime> [--body <text>]
lifeos reminder snooze <id> [--minutes 60]
lifeos reminder done <id>
```

### Other
```bash
lifeos search <query> [--type tasks,goals,ideas,journal,resources]
lifeos undo
lifeos whoami
lifeos trigger <name>   # morning-briefing|daily-review|weekly-review|overdue-triage|reminder-check|goal-health
```

## Output Modes

Add `--json` to any command for machine-readable JSON output. Without it, output is a formatted table/text.

## Usage Patterns

- When the user mentions tasks, goals, or plans, use the relevant `lifeos` commands
- For quick captures (ideas, thoughts, wins), use the capture commands directly
- For day planning, use `lifeos plan today` to show and `lifeos plan set` to configure
- For reviews, `lifeos review daily` triggers the daily review endpoint and shows a summary
- Always use `--json` when you need to parse output programmatically
- Use `lifeos trigger <name>` for proactive check-ins via cron

## Cron Triggers

These are designed to be called by OpenClaw cron jobs:
- `morning-briefing`: Overview of overdue tasks, today's tasks, day plan, at-risk goals
- `daily-review`: Today's plan status, completed tasks, journal, wins
- `weekly-review`: Weekly plan, completed tasks, goals progress, journals, wins
- `overdue-triage`: Overdue tasks with project/goal context
- `reminder-check`: Pending reminders that are past due
- `goal-health`: All active goals with health scores
