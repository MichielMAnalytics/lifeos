'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { JournalForm } from '../journal-form';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function JournalEditor() {
  const todayStr = todayISO();
  const entry = useQuery(api.journals.getByDate, { date: todayStr });

  // entry is undefined while loading, null if no entry exists
  if (entry === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Journal -- {formatFullDate(todayStr)}
        </span>
        <span className="text-xs text-text-muted">
          {entry ? 'Saved' : 'Empty'}
        </span>
      </div>

      {entry ? (
        <div className="p-6 space-y-6">
          {/* Existing entry display */}
          <div className="space-y-4">
            {entry.mit && (
              <div className="flex items-start gap-4">
                <span className="text-xs font-bold text-text-muted uppercase tracking-widest mt-0.5 w-10 shrink-0">
                  MIT
                </span>
                <span className="text-sm text-text leading-relaxed">{entry.mit}</span>
              </div>
            )}
            {entry.p1 && (
              <div className="flex items-start gap-4">
                <span className="text-xs font-bold text-text-muted uppercase tracking-widest mt-0.5 w-10 shrink-0">
                  P1
                </span>
                <span className="text-sm text-text leading-relaxed">{entry.p1}</span>
              </div>
            )}
            {entry.p2 && (
              <div className="flex items-start gap-4">
                <span className="text-xs font-bold text-text-muted uppercase tracking-widest mt-0.5 w-10 shrink-0">
                  P2
                </span>
                <span className="text-sm text-text leading-relaxed">{entry.p2}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {entry.notes && (
            <div className="border-t border-border pt-4">
              <span className="text-xs font-bold text-text-muted uppercase tracking-widest block mb-2">
                Notes
              </span>
              <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                {entry.notes}
              </p>
            </div>
          )}

          {/* Wins */}
          {entry.wins && entry.wins.length > 0 && (
            <div className="border-t border-border pt-4">
              <span className="text-xs font-bold text-text-muted uppercase tracking-widest block mb-2">
                Wins
              </span>
              <ul className="space-y-1.5">
                {entry.wins.map((win: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-xs text-success mt-0.5 tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-success">{win}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Update form */}
          <div className="border-t border-border pt-4">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest block mb-3">
              Update Entry
            </span>
            <JournalForm />
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          <div className="text-center py-6">
            <p className="text-sm text-text-muted mb-1">No entry for today yet</p>
            <p className="text-xs text-text-muted">Start writing below</p>
          </div>
          <JournalForm />
        </div>
      )}
    </div>
  );
}
