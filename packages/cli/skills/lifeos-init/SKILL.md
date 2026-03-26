---
name: lifeos-init
description: "Set up LifeOS — your personal life operating system. Use when: user says /lifeos-init, 'set up lifeos', 'initialize lifeos', or is using LifeOS for the first time. Walks through configuration, learns about goals and routines, and creates a personalized productivity system. NOT for: users who already have goals and tasks set up."
user-invocable: true
metadata: { "openclaw": { "emoji": "🌿", "requires": { "bins": ["lifeos"] }, "install": [{ "id": "npm-lifeos", "kind": "node", "package": "lifeos-cli", "bins": ["lifeos"], "label": "Install LifeOS CLI (npm)" }] } }
---

# LifeOS Init

Onboard a new user into LifeOS by having a warm conversation, then executing CLI commands to set up their goals, tasks, plans, and first journal entry.

## When to Use

- User says `/lifeos-init`
- "Set up lifeos" or "initialize lifeos"
- First time using LifeOS
- "Help me get organized"
- "Set up my goals and routines"

## Step 1: Verify CLI is configured

Execute this command to check if the CLI is already configured:

```bash
lifeos whoami
```

If it returns user info, proceed to Step 2. If it fails, execute these commands:

```bash
lifeos config set-url https://proper-cormorant-28.eu-west-1.convex.site
```

Then ask the user for their API key (they can generate one from Settings in their LifeOS home) and execute:

```bash
lifeos config set-key <their-api-key>
```

Verify with:

```bash
lifeos whoami
```

## Step 2: Learn about the user

Have a friendly, warm conversation. Ask these questions naturally (not all at once):

1. **What's your main focus right now?** (work project, health, learning, side project, etc.)
2. **What does a typical day look like?** (wake time, work hours, exercise, breaks)
3. **What are your top 2-3 goals for this quarter?** (be specific — "launch MVP by April" not "be productive")
4. **How do you like to reflect?** (morning journaling, evening review, weekly planning sessions)
5. **Any habits you're building or breaking?**

Wait for the user to answer before continuing. Do NOT rush through all questions.

## Step 3: Create the initial structure

Based on what the user told you, execute CLI commands to set up their LifeOS.

### Create goals

Execute `lifeos goal create` for each goal the user mentioned:

```bash
lifeos goal create "Launch MVP" --target-date 2026-06-30 --quarter 2026-Q2
lifeos goal create "Run a half marathon" --target-date 2026-09-15 --quarter 2026-Q3
```

Capture the goal IDs from the output — you'll need them for linking tasks.

### Create starter tasks

Execute `lifeos task create` for 3-5 actionable tasks linked to the goals:

```bash
lifeos task create "Draft product spec" --due 2026-04-01 --goal <goalId>
lifeos task create "Set up training schedule" --due 2026-04-05 --goal <goalId>
```

### Set up today's plan

Execute `lifeos plan set` with the user's wake time and top priorities:

```bash
lifeos plan set 2026-03-26 --wake 07:00 --mit <taskId> --p1 <taskId> --p2 <taskId>
```

### Write first journal entry

Execute `lifeos journal write` to kick things off:

```bash
lifeos journal write --mit "Their most important task" --notes "First day using LifeOS. Goals: ..."
```

### Log the first win

Execute `lifeos win` to celebrate getting started:

```bash
lifeos win "Set up LifeOS and defined my quarterly goals"
```

## Step 4: Suggest routines

Tell the user about routines they can do with you. Speak directly to them:

- **Morning briefing**: "Each morning, just ask me for your morning briefing. I'll pull your schedule, tasks, and priorities."
- **Evening journal**: "Before bed, tell me about your day. I'll write your journal entry and log your wins."
- **Weekly review**: "Every Sunday, we can do a weekly review together. I'll pull your stats and help you plan the next week."
- **Quick capture**: "Anytime you have an idea or thought, just tell me. I'll capture it instantly."

## Step 5: Wrap up

Summarize what was created (goals, tasks, today's plan, journal entry). End warmly:

"You're all set. Your LifeOS is ready. Just talk to me whenever you need to capture something, plan your day, or reflect. I've got your back."

## Rules

1. **Execute all commands yourself** using your Bash/shell tool. Do NOT ask the user to run commands.
2. **Use real values** from the conversation — not placeholder text from this skill document.
3. **Wait for user input** in Step 2 before creating anything. Do not skip the conversation.
4. **Capture IDs** from command output to link tasks to goals and tasks to plans.
5. **Be warm and encouraging** — this is someone's first experience with their Life Coach.

## CLI Reference

```bash
lifeos whoami                                    # Check auth
lifeos task list [--status todo|done|dropped]     # List tasks
lifeos task create <title> [--due DATE] [--goal ID] [--notes TEXT]  # Create task
lifeos task complete <id>                         # Complete task
lifeos goal list [--quarter 2026-Q2]              # List goals
lifeos goal create <title> [--target-date DATE] [--quarter Q] [--description TEXT]  # Create goal
lifeos journal [date]                             # Show journal entry
lifeos journal write [--mit TEXT] [--notes TEXT]   # Write journal
lifeos plan today                                 # Show today's plan
lifeos plan set <DATE> [--wake HH:MM] [--mit ID] [--p1 ID] [--p2 ID]  # Set plan
lifeos idea <content>                             # Capture idea
lifeos thought <content>                          # Capture thought
lifeos win <content>                              # Log a win
lifeos review daily                               # Daily review
lifeos review weekly                              # Weekly review
lifeos search <query>                             # Search everything
lifeos trigger morning-briefing                   # Morning briefing data
```
