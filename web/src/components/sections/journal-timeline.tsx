'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { JournalForm } from '@/components/journal-form';
import { SidePeek } from '@/components/side-peek';
import type { Doc } from '@/lib/convex-api';

type JournalEntry = Doc<'journals'>;

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function PriorityItem({
  label,
  text,
  filled,
}: {
  label: string;
  text: string;
  filled: boolean;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      {/* Filled circle for MIT, empty circle for P1/P2 */}
      <span className="mt-1 shrink-0">
        {filled ? (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="4" fill="currentColor" className="text-text" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <circle
              cx="5"
              cy="5"
              r="3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-text-muted"
            />
          </svg>
        )}
      </span>
      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-text-muted w-7">
        {label}
      </span>
      <span className="text-text">{text}</span>
    </div>
  );
}

// ── Journal Detail Modal ────────────────────────────

function JournalDetailModal({
  entry,
  onClose,
}: {
  entry: JournalEntry;
  onClose: () => void;
}) {
  const upsertJournal = useMutation(api.journals.upsert);
  const [notesValue, setNotesValue] = useState(entry.notes ?? '');
  const [saving, setSaving] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  // Sync notes when entry changes
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    setNotesValue(entry.notes ?? '');
  }, [entry._id, entry.notes]);

  const handleSaveNotes = useCallback(async () => {
    if (notesValue === (entry.notes ?? '')) return;
    setSaving(true);
    try {
      await upsertJournal({ date: entry.entryDate, notes: notesValue });
    } catch (err) {
      console.error('Failed to save journal notes:', err);
    } finally {
      setSaving(false);
    }
  }, [notesValue, entry.notes, entry.entryDate, upsertJournal]);

  const dateHeader = formatDateHeader(entry.entryDate);
  const hasWins = entry.wins && entry.wins.length > 0;

  return (
    <SidePeek open={true} onClose={onClose} title="Journal">
      <div className="px-8 py-6">
        {/* Date as title */}
        <h1 className="text-2xl font-bold text-text mb-1">
          {dateHeader}
        </h1>
        <p className="text-xs text-text-muted mb-6">{entry.entryDate}</p>

        {/* Properties section - MIT, P1, P2 */}
        {(entry.mit || entry.p1 || entry.p2) && (
          <div className="space-y-3 mb-8">
            {entry.mit && (
              <div className="flex items-center gap-3 py-1.5 group">
                <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 10 10" className="w-4 h-4 opacity-40">
                    <circle cx="5" cy="5" r="4" fill="currentColor" />
                  </svg>
                  MIT
                </span>
                <span className="text-[13px] text-text flex-1">
                  {entry.mit}
                </span>
              </div>
            )}
            {entry.p1 && (
              <div className="flex items-center gap-3 py-1.5 group">
                <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 10 10" className="w-4 h-4 opacity-40">
                    <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  P1
                </span>
                <span className="text-[13px] text-text flex-1">
                  {entry.p1}
                </span>
              </div>
            )}
            {entry.p2 && (
              <div className="flex items-center gap-3 py-1.5 group">
                <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 10 10" className="w-4 h-4 opacity-40">
                    <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  P2
                </span>
                <span className="text-[13px] text-text flex-1">
                  {entry.p2}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border/40 my-6" />

        {/* Notes - editable */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
              Journal
            </span>
            {saving && (
              <span className="text-[10px] text-text-muted">Saving...</span>
            )}
          </div>
          <textarea
            ref={notesRef}
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Write your thoughts for this day..."
            rows={6}
            className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/40 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Wins */}
        {hasWins && (
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
              Wins
            </span>
            <ul className="mt-3 space-y-2">
              {entry.wins.map((win: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-success"
                  >
                    <polyline points="3 7 6 10 11 4" />
                  </svg>
                  <span className="text-success">{win}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state */}
        {!entry.mit && !entry.p1 && !entry.p2 && !hasWins && !notesValue && (
          <p className="text-sm text-text-muted italic text-center py-4">
            No content for this day yet. Start writing above.
          </p>
        )}
      </div>
    </SidePeek>
  );
}

// ── Entry Card ──────────────────────────────────────

function EntryCard({ entry, onClick }: { entry: JournalEntry; onClick: () => void }) {
  const hasPriorities = entry.mit || entry.p1 || entry.p2;
  const hasNotes = entry.notes && entry.notes.trim().length > 0;
  const hasWins = entry.wins && entry.wins.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="border border-border rounded-lg p-6 transition-colors hover:border-text/30 cursor-pointer"
    >
      {/* Date header */}
      <h3 className="text-lg font-semibold text-text mb-5">
        {formatDateHeader(entry.entryDate)}
      </h3>

      {/* Priorities section */}
      {hasPriorities && (
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            Priorities
          </span>
          <div className="mt-2.5 space-y-2">
            {entry.mit && (
              <PriorityItem label="MIT" text={entry.mit} filled />
            )}
            {entry.p1 && (
              <PriorityItem label="P1" text={entry.p1} filled={false} />
            )}
            {entry.p2 && (
              <PriorityItem label="P2" text={entry.p2} filled={false} />
            )}
          </div>
        </div>
      )}

      {/* Journal / Notes section */}
      {hasNotes && (
        <>
          {hasPriorities && <div className="border-t border-border my-5" />}
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
              Journal
            </span>
            <div className="mt-2.5 text-sm text-text leading-relaxed whitespace-pre-line">
              {entry.notes}
            </div>
          </div>
        </>
      )}

      {/* Wins section */}
      {hasWins && (
        <>
          {(hasPriorities || hasNotes) && (
            <div className="border-t border-border my-5" />
          )}
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
              Wins
            </span>
            <ul className="mt-2.5 space-y-1.5">
              {entry.wins.map((win: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-success"
                  >
                    <polyline points="3 7 6 10 11 4" />
                  </svg>
                  <span className="text-success">{win}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Guard for entirely empty entries */}
      {!hasPriorities && !hasNotes && !hasWins && (
        <p className="text-sm text-text-muted italic">No content for this day.</p>
      )}
    </div>
  );
}

export function JournalTimeline() {
  const entries = useQuery(api.journals.list, {});
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  if (!entries) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="max-w-none space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Journal
        </h1>
        <JournalForm />
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="space-y-4">
          {/* Ghost journal entry */}
          <div className="border border-dashed border-border/50 rounded-xl p-6 opacity-40">
            <h3 className="text-lg font-semibold text-text-muted mb-5">Today</h3>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
                Priorities
              </span>
              <div className="mt-2.5 space-y-2">
                <div className="flex items-start gap-3 text-sm">
                  <span className="mt-1 shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <circle cx="5" cy="5" r="4" fill="currentColor" className="text-text-muted" />
                    </svg>
                  </span>
                  <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-text-muted w-7">MIT</span>
                  <span className="text-text-muted italic">Your most important task</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="mt-1 shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-muted" />
                    </svg>
                  </span>
                  <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-text-muted w-7">P1</span>
                  <span className="text-text-muted italic">Second priority for the day</span>
                </div>
              </div>
            </div>
            <div className="border-t border-border/50 my-5" />
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
                Journal
              </span>
              <div className="mt-2.5 text-sm text-text-muted italic leading-relaxed">
                How was your day? What did you learn?
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-text-muted/70">
            Start your first journal entry
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <EntryCard
              key={entry._id}
              entry={entry}
              onClick={() => setSelectedEntry(entry)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedEntry && (
        <JournalDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
