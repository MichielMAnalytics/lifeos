'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import Link from 'next/link';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function JournalEntry({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-bold text-text-muted uppercase tracking-wide mt-0.5 w-8 shrink-0">
        {label}
      </span>
      <span className="text-text/80 leading-relaxed">{value}</span>
    </div>
  );
}

export function JournalToday() {
  const todayStr = todayISO();
  const journal = useQuery(api.journals.getByDate, { date: todayStr });

  if (journal === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Journal
        </h2>
        {journal && (
          <Link
            href={`/journal/${todayStr}`}
            className="text-xs text-text-muted hover:text-text transition-colors"
          >
            Open
          </Link>
        )}
      </div>
      {journal ? (
        <div className="p-6 space-y-4 text-sm">
          {/* MIT / P1 / P2 entries */}
          {(journal.mit || journal.p1 || journal.p2) && (
            <div className="space-y-3">
              {journal.mit && (
                <JournalEntry label="MIT" value={journal.mit} />
              )}
              {journal.p1 && (
                <JournalEntry label="P1" value={journal.p1} />
              )}
              {journal.p2 && (
                <JournalEntry label="P2" value={journal.p2} />
              )}
            </div>
          )}

          {/* Notes */}
          {journal.notes && (
            <div className="border-t border-border pt-4">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Notes</span>
              <p className="text-text/80 leading-relaxed line-clamp-4 mt-2">
                {journal.notes}
              </p>
            </div>
          )}

          {/* Wins */}
          {journal.wins && journal.wins.length > 0 && (
            <div className="border-t border-border pt-4">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Wins</span>
              <ul className="space-y-2 mt-2">
                {journal.wins.map((win: string, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-success/80"
                  >
                    <span className="text-xs font-mono text-text-muted mt-0.5">
                      [{String(i + 1).padStart(2, '0')}]
                    </span>
                    {win}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No journal entry yet</p>
          <Link
            href={`/journal/${todayStr}`}
            className="mt-3 text-xs text-text-muted hover:text-text transition-colors border border-border px-4 py-2"
          >
            Start writing
          </Link>
        </div>
      )}
    </div>
  );
}
