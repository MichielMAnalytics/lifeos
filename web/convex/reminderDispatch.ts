// Reminder dispatcher — sends due reminders to Telegram using each user's
// own bot. The bot token is the same one they configured during the
// OpenClaw channel setup; we read it from GCP Secret Manager via
// `readByokSecret(userId, "telegram-bot")` so there's no separate
// global env var, no second bot, no re-entry.
//
// Architecture:
// - A cron in `crons.ts` calls `tick` every minute.
// - `tick` finds reminders whose `scheduledAt <= now` AND status is
//   `pending`. For each, it looks up the user's bot token + chat ID
//   and sends a plain-text Telegram message. After a successful send
//   the row flips to `delivered`.
// - We do NOT include inline buttons. The bot's webhook is owned by
//   OpenClaw (chat with the agent), so any callback_query we wired up
//   would land in the pod, not here. Done/snooze/cancel happen via the
//   dashboard. Future work could route callbacks through the gateway
//   or via natural-language replies the agent parses.
//
// File runs in the Node runtime (needs fetch, env, and the Secret
// Manager helper). Per Convex rules queries/mutations live elsewhere
// — see `reminderHelpers.ts`.

"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readByokSecret } from "./k8s";
import type { Doc } from "./_generated/dataModel";

const TELEGRAM_API = "https://api.telegram.org";

// ── sendTestTelegram ─────────────────────────────────
// Public action triggered from the Telegram setup card. Reads the user's
// own bot token + chat ID and fires a confirmation message immediately.
// Returns the real delivery result (not just "scheduled") so the UI can
// show the precise reason on failure.

export const sendTestTelegram = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    | { ok: true }
    | { ok: false; reason: "no-chat-id" | "no-bot-token" | string; detail?: string }
  > => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const chatId = (await ctx.runQuery(internal.reminderHelpers._getUserChatId, {
      userId,
    })) as string | null;
    if (!chatId) return { ok: false, reason: "no-chat-id" };

    const token = await readByokSecret(userId, "telegram-bot");
    if (!token) return { ok: false, reason: "no-bot-token" };

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
    // Atomic claim: flips pending → sending in one transaction so two
    // overlapping ticks (cron fires while previous one still running) can't
    // double-deliver the same reminder. The dispatcher must transition each
    // claimed row to `delivered` on success or release back to `pending` on
    // recoverable failure.
    const due = (await ctx.runMutation(internal.reminderHelpers._claimDue, {})) as Doc<"reminders">[];
    let delivered = 0;
    let skipped = 0;

    // Cache per-user lookups within a tick — same user with multiple
    // reminders only does one Secret Manager read.
    const tokenCache = new Map<string, string | null>();
    const chatIdCache = new Map<string, string | null>();

    for (const reminder of due) {
      const uidKey = String(reminder.userId);

      // Wrap the WHOLE per-reminder block (including secret reads). A
      // GCP misconfiguration (missing GCP_PROJECT_ID, stale service-account
      // token) used to throw out of `readByokSecret` and abort the entire
      // tick, dropping every later reminder. Now one bad user just gets
      // skipped and we keep going.
      try {
        let chatId = chatIdCache.get(uidKey);
        if (chatId === undefined) {
          chatId = (await ctx.runQuery(internal.reminderHelpers._getUserChatId, {
            userId: reminder.userId,
          })) as string | null;
          chatIdCache.set(uidKey, chatId);
        }
        if (!chatId) {
          console.warn("[reminderDispatch] skipping", reminder._id, "no telegramChatId for user", uidKey);
          skipped++;
          // Release the claim so the next tick can retry once the user
          // links their chat (or we'd lose this reminder forever in the
          // `sending` state).
          await ctx.runMutation(internal.reminderHelpers._releaseClaim, { id: reminder._id });
          continue;
        }

        let token = tokenCache.get(uidKey);
        if (token === undefined) {
          token = await readByokSecret(uidKey, "telegram-bot");
          tokenCache.set(uidKey, token);
        }
        if (!token) {
          // User hasn't configured a Telegram bot yet — leave pending so
          // a future tick (after they wire it up) picks it up.
          console.warn("[reminderDispatch] skipping", reminder._id, "no telegram-bot secret for user", uidKey);
          skipped++;
          await ctx.runMutation(internal.reminderHelpers._releaseClaim, { id: reminder._id });
          continue;
        }

        await sendReminder(token, chatId, reminder);
        await ctx.runMutation(internal.reminderHelpers._markDelivered, { id: reminder._id });
        delivered++;
      } catch (err) {
        // Cache the failure so we don't keep retrying GCP for the same
        // user inside one tick. Next tick will retry from scratch.
        if (!tokenCache.has(uidKey)) tokenCache.set(uidKey, null);
        console.error("[reminderDispatch] failed to send reminder", reminder._id, "user", uidKey, err);
        // Release so the row goes back to pending — otherwise it gets
        // stuck in `sending` and never delivers. Best-effort; if the
        // release itself fails we accept the row staying claimed for one
        // cron cycle's worth of recovery time.
        try {
          await ctx.runMutation(internal.reminderHelpers._releaseClaim, { id: reminder._id });
        } catch (releaseErr) {
          console.error("[reminderDispatch] release failed for", reminder._id, releaseErr);
        }
      }
    }

    return { delivered, skipped };
  },
});

// ── Telegram wire format ─────────────────────────────

async function sendReminder(token: string, chatId: string, r: Doc<"reminders">) {
  // Plain text only. The user's bot's webhook is owned by OpenClaw, so
  // we can't receive callback_query taps — inline buttons would render
  // but tapping them would silently do nothing.
  const lines = [`🔔 ${r.title}`];
  if (r.body) lines.push("", r.body);
  const text = lines.join("\n");

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage ${res.status}: ${body}`);
  }
}
