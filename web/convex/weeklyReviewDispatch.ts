// Weekly-review prompt dispatcher — Sunday-evening DM that primes the
// user's Telegram bot to run the /weekly-review skill.
//
// Architecture mirrors `reminderDispatch.ts`:
//   • Cron (`crons.ts`) calls `tick` once per week.
//   • `tick` finds every user with a Telegram chat ID + bot token,
//     pulls their last weekly review and recent wins for context,
//     composes a single prompt with that pre-population, and sends it
//     via the user's own bot.
//   • The bot (OpenClaw, owns the webhook) sees the user's reply (one
//     voice note) and runs the `weekly-review` skill from
//     `packages/cli/skills/weekly-review/SKILL.md` — that skill parses
//     the transcript and POSTs the structured review to
//     `/api/v1/reviews`.
//
// Idempotency: we record the timestamp of the last successful dispatch
// per user on the `users` row (`weeklyReviewPromptedAt`). The cron runs
// once a week, but if we ever switch to per-tz polling the timestamp
// guard prevents double-prompts. A user can ALSO manually invoke
// /weekly-review at any time — we don't gate that.

"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { readByokSecret } from "./k8s";

const TELEGRAM_API = "https://api.telegram.org";

interface DispatchSummary {
  prompted: number;
  skipped: number;
  failed: number;
}

export const tick = internalAction({
  args: {},
  handler: async (ctx): Promise<DispatchSummary> => {
    const userIds: Id<"users">[] = await ctx.runQuery(
      internal.weeklyReviewHelpers._listChatConnectedUserIds,
      {},
    );

    let prompted = 0;
    let skipped = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const context = await ctx.runQuery(
          internal.weeklyReviewHelpers._getUserContext,
          { userId },
        );
        if (!context.chatId) {
          skipped++;
          continue;
        }
        const token = await readByokSecret(userId, "telegram-bot");
        if (!token) {
          skipped++;
          continue;
        }

        const text = composePrompt(context);
        await sendTelegramMessage(token, context.chatId, text);
        await ctx.runMutation(
          internal.weeklyReviewHelpers._stampPromptedAt,
          { userId, ts: Date.now() },
        );
        prompted++;
      } catch (err) {
        console.error("[weeklyReviewDispatch] failed for user", String(userId), err);
        failed++;
      }
    }

    return { prompted, skipped, failed };
  },
});

// ── Prompt composition ───────────────────────────────

interface UserContext {
  chatId: string | null;
  priorYearAndQuarter: string;
  priorPriorities: { p1?: string; p2?: string; p3?: string } | null;
  recentWinsCount: number;
  recentWinSamples: string[];
  activeQuarterGoalTitles: string[];
}

function composePrompt(c: UserContext): string {
  const lines: string[] = [];
  lines.push("Sunday review time 🪞");
  lines.push("");

  if (c.priorPriorities) {
    const items = [c.priorPriorities.p1, c.priorPriorities.p2, c.priorPriorities.p3]
      .filter((s): s is string => Boolean(s?.trim()));
    if (items.length > 0) {
      lines.push("Last week you said you'd focus on:");
      for (const it of items) lines.push(`• ${it}`);
      lines.push("");
    }
  }

  if (c.recentWinsCount > 0) {
    const sampleStr =
      c.recentWinSamples.length > 0
        ? ` — including: ${c.recentWinSamples.slice(0, 2).join("; ")}`
        : "";
    lines.push(`You logged ${c.recentWinsCount} win${c.recentWinsCount === 1 ? "" : "s"} this week${sampleStr}.`);
    lines.push("");
  }

  if (c.activeQuarterGoalTitles.length > 0) {
    lines.push(`${c.priorYearAndQuarter} is still open: ${c.activeQuarterGoalTitles.slice(0, 2).join(", ")}.`);
    lines.push("");
  }

  lines.push(
    "Send me one voice note (1-3 min) covering: how those priorities went, what worked / what didn't / the lesson, and your top 3 priorities for next week.",
  );

  return lines.join("\n");
}

// ── Telegram wire ────────────────────────────────────

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      // No parse_mode — keep things plain so we never trip on entity escaping.
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`telegram-${res.status}: ${body.slice(0, 200)}`);
  }
}
