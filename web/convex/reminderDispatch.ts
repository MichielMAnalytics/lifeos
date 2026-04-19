// Reminder dispatcher — sends due reminders to Telegram with inline buttons.
//
// Architecture (option A from the planning convo):
// - A cron in `crons.ts` calls `tick` every minute.
// - `tick` (an action) finds all reminders whose `scheduledAt <= now` AND
//   status is `pending`, and for each calls Telegram's sendMessage with an
//   inline keyboard. After a successful send, the row is patched to
//   `delivered` so it won't fire again.
// - User taps a button → Telegram POSTs to our webhook (`http.ts`,
//   `/api/v1/telegram/webhook`) → we route the callback_data to mark
//   done / snooze / cancel.
//
// Two pieces must be configured outside this file for end-to-end:
//   1. Convex env var `TELEGRAM_BOT_TOKEN` — the LifeOS bot's HTTP token.
//   2. Each user's `telegramChatId` (set in Settings or auto-linked when
//      they `/start <email>` the bot). Reminders for users without a chat
//      ID are logged and left pending — they don't error.
//
// File runs in the Node runtime (needs fetch + env). Per Convex rules
// queries/mutations must live elsewhere — see `reminderHelpers.ts`.

"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

const TELEGRAM_API = "https://api.telegram.org";

// ── sendTestTelegram ─────────────────────────────────
// Public action triggered from the Telegram setup card. Lives here (not in
// reminderHelpers) because it has to hit the Telegram Bot API and read the
// token from env — both Node-only. Returns the real delivery result, not
// just "scheduled," so the UI can show whether the message actually got
// to Telegram or whether the env var / chat ID / network failed.

export const sendTestTelegram = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    | { ok: true }
    | { ok: false; reason: "no-chat-id" | "no-token" | string; detail?: string }
  > => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const chatId = (await ctx.runQuery(internal.reminderHelpers._getUserChatId, {
      userId,
    })) as string | null;
    if (!chatId) return { ok: false, reason: "no-chat-id" };

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("[telegram-test] TELEGRAM_BOT_TOKEN is not set in Convex env");
      return { ok: false, reason: "no-token" };
    }

    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text:
          "✅ LifeOS test\n\n" +
          "If you see this, your Telegram delivery is working. " +
          "Reminders set in LifeOS will arrive here at their scheduled time.",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[telegram-test] sendMessage failed", res.status, body);
      return { ok: false, reason: `telegram-${res.status}`, detail: body };
    }
    return { ok: true };
  },
});

// ── The cron tick ────────────────────────────────────

export const tick = internalAction({
  args: {},
  handler: async (ctx) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      // Token isn't configured yet — surface in logs, but don't error
      // (cron retries every minute, no-op until token is set).
      console.warn("[reminderDispatch] TELEGRAM_BOT_TOKEN not set; skipping tick");
      return { delivered: 0, skipped: 0 };
    }

    const due = (await ctx.runQuery(internal.reminderHelpers._findDue, {})) as Doc<"reminders">[];
    let delivered = 0;
    let skipped = 0;

    for (const reminder of due) {
      const chatId = (await ctx.runQuery(internal.reminderHelpers._getUserChatId, {
        userId: reminder.userId,
      })) as string | null;

      if (!chatId) {
        // User hasn't linked Telegram. Leave as pending so it can fire later
        // once they configure it.
        skipped++;
        continue;
      }

      try {
        await sendReminder(token, chatId, reminder);
        await ctx.runMutation(internal.reminderHelpers._markDelivered, { id: reminder._id });
        delivered++;
      } catch (err) {
        // Log and continue. The next tick will retry.
        console.error("[reminderDispatch] failed to send reminder", reminder._id, err);
      }
    }

    return { delivered, skipped };
  },
});

// ── Telegram wire format ─────────────────────────────

async function sendReminder(token: string, chatId: string, r: Doc<"reminders">) {
  const text = r.body
    ? `*${escapeMd(r.title)}*\n\n${escapeMd(r.body)}`
    : `*${escapeMd(r.title)}*`;
  // callback_data is opaque to Telegram; we encode action + reminder id.
  const reply_markup = {
    inline_keyboard: [
      [
        { text: "✅ Done", callback_data: `done:${r._id}` },
        { text: "💤 Snooze 1h", callback_data: `snooze60:${r._id}` },
        { text: "❌ Cancel", callback_data: `cancel:${r._id}` },
      ],
    ],
  };
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
      reply_markup,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage ${res.status}: ${body}`);
  }
}

/** Telegram's MarkdownV2 reserved characters that must be escaped. */
function escapeMd(s: string): string {
  return s.replace(/([_*\[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

// ── Webhook handler (called from convex/http.ts) ─────

export const handleCallback = internalAction({
  args: {
    callbackQueryId: v.string(),
    data: v.string(),               // "done:<id>" | "snooze60:<id>" | "cancel:<id>"
    chatId: v.optional(v.string()), // for editing the original message
    messageId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return { ok: false, reason: "no-token" };

    const sep = args.data.indexOf(":");
    if (sep === -1) return { ok: false, reason: "bad-format" };
    const action = args.data.slice(0, sep);
    const reminderId = args.data.slice(sep + 1) as Id<"reminders">;

    let resultText = "Updated";
    try {
      if (action === "done") {
        await ctx.runMutation(internal.reminderHelpers._setReminderStatus, {
          id: reminderId,
          status: "done",
        });
        resultText = "✅ Marked done";
      } else if (action === "snooze60") {
        await ctx.runMutation(internal.reminderHelpers._snoozeReminder, {
          id: reminderId,
          minutes: 60,
        });
        resultText = "💤 Snoozed 1h";
      } else if (action === "cancel") {
        await ctx.runMutation(internal.reminderHelpers._setReminderStatus, {
          id: reminderId,
          status: "done", // soft-cancel: close it out, don't delete
        });
        resultText = "❌ Cancelled";
      } else {
        return { ok: false, reason: "unknown-action" };
      }
    } catch (err) {
      console.error("[reminderDispatch] callback failed", err);
      resultText = "Sorry — that didn't work";
    }

    // Acknowledge the button so Telegram stops the loading spinner.
    try {
      await fetch(`${TELEGRAM_API}/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          callback_query_id: args.callbackQueryId,
          text: resultText,
        }),
      });
    } catch {
      // Non-fatal; the mutation already happened.
    }

    // Edit the original message to fully remove the buttons. We don't keep
    // a "noop" button as a status badge — Telegram would render it as
    // tap-able and any tap would loop the spinner forever. The result text
    // is delivered via answerCallbackQuery (toast above) instead.
    if (args.chatId && args.messageId !== undefined) {
      try {
        await fetch(`${TELEGRAM_API}/bot${token}/editMessageReplyMarkup`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: args.chatId,
            message_id: args.messageId,
            reply_markup: { inline_keyboard: [] },
          }),
        });
      } catch {
        // Non-fatal.
      }
    }

    return { ok: true };
  },
});
