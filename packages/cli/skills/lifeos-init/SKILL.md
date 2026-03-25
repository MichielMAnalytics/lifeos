---
name: lifeos-init
description: "Set up LifeOS — your personal life operating system. Use when: user says /lifeos-init, 'set up lifeos', 'initialize lifeos', or is using LifeOS for the first time. Walks through configuration, learns about goals and routines, and creates a personalized productivity system."
metadata: { "openclaw": { "emoji": "🌿" } }
---

# LifeOS Init

Set up LifeOS — your personal life operating system.

## When to Use

✅ **USE this skill when:**
- User says `/lifeos-init`
- "Set up lifeos" or "initialize lifeos"
- First time using LifeOS
- "Help me get organized"
- "Set up my goals and routines"

## Step 1: Verify CLI is configured

Run `lifeos whoami` to check if the CLI is already configured. If it works, skip to Step 2. If not, guide the user:

1. The CLI should already be installed. Run `lifeos whoami` to verify.
2. If not configured, run:
   - `lifeos config set-url https://proper-cormorant-28.eu-west-1.convex.site`
   - `lifeos config set-key <their-api-key>` (ask them to generate one from Settings)
3. Verify with `lifeos whoami`

## Step 2: Learn about the user

Have a friendly conversation to understand:

1. **What's your main focus right now?** (work project, health, learning, side project, etc.)
2. **What does a typical day look like?** (wake time, work hours, exercise, breaks)
3. **What are your top 2-3 goals for this quarter?** (be specific — "launch MVP by April" not "be productive")
4. **How do you like to reflect?** (morning journaling, evening review, weekly planning sessions)
5. **Any habits you're building or breaking?**

Keep it conversational and warm. Don't ask all questions at once — let it flow naturally.

## Step 3: Create the initial structure

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

## Step 4: Suggest routines

Based on their preferences, suggest daily routines they can do with you:

- **Morning briefing**: "Each morning, ask me for your morning briefing. I'll run `lifeos trigger morning-briefing` and summarize your day."
- **Evening journal**: "Before bed, tell me about your day. I'll write your journal entry and log your wins."
- **Weekly review**: "Every Sunday, we can do a weekly review together. I'll pull your stats and help you plan the next week."
- **Quick capture**: "Anytime you have an idea or thought, just tell me. I'll capture it instantly."

Let the user know they can say any of these naturally — you'll handle the CLI commands behind the scenes.

## Step 5: Wrap up

Summarize what was set up:
- Goals created
- Tasks queued
- Today's plan set
- First journal written

End with something warm like: "You're all set. Your LifeOS is ready. Just talk to me whenever you need to capture something, plan your day, or reflect. I've got your back."

## CLI Reference

Key commands available:
- `lifeos whoami` — check auth
- `lifeos task list` / `create` / `complete` — task management
- `lifeos goal list` / `create` / `health` — goal tracking
- `lifeos journal [date]` / `journal write` — daily journaling
- `lifeos plan today` / `plan set` — day planning with MIT/P1/P2
- `lifeos idea <content>` — capture ideas
- `lifeos thought <content>` — capture thoughts
- `lifeos win <content>` — log wins
- `lifeos review daily` / `weekly` — trigger reviews
- `lifeos search <query>` — search across everything
- `lifeos trigger morning-briefing` — morning briefing data
