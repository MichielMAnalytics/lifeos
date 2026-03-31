'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

// ── Date formatting helpers ─────────────────────────

function formatReminderDate(epochMs: number): string {
  const now = new Date();
  const d = new Date(epochMs);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrowStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const timeStr = m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;

  const dMs = d.getTime();
  if (dMs >= todayStart.getTime() && dMs < tomorrowStart.getTime()) {
    return `Today ${timeStr}`;
  }
  if (dMs >= tomorrowStart.getTime() && dMs < dayAfterTomorrow.getTime()) {
    return `Tomorrow ${timeStr}`;
  }

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()} ${timeStr}`;
}

function isOverdue(epochMs: number): boolean {
  return epochMs < Date.now();
}

// ── Main component ──────────────────────────────────

export function RemindersUpcoming() {
  const reminders = useQuery(api.reminders.list, { status: 'pending' });
  const snoozedReminders = useQuery(api.reminders.list, { status: 'snoozed' });
  const markDone = useMutation(api.reminders.markDone);
  const snooze = useMutation(api.reminders.snooze);

  const allReminders = (() => {
    if (reminders === undefined || snoozedReminders === undefined) return undefined;
    return [...reminders, ...snoozedReminders].sort(
      (a, b) => a.scheduledAt - b.scheduledAt,
    );
  })();

  if (allReminders === undefined) {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <div className="animate-pulse h-4 w-40 bg-surface rounded" />
        </div>
        <div className="p-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse h-10 bg-surface rounded" />
          ))}
        </div>
      </div>
    );
  }

  const handleMarkDone = (id: Id<'reminders'>) => {
    void markDone({ id });
  };

  const handleSnooze = (id: Id<'reminders'>) => {
    void snooze({ id, minutes: 30 });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
          Upcoming Reminders
        </h2>
        <span className="text-xs font-mono text-text-muted">
          {allReminders.length} pending
        </span>
      </div>

      {allReminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <p className="text-sm text-text-muted">No upcoming reminders</p>
          <p className="text-xs text-text-muted/60 mt-1">
            Create reminders from the quick capture bar
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {allReminders.map((reminder) => {
            const overdue = isOverdue(reminder.scheduledAt);

            return (
              <div
                key={reminder._id}
                className={cn(
                  'flex items-center gap-4 px-6 py-3 transition-colors',
                  overdue && 'bg-danger/[0.03]',
                )}
              >
                {/* Status dot */}
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    overdue ? 'bg-danger' : reminder.status === 'snoozed' ? 'bg-warning' : 'bg-accent',
                  )}
                />

                {/* Time + title */}
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      'text-xs font-mono block',
                      overdue ? 'text-danger' : 'text-text-muted',
                    )}
                  >
                    {formatReminderDate(reminder.scheduledAt)}
                    {reminder.status === 'snoozed' && (
                      <span className="ml-1.5 text-warning">
                        (snoozed x{reminder.snoozeCount})
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-text block truncate">
                    {reminder.title}
                  </span>
                  {reminder.body && (
                    <span className="text-xs text-text-muted/60 block truncate mt-0.5">
                      {reminder.body}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Done button */}
                  <button
                    onClick={() => handleMarkDone(reminder._id)}
                    className="flex h-7 w-7 items-center justify-center rounded border border-border text-text-muted hover:text-success hover:border-success transition-colors"
                    title="Mark done"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>

                  {/* Snooze button (30 min) */}
                  <button
                    onClick={() => handleSnooze(reminder._id)}
                    className="flex h-7 w-7 items-center justify-center rounded border border-border text-text-muted hover:text-warning hover:border-warning transition-colors"
                    title="Snooze 30 minutes"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
