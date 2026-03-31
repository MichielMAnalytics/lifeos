'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatWeekday(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
  });
}

export function JournalList() {
  const entries = useQuery(api.journals.list, {});

  if (entries === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
          Journal Entries
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No journal entries</p>
          <p className="text-xs text-text-muted/60 mt-1">Start writing to see your entries here</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((entry) => (
            <div
              key={entry._id}
              className="flex items-center gap-4 px-6 py-4"
            >
              {/* Date */}
              <div className="shrink-0 w-20">
                <span className="text-xs text-text-muted">
                  {formatShortDate(entry.entryDate)}
                </span>
                <span className="text-xs text-text-muted/60 ml-1">
                  {formatWeekday(entry.entryDate)}
                </span>
              </div>

              {/* MIT summary */}
              <span className="flex-1 text-sm text-text truncate">
                {entry.mit || entry.p1 || entry.notes?.slice(0, 80) || 'Empty entry'}
              </span>

              {/* Indicators */}
              <div className="flex items-center gap-2 shrink-0">
                {entry.mit && (
                  <span className="text-xs text-text-muted border border-border px-1.5 py-0.5 rounded">
                    MIT
                  </span>
                )}
                {entry.wins && entry.wins.length > 0 && (
                  <span className="text-xs text-success border border-success/30 px-1.5 py-0.5 rounded tabular-nums">
                    {entry.wins.length}W
                  </span>
                )}
                {entry.notes && (
                  <span className="text-xs text-text-muted/60 border border-border/60 px-1.5 py-0.5 rounded">
                    N
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
