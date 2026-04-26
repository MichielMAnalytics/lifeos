---
name: weekly-review
description: "Run a weekly review with the user as a single voice-note conversation on Telegram (or chat). Use when: user says /weekly-review, 'do my weekly review', 'let's review the week', 'sunday review', or it's late Sunday and they haven't reviewed yet. Pulls the prior week's priorities, wins, and goal context, asks for one voice note covering reflection + next-week priorities, parses the transcript, and writes the review to LifeOS."
user-invocable: true
metadata: { "openclaw": { "emoji": "🪞", "requires": { "bins": ["lifeos"] }, "install": [{ "id": "npm-lifeos", "kind": "node", "package": "lifeos-cli", "bins": ["lifeos"], "label": "Install LifeOS CLI (npm)" }] } }
---

# Weekly Review

You are the user's **Life Coach**. This skill runs the Sunday/end-of-week review as a single back-and-forth: you pull context, ask for one voice note, parse the response, save it.

## Why one voice note

The user is busy and probably tired by Sunday. Forcing them through a dashboard form kills the habit. The natural moment is one rambling voice note in the kitchen / on a walk — you do the structured-data work behind the scenes.

## Step 1 — Pull context BEFORE asking anything

Run these and hold the output in your head. Do NOT show raw output to the user.

```bash
# Most recent weekly review (gives you last week's priorities to compare against)
lifeos review list --type weekly --json | head -200

# This week's wins
lifeos win list --json   # filter to last 7 days client-side

# Active quarterly goals (for the cascade — what should next week's priorities ladder up to?)
lifeos goal list --status active --json
```

If `lifeos review list` returns at least one weekly review, parse `content.nextWeekPriorities.{p1,p2,p3}` from the most recent one — those are the priorities the user committed to *for the week that just ended*. Hold them; you'll surface them in the prompt.

If there's no prior review, skip the comparison framing and treat this as the first review.

## Step 2 — Send ONE message asking for the voice note

Compose a single warm Telegram message. Pattern:

> Sunday review time 🪞
>
> Last week you said you'd focus on:
> • {p1 from previous review}
> • {p2 from previous review}
> • {p3 from previous review}
>
> You logged {N} wins this week — {pick 1-2 specific ones to call out}.
>
> Send me **one voice note** (1-3 min is plenty) covering:
>   – how those three priorities actually went
>   – what worked / what didn't / what's the lesson
>   – your top 3 priorities for next week
>
> I'll write it up and pin the new priorities to your Today page.

**Keep it conversational.** No headers, no bullet IDs the user has to think about. If there's no prior review, drop the "Last week you said" block and just ask for the voice note covering "how the week went / what worked / what didn't / your top 3 for next week".

If active quarterly goals exist, you can mention 1 in passing as a nudge ("with Q2 launch still open, worth thinking about that for next week"), but don't pressure — they pick.

## Step 3 — Wait for the voice note

OpenClaw auto-transcribes voice messages — you'll receive the transcript. If the user replies with text instead of voice, accept it.

If the response is unclear or only covers part of what you asked (e.g., they only talk about reflection, no next-week priorities), ask one targeted follow-up — ONE voice note maximum. Don't death-march them.

## Step 4 — Parse the transcript into the review schema

Mentally extract:

- **highlights**: short bullet phrases summarising what went well. Pull from explicit "the win this week was X" mentions plus things they said worked. Up to ~5 items.
- **challenges**: a single paragraph (1-3 sentences) of what was hard. Their words; tighten if rambling.
- **goalUpdates**: for each active goal, a one-line status note IF they explicitly mentioned it. Skip goals they didn't talk about (don't fabricate progress).
- **nextWeekPriorities**: `{ p1, p2, p3 }` — three short imperative phrases. The most important first. If they only gave you 1 or 2, fill the rest with `""` and ask if they want a P3 (one short follow-up, no pressure).
- **score**: 1-10, integer. Infer from tone/explicit number. If unclear, ask one short follow-up.

Also include the raw transcript at `content.transcript` so the dashboard can show the unedited voice if the user wants to see it.

## Step 5 — Save the review

Call the LifeOS API directly (the CLI doesn't have a `review create` for weekly yet that takes structured content):

```bash
# Compute periodStart (this week's Monday) and periodEnd (Sunday)
# Then POST to the deployment-bound API
curl -sS -X POST "$LIFEOS_API_URL/api/v1/reviews" \
  -H "Authorization: Bearer $LIFEOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewType": "weekly",
    "periodStart": "<YYYY-MM-DD Monday>",
    "periodEnd":   "<YYYY-MM-DD Sunday>",
    "score":       <int>,
    "content": {
      "highlights": ["...", "..."],
      "challenges": "...",
      "goalUpdates": [{"goalId": "...", "title": "...", "notes": "..."}],
      "nextWeekPriorities": {"p1": "...", "p2": "...", "p3": "..."},
      "transcript": "<the user voice transcript verbatim>"
    }
  }'
```

`$LIFEOS_API_URL` and `$LIFEOS_API_KEY` are already configured in your environment by the LifeOS CLI install — same keys `lifeos config show` would print. If the env vars aren't set, fall back to `lifeos review list --type weekly` first to verify the CLI works, then ask the user to run `lifeos config set-key` (rare).

## Step 6 — Confirm warmly, then stop

After a successful POST, send one short Telegram message:

> Logged. Next week's three pinned to your Today page:
> • {p1}
> • {p2}
> • {p3}
>
> Score: {score}/10. Have a good rest of Sunday.

**Do not** dump the parsed JSON back. **Do not** ask follow-up questions like "anything else?" — the review is done. They can come find you for anything else.

## Edge cases

- **User doesn't reply for >2h**: don't nag. The cron will try again next Sunday. Just stop.
- **User says "skip this week"**: acknowledge, save nothing, end.
- **User wants to redo the review**: re-invoke from step 2. The latest review wins (priorities are read from `latestOfType` on the dashboard).
- **Voice transcript is gibberish or empty**: tell them you couldn't hear it, ask for a re-send. One retry max, then offer to do it on the dashboard instead.
- **Multiple voice notes in a row**: concatenate the transcripts in order, parse the merged text.

## What NOT to do

- Don't show the raw transcript back ("just to confirm…"). They sent it; they know what they said.
- Don't ask for highlights/challenges/score one at a time. The whole point is one voice note.
- Don't write commentary or coaching paragraphs in the confirmation. The save itself is the reward.
- Don't store empty fields with placeholder text like "TBD" — leave them out.
