---
name: lifeos-setup
description: Set up LifeOS — connect API, configure cron jobs for proactive check-ins
required_binaries: [lifeos, openclaw]
---

Walk the user through LifeOS setup step by step.

## Step 1: Choose Deployment Mode

Ask the user:
- **Hosted** (app.lifeos.dev): Sign up at the web dashboard, get an API key from Settings
- **Self-hosted**: Deploy via Docker Compose on their own server

For self-hosted, guide them:
```bash
git clone https://github.com/<org>/lifeos && cd lifeos
cp .env.example .env
# Edit .env: set DB_PASSWORD and LIFEOS_SECRET to random values
docker compose up -d
# Visit http://localhost:3000 to set up account and create API key
```

## Step 2: Connect the CLI

```bash
# Install the CLI
npm install -g lifeos-cli

# Configure connection
lifeos config set-url <api-url>    # e.g., https://app.lifeos.dev or http://localhost:3001
lifeos config set-key <api-key>    # The API key from the dashboard

# Verify
lifeos whoami
```

## Step 3: Configure Timezone

Ask the user for their timezone (e.g., "America/New_York", "Europe/Berlin", "Asia/Tokyo").

## Step 4: Set Up Cron Jobs

Configure OpenClaw cron for proactive LifeOS features. Ask the user which ones they want, then set them up:

### Morning Briefing (recommended)
```bash
openclaw cron add --name "lifeos-morning" \
  --cron "0 7 * * *" --tz "<USER_TZ>" \
  --prompt "Run: lifeos trigger morning-briefing --json
Parse the JSON result and share a concise morning briefing with me:
- Any overdue tasks that need attention
- Today's scheduled tasks
- Today's MIT/P1/P2 if a day plan exists
- Any goals that are at risk" \
  --announce
```

### Daily Review (recommended)
```bash
openclaw cron add --name "lifeos-daily-review" \
  --cron "0 21 * * *" --tz "<USER_TZ>" \
  --prompt "Run: lifeos trigger daily-review --json
Parse the result and walk me through an end-of-day review:
- Did I complete my MIT? P1? P2?
- What did I accomplish today?
- Any wins to celebrate?
- Help me write a quick journal entry using: lifeos journal write" \
  --announce
```

### Weekly Review (recommended)
```bash
openclaw cron add --name "lifeos-weekly-review" \
  --cron "0 10 * * 0" --tz "<USER_TZ>" \
  --prompt "Run: lifeos trigger weekly-review --json
Parse the result and help me with my weekly review:
- Summarize what I accomplished this week
- How did my goals progress?
- What were my wins?
- Help me plan next week using: lifeos week create" \
  --announce
```

### Overdue Triage (optional)
```bash
openclaw cron add --name "lifeos-overdue-triage" \
  --cron "0 12 * * 1-5" --tz "<USER_TZ>" \
  --prompt "Run: lifeos trigger overdue-triage --json
Check if I have overdue tasks. If yes, help me decide for each one:
- Reschedule it (lifeos task update <id> --due <new-date>)
- Drop it (lifeos task update <id> --status dropped)
- Complete it now
If no overdue tasks, just say 'All clear!' briefly." \
  --announce
```

### Reminder Check (optional)
```bash
openclaw cron add --name "lifeos-reminders" \
  --cron "*/15 * * * *" --tz "<USER_TZ>" \
  --prompt "Run: lifeos trigger reminder-check --json
If there are due reminders, tell me about each one concisely.
If there are no due reminders, produce no output at all." \
  --announce --best-effort
```

### Goal Health Check (optional)
```bash
openclaw cron add --name "lifeos-goal-health" \
  --cron "0 9 * * 1" --tz "<USER_TZ>" \
  --prompt "Run: lifeos trigger goal-health --json
Review my goal health scores. Only mention goals that are at_risk or off_track.
For each, suggest concrete next actions I could take this week." \
  --announce
```

## Step 5: Verify Setup

```bash
# Check CLI connection
lifeos whoami

# Check cron jobs
openclaw cron list

# Test a trigger
lifeos trigger morning-briefing

# Create a test task
lifeos task create "Test LifeOS setup" --due today
lifeos task list --due today
lifeos task complete <id>
lifeos undo
```

Tell the user: "LifeOS is ready! Your cron jobs will start running on schedule. You can manage everything via the `lifeos` CLI or the web dashboard."
