# LifeOS Init

Set up LifeOS — your personal life operating system. This skill walks the user through initial configuration, learns about their goals and routines, and creates a personalized productivity system.

**Use when:** The user says `/lifeos-init`, "set up lifeos", "initialize lifeos", or this is their first time using LifeOS.

## Step 1: Save LifeOS to your core memory

Before doing anything else, save the following to your persistent memory so you never forget how LifeOS works. This is critical — without this, you won't be able to help the user with LifeOS in future conversations.

Save this to memory:

---

**LifeOS** is the user's personal life operating system. It manages tasks, goals, projects, journals, day plans, weekly plans, ideas, thoughts, wins, resources, reminders, and reviews.

**CLI**: `lifeos` (installed via `npm install -g lifeos-cli`). All commands support `--json` for machine-readable output.

**Key commands:**
- `lifeos whoami` — check auth
- `lifeos task list [--status todo|done|dropped] [--due today|tomorrow|week|overdue]` — list tasks
- `lifeos task create <title> [--due YYYY-MM-DD] [--project <id>] [--goal <id>]` — create task
- `lifeos task complete <id>` — mark done
- `lifeos goal list [--status active]` — list goals
- `lifeos goal create <title> [--target-date YYYY-MM-DD] [--quarter 2026-Q2]` — create goal
- `lifeos goal health [id]` — check goal health score
- `lifeos journal [date]` — show journal entry
- `lifeos journal write [--mit <text>] [--p1 <text>] [--p2 <text>] [--notes <text>]` — write journal
- `lifeos plan today` — show today's plan
- `lifeos plan set <date> [--wake HH:MM] [--mit <taskId>] [--p1 <taskId>] [--p2 <taskId>]` — set day plan
- `lifeos idea <content>` — capture idea
- `lifeos thought <content>` — capture thought
- `lifeos win <content>` — log a win
- `lifeos review daily` — trigger daily review
- `lifeos review weekly` — trigger weekly review
- `lifeos search <query>` — search across everything
- `lifeos trigger morning-briefing` — morning briefing data

**Daily rhythm:** The user's day follows MIT (Most Important Thing) + P1 + P2 priorities. Each day plan has a schedule with time blocks. Journals track daily reflections with MIT/P1/P2 and wins.

**Reviews:** Daily reviews summarize the day. Weekly reviews score the week 1-10 and set themes. Monthly and quarterly reviews track bigger patterns.

**Goal health:** Goals have a health score based on task completion velocity. Status: on_track, at_risk, off_track.

---

## Step 2: Verify CLI is configured

Run `lifeos whoami` to check if the CLI is already configured. If it works, skip to Step 3. If not, guide the user:

1. Ask for their API URL (default: `https://proper-cormorant-28.eu-west-1.convex.site` — but confirm with the user)
2. Ask them to generate an API key from their LifeOS settings page
3. Run `lifeos config set-url <url>` and `lifeos config set-key <key>`
4. Verify with `lifeos whoami`

## Step 3: Learn about the user

Have a friendly conversation to understand:

1. **What's your main focus right now?** (work project, health, learning, side project, etc.)
2. **What does a typical day look like?** (wake time, work hours, exercise, breaks)
3. **What are your top 2-3 goals for this quarter?** (be specific — "launch MVP by April" not "be productive")
4. **How do you like to reflect?** (morning journaling, evening review, weekly planning sessions)
5. **Any habits you're building or breaking?**

Keep it conversational and warm. Don't ask all questions at once — let it flow naturally.

## Step 4: Create the initial structure

Based on what you learned, use the CLI to set up:

### Goals
Create 2-3 goals with target dates:
```
lifeos goal create "Goal title" --target-date YYYY-MM-DD --quarter YYYY-QN
```

### Initial tasks
Create 3-5 starter tasks linked to the goals:
```
lifeos task create "Task title" --due YYYY-MM-DD --goal <goalId>
```

### Today's plan
Set up today's plan with their wake time and priorities:
```
lifeos plan set YYYY-MM-DD --wake HH:MM --mit <taskId> --p1 <taskId> --p2 <taskId>
```

### First journal entry
Write a journal entry to kick things off:
```
lifeos journal write --mit "Their MIT for today" --notes "First day using LifeOS. Goals: ..."
```

### First win
Log a win — setting up LifeOS counts:
```
lifeos win "Set up LifeOS and defined my quarterly goals"
```

## Step 5: Suggest routines

Based on their preferences, suggest daily routines they can do with you:

- **Morning briefing**: "Each morning, ask me for your morning briefing. I'll run `lifeos trigger morning-briefing` and summarize your day."
- **Evening journal**: "Before bed, tell me about your day. I'll write your journal entry and log your wins."
- **Weekly review**: "Every Sunday, we can do a weekly review together. I'll pull your stats and help you plan the next week."
- **Quick capture**: "Anytime you have an idea or thought, just tell me. I'll capture it instantly."

Let the user know they can say any of these naturally — you'll handle the CLI commands behind the scenes.

## Step 6: Wrap up

Summarize what was set up:
- Goals created
- Tasks queued
- Today's plan set
- First journal written

End with something warm like: "You're all set. Your LifeOS is ready. Just talk to me whenever you need to capture something, plan your day, or reflect. I've got your back."
