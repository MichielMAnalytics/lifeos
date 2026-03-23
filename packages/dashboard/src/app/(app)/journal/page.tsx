import { api } from '@/lib/api';
import { JournalForm } from '@/components/journal-form';
import type { Journal, ApiListResponse } from '@lifeos/shared';

function formatEntryDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default async function JournalPage() {
  const res = await api.get<ApiListResponse<Journal>>('/api/v1/journal');
  const entries = res.data;

  return (
    <div className="max-w-none space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-text">
          Journal <span className="text-text-muted font-normal">[ {res.count} ]</span>
        </h1>
        <JournalForm />
      </div>

      {/* Entries timeline */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-text">No entries yet</p>
          <p className="text-sm text-text-muted mt-1">Start writing to track your days.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {entries.map((entry, idx) => (
            <div key={entry.id} className="relative">
              {/* Date marker */}
              <div className="flex items-center gap-4 py-4">
                <span className="text-2xl font-bold text-text">
                  {formatShortDate(entry.entry_date)}
                </span>
                <span className="text-sm text-text-muted">
                  {formatDay(entry.entry_date)}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-mono text-text-muted">
                  [{String(idx + 1).padStart(2, '0')}]
                </span>
              </div>

              {/* Entry card */}
              <div className="border border-border p-6 mb-6 space-y-4">
                {/* MIT / P1 / P2 as inline text */}
                {(entry.mit || entry.p1 || entry.p2) && (
                  <div className="space-y-2">
                    {entry.mit && (
                      <div className="flex items-start gap-3 text-sm">
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wide mt-0.5 w-8 shrink-0">MIT</span>
                        <span className="text-text">{entry.mit}</span>
                      </div>
                    )}
                    {entry.p1 && (
                      <div className="flex items-start gap-3 text-sm">
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wide mt-0.5 w-8 shrink-0">P1</span>
                        <span className="text-text">{entry.p1}</span>
                      </div>
                    )}
                    {entry.p2 && (
                      <div className="flex items-start gap-3 text-sm">
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wide mt-0.5 w-8 shrink-0">P2</span>
                        <span className="text-text">{entry.p2}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes preview */}
                {entry.notes && (
                  <div className="border-t border-border pt-4">
                    <p className="text-sm text-text-muted leading-relaxed line-clamp-3">
                      {entry.notes}
                    </p>
                  </div>
                )}

                {/* Wins */}
                {entry.wins.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wide">Wins</span>
                    <ul className="mt-2 space-y-1.5">
                      {entry.wins.map((win, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <span className="text-xs font-mono text-success mt-0.5">
                            [{String(i + 1).padStart(2, '0')}]
                          </span>
                          <span className="text-success">{win}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
