'use client';

// Telegram delivery setup card.
//
// The bot is the same one configured during OpenClaw channel setup —
// LifeOS reads the token from GCP Secret Manager via `readByokSecret`,
// so there's no second token to enter here. The only thing we need
// from the user is the Telegram chat ID where reminders should land
// (LifeOS can't auto-detect because the bot's webhook points at the
// pod, not Convex).
//
// The card lets the user:
//   1. Paste / clear their chat ID (saved via `auth.updateMe`)
//   2. Send a test message right now (real delivery result, not just
//      "scheduled") to verify the whole pipeline.

import { useState, useEffect } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { cn } from '@/lib/utils';

type TestState =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'sent' }
  | { state: 'error'; reason: string };

export function TelegramSetup() {
  const user = useCurrentUser();
  const updateMe = useMutation(api.authHelpers.updateMe);
  const sendTest = useAction(api.reminderDispatch.sendTestTelegram);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<TestState>({ state: 'idle' });

  useEffect(() => {
    if (test.state !== 'sent') return;
    const t = setTimeout(() => setTest({ state: 'idle' }), 4000);
    return () => clearTimeout(t);
  }, [test.state]);

  if (user === undefined) {
    return (
      <div className="border border-border rounded-xl p-4 animate-pulse">
        <div className="h-3 w-32 bg-surface rounded" />
      </div>
    );
  }
  if (user === null) return null;

  const isLinked = !!user.telegramChatId;

  async function handleSave() {
    setSaving(true);
    try {
      await updateMe({ telegramChatId: draft.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (saving) return;
    setSaving(true);
    try {
      // Empty string — `updateMe` interprets it as "clear" via trim.
      await updateMe({ telegramChatId: '' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setTest({ state: 'sending' });
    try {
      const res = await sendTest({});
      if (res.ok) {
        setTest({ state: 'sent' });
      } else {
        setTest({ state: 'error', reason: res.reason });
      }
    } catch (err) {
      setTest({
        state: 'error',
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <div className="border border-border rounded-xl">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'h-2 w-2 rounded-full shrink-0',
              isLinked ? 'bg-success' : 'bg-warning',
            )}
            aria-hidden
          />
          <h3 className="text-sm font-semibold text-text">Telegram delivery</h3>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80">
            {isLinked ? 'Linked' : 'Chat ID needed'}
          </span>
        </div>
        {isLinked && !editing && (
          <button
            type="button"
            onClick={handleSendTest}
            disabled={test.state === 'sending'}
            className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-md border border-accent/30 text-accent hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
          >
            {test.state === 'sending' ? 'Sending…' :
             test.state === 'sent' ? '✓ Sent' :
             'Send test'}
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {!isLinked && !editing && (
          <>
            <p className="text-xs text-text-muted leading-relaxed">
              Reminders fire to Telegram via the bot you configured during
              channel setup. Two ways to link your chat:
            </p>
            <ul className="text-xs text-text-muted leading-relaxed list-disc list-inside space-y-1 ml-1">
              <li>
                <strong className="text-text">Automatic:</strong> the next time you message your bot,
                ask it to <em>“link my chat to LifeAI”</em>. Your agent (which has the CLI)
                will run <code className="text-text bg-bg-subtle px-1 rounded">lifeos profile set-telegram-chat-id &lt;chat&gt;</code>.
              </li>
              <li>
                <strong className="text-text">Manual:</strong> paste your chat ID below. Find it by
                sending any message to{' '}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  @userinfobot
                </a>.
              </li>
            </ul>
            <button
              type="button"
              onClick={() => {
                setDraft('');
                setEditing(true);
              }}
              className="text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Paste chat ID
            </button>
          </>
        )}

        {editing && (
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80 block">
              Telegram chat ID
            </label>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. 123456789"
              autoFocus
              className="w-full bg-bg-subtle border border-border rounded-lg px-3 py-2 text-sm font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !draft.trim()}
                className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-[11px] font-medium text-text-muted hover:text-text transition-colors px-2 py-1.5"
              >
                Cancel
              </button>
            </div>
            <p className="text-[11px] text-text-muted/80">
              Numeric — usually 9–10 digits. Send /start (or any message)
              to your bot first; then look up the chat ID with{' '}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                @userinfobot
              </a>.
            </p>
          </div>
        )}

        {isLinked && !editing && (
          <p className="text-xs text-text-muted">
            Linked to chat <code className="text-text bg-bg-subtle px-1 rounded">{user.telegramChatId}</code>.
            Reminders fire automatically using your configured bot.{' '}
            <button
              type="button"
              onClick={() => {
                setDraft(user?.telegramChatId ?? '');
                setEditing(true);
              }}
              className="text-accent hover:underline"
            >
              Change
            </button>
            {' · '}
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="text-text-muted hover:text-danger transition-colors"
            >
              Clear
            </button>
          </p>
        )}

        {test.state === 'error' && (
          <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
            <strong>Test failed:</strong>{' '}
            {test.reason === 'no-chat-id'
              ? 'no chat ID set yet'
              : test.reason === 'no-bot-token'
                ? 'no Telegram bot token in your channel setup — configure it in Settings → AI Agent'
                : test.reason}
          </div>
        )}
        {test.state === 'sent' && (
          <p className="text-xs text-success">Test sent — check Telegram.</p>
        )}
      </div>
    </div>
  );
}
