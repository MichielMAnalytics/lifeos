'use client';

// Routines — surface the recurring background jobs (Convex crons) that
// run on the user's behalf. Static catalogue: cadences are declared in
// `convex/crons.ts` and don't change at runtime, so we don't query for
// them — we mirror the list here with one source of truth (this file)
// for the user-facing copy. If you add or remove a cron in crons.ts,
// update this list to match.
//
// The "weekly review" entry shows the last-prompted timestamp from the
// user's row, since that one is user-personal (the others are system
// jobs that don't touch any per-user state worth surfacing).

import { useCurrentUser } from '@/lib/useCurrentUser';

interface RoutineDef {
  id: string;
  name: string;
  cadence: string;       // human-readable
  description: string;
  lastRunLabel?: () => string | null;
}

function relativeTime(ms: number | null | undefined): string | null {
  if (!ms) return null;
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function Routines() {
  const me = useCurrentUser() as { weeklyReviewPromptedAt?: number } | undefined;

  const routines: RoutineDef[] = [
    {
      id: 'weekly-review',
      name: 'Weekly review prompt',
      cadence: 'Sundays · 18:00 (Bali)',
      description:
        'Telegram DM with last week’s priorities + a wins recap. Reply with one voice note and your Life Coach saves the structured review.',
      lastRunLabel: () => relativeTime(me?.weeklyReviewPromptedAt),
    },
    {
      id: 'reminder-dispatch',
      name: 'Reminders',
      cadence: 'Every minute',
      description:
        'Delivers any reminder whose scheduled time has passed via Telegram.',
    },
    {
      id: 'calendar-sync',
      name: 'Google Calendar sync',
      cadence: 'Every 15 minutes',
      description:
        'Pulls Calendar events for everyone with a connected Google account so meetings show up in Today and Meeting Prep.',
    },
    {
      id: 'granola-sync',
      name: 'Granola sync',
      cadence: 'Hourly',
      description:
        'Polls Granola for new meeting transcripts (Granola has no webhooks).',
    },
    {
      id: 'oauth-purge',
      name: 'OAuth state cleanup',
      cadence: 'Daily',
      description:
        'Drops expired OAuth handshake tokens from the connect-Calendar flow. Safety net.',
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-6 py-4 flex items-baseline justify-between border-b border-border">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted/80">
          Routines
        </h3>
        <span className="text-[10px] text-text-muted/60">automated</span>
      </div>
      <ul className="divide-y divide-border">
        {routines.map((r) => {
          const last = r.lastRunLabel?.();
          return (
            <li key={r.id} className="px-6 py-4">
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text">{r.name}</div>
                  <div className="text-xs text-text-muted/80 mt-0.5">{r.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] tabular-nums text-text-muted/85">{r.cadence}</div>
                  {last && (
                    <div className="text-[10px] tabular-nums text-text-muted/55 mt-0.5">
                      last: {last}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
