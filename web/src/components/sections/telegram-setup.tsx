'use client';

// Telegram delivery setup card. Surfaces the status of the per-user
// Telegram link and lets the user:
//   1. Generate a one-time link code → paste into the bot via /start <CODE>
//   2. Trigger a "send me a test message right now" to verify the
//      whole pipeline (token + chat ID + webhook reachability)
//
// The card stays compact when everything is wired up.

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
  const generateCode = useMutation(api.authHelpers.generateTelegramLinkCode);
  // Test path is an action because it has to actually hit Telegram and
  // return the real delivery result (not just "scheduled").
  const sendTest = useAction(api.reminderDispatch.sendTestTelegram);

  const [code, setCode] = useState<{ code: string; expiresAt: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [test, setTest] = useState<TestState>({ state: 'idle' });
  const [copied, setCopied] = useState(false);

  // Auto-clear "sent" / "copied" state after a few seconds.
  useEffect(() => {
    if (test.state !== 'sent') return;
    const t = setTimeout(() => setTest({ state: 'idle' }), 4000);
    return () => clearTimeout(t);
  }, [test.state]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (user === undefined) {
    return (
      <div className="border border-border rounded-xl p-4 animate-pulse">
        <div className="h-3 w-32 bg-surface rounded" />
      </div>
    );
  }
  if (user === null) return null;

  const isLinked = !!user.telegramChatId;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await generateCode({});
      setCode(res);
    } finally {
      setGenerating(false);
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

  function handleCopy(text: string) {
    void navigator.clipboard.writeText(text).then(() => setCopied(true));
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
            {isLinked ? 'Linked' : 'Not linked'}
          </span>
        </div>
        {isLinked && (
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
        {!isLinked && !code && (
          <>
            <p className="text-xs text-text-muted leading-relaxed">
              Reminders fire to Telegram at their scheduled time with{' '}
              <span className="text-text">Done / Snooze 1h / Cancel</span> buttons.
              Generate a one-time code below, then send <code className="text-text bg-bg-subtle px-1 rounded">/start CODE</code> to
              the LifeOS bot to link your chat.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {generating ? 'Generating…' : 'Generate link code'}
            </button>
          </>
        )}

        {!isLinked && code && (
          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80">
              Send this to the bot:
            </span>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-bg-subtle border border-border rounded-lg px-3 py-2 text-base font-mono tracking-[0.2em] text-text">
                /start {code.code}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(`/start ${code.code}`)}
                className="text-[11px] font-semibold uppercase tracking-wide px-3 py-2 rounded-md border border-border hover:border-text-muted transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-text-muted">
              Expires in {Math.max(0, Math.ceil((code.expiresAt - Date.now()) / 60_000))} min.
              The card will refresh on its own once the bot sees your message.
            </p>
          </div>
        )}

        {isLinked && (
          <p className="text-xs text-text-muted">
            Linked to chat <code className="text-text bg-bg-subtle px-1 rounded">{user.telegramChatId}</code>.
            Reminders fire automatically at their scheduled time. Use “Send test” above to verify the bot can reach you.
          </p>
        )}

        {test.state === 'error' && (
          <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
            <strong>Test failed:</strong> {test.reason === 'no-chat-id'
              ? 'no chat ID linked yet'
              : test.reason === 'no-token'
                ? 'TELEGRAM_BOT_TOKEN env var is not set in Convex'
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
