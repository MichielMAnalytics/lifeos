'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/toast';

// ── Proposal shape ──────────────────────────────────────
//
// The Life Coach can embed structured action proposals inside a chat
// message by wrapping a JSON object in [[action]] / [[/action]] markers:
//
//   I'd suggest creating this task.
//   [[action]]
//   {"type":"create_task","title":"Email Faye","dueDate":"2026-05-04"}
//   [[/action]]
//
// The UI extracts each block, renders an ActionCard with confirm/reject
// buttons, and routes confirmation to the matching Convex mutation. This
// keeps the gateway protocol unchanged — the server just emits text — while
// giving the client a typed, auditable approval surface.

export type ActionProposal =
  | { type: 'create_task'; title: string; dueDate?: string; notes?: string }
  | { type: 'create_idea'; content: string; actionability?: 'high' | 'medium' | 'low' }
  | { type: 'create_win'; content: string; entryDate?: string }
  | { type: 'create_reminder'; title: string; scheduledAt: number; body?: string }
  | { type: 'snooze_reminder'; reminderId: string; minutes?: number }
  | { type: 'complete_task'; taskId: string };

const ACTION_RE = /\[\[action\]\]\s*([\s\S]*?)\s*\[\[\/action\]\]/g;

export type ParsedSegment =
  | { kind: 'text'; text: string }
  | { kind: 'action'; proposal: ActionProposal; raw: string };

// Splits a chat message into prose segments and action proposals.
// Malformed JSON inside an action block is dropped silently — the user has
// already seen the surrounding prose, and a half-typed proposal is noise.
export function parseAssistantContent(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  ACTION_RE.lastIndex = 0;
  while ((match = ACTION_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index).trim();
      if (before) segments.push({ kind: 'text', text: before });
    }
    try {
      const proposal = JSON.parse(match[1]) as ActionProposal;
      if (proposal && typeof proposal === 'object' && typeof proposal.type === 'string') {
        segments.push({ kind: 'action', proposal, raw: match[0] });
      }
    } catch {
      /* drop malformed blocks */
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex).trim();
    if (tail) segments.push({ kind: 'text', text: tail });
  }
  if (segments.length === 0 && text.trim()) {
    segments.push({ kind: 'text', text });
  }
  return segments;
}

// ── Card UI ──────────────────────────────────────────────

const ACTION_LABELS: Record<ActionProposal['type'], { verb: string; icon: string }> = {
  create_task: { verb: 'Create task', icon: '☐' },
  create_idea: { verb: 'Capture idea', icon: '💡' },
  create_win: { verb: 'Log win', icon: '🏆' },
  create_reminder: { verb: 'Set reminder', icon: '🔔' },
  snooze_reminder: { verb: 'Snooze reminder', icon: '⏰' },
  complete_task: { verb: 'Complete task', icon: '✅' },
};

function summarise(proposal: ActionProposal): string {
  switch (proposal.type) {
    case 'create_task':
      return proposal.dueDate ? `${proposal.title} — due ${proposal.dueDate}` : proposal.title;
    case 'create_idea':
      return proposal.actionability ? `${proposal.content} (${proposal.actionability})` : proposal.content;
    case 'create_win':
      return proposal.content;
    case 'create_reminder': {
      const when = new Date(proposal.scheduledAt).toLocaleString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
      return `${proposal.title} — ${when}`;
    }
    case 'snooze_reminder':
      return `Reminder ${proposal.reminderId.slice(0, 6)}… for ${proposal.minutes ?? 60}m`;
    case 'complete_task':
      return `Task ${proposal.taskId.slice(0, 6)}…`;
    default:
      return JSON.stringify(proposal);
  }
}

type CardState = 'pending' | 'confirming' | 'done' | 'rejected' | 'error';

export function ActionCard({ proposal }: { proposal: ActionProposal }) {
  const [state, setState] = useState<CardState>('pending');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const createTask = useMutation(api.tasks.create);
  const completeTask = useMutation(api.tasks.complete);
  const createIdea = useMutation(api.ideas.create);
  const createWin = useMutation(api.wins.create);
  const createReminder = useMutation(api.reminders.create);
  const snoozeReminder = useMutation(api.reminders.snooze);

  const label = ACTION_LABELS[proposal.type] ?? { verb: proposal.type, icon: '⚡' };

  async function confirm() {
    setState('confirming');
    setError(null);
    try {
      switch (proposal.type) {
        case 'create_task':
          await createTask({
            title: proposal.title,
            dueDate: proposal.dueDate,
            notes: proposal.notes,
          });
          break;
        case 'create_idea':
          await createIdea({
            content: proposal.content,
            actionability: proposal.actionability,
          });
          break;
        case 'create_win':
          await createWin({ content: proposal.content, entryDate: proposal.entryDate });
          break;
        case 'create_reminder':
          await createReminder({
            title: proposal.title,
            body: proposal.body,
            scheduledAt: proposal.scheduledAt,
          });
          break;
        case 'snooze_reminder':
          await snoozeReminder({
            id: proposal.reminderId as Id<'reminders'>,
            minutes: proposal.minutes ?? 60,
          });
          break;
        case 'complete_task':
          await completeTask({ id: proposal.taskId as Id<'tasks'> });
          break;
      }
      setState('done');
      toast.show(`${label.verb} done`, 'success');
    } catch (err) {
      setState('error');
      const msg = err instanceof Error ? err.message : 'Action failed';
      setError(msg);
      toast.show(msg, 'error');
    }
  }

  function reject() {
    setState('rejected');
  }

  return (
    <div
      className={cn(
        'mr-auto w-full max-w-[85%] rounded-xl border bg-bg-subtle px-3 py-2.5 text-sm',
        state === 'done' && 'border-success/40',
        state === 'rejected' && 'border-text-muted/30 opacity-60',
        state === 'error' && 'border-danger/40',
        state === 'pending' && 'border-accent/40',
        state === 'confirming' && 'border-accent/40 opacity-80',
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-base leading-none mt-0.5" aria-hidden>
          {label.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-text-muted">{label.verb}</div>
          <div className="mt-0.5 text-sm leading-snug text-text break-words">
            {summarise(proposal)}
          </div>
          {state === 'error' && error && (
            <div className="mt-1 text-[11px] text-danger">{error}</div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5">
        {state === 'pending' && (
          <>
            <button
              type="button"
              onClick={reject}
              className="rounded-md px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={confirm}
              className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white hover:bg-accent-hover transition-colors"
            >
              Confirm
            </button>
          </>
        )}
        {state === 'confirming' && (
          <span className="text-[11px] text-text-muted">Working…</span>
        )}
        {state === 'done' && (
          <span className="text-[11px] text-success">Done</span>
        )}
        {state === 'rejected' && (
          <span className="text-[11px] text-text-muted">Skipped</span>
        )}
        {state === 'error' && (
          <button
            type="button"
            onClick={confirm}
            className="rounded-md border border-border px-2 py-1 text-[11px] text-text hover:bg-surface-hover transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
