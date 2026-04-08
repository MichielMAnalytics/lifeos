'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { JournalForm } from '@/components/journal-form';
import { SidePeek } from '@/components/side-peek';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { Doc } from '@/lib/convex-api';

type JournalEntry = Doc<'journals'>;

// ── Week strip helpers (Section 7I) ─────────────────

function startOfWeek(d: Date): Date {
  // Monday-based week start
  const result = new Date(d);
  const day = result.getDay();
  const diff = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dateToISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return dateToISO(new Date());
}

function shiftDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

interface WeekDay {
  date: string;
  weekday: string;
  dayNum: string;
  isToday: boolean;
  hasEntry: boolean;
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function getWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

function getDayNum(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return String(d.getDate());
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  // Find the Monday of this week
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  return `WEEK OF ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`;
}

/** Group entries by week (Monday-based) */
function groupByWeek(entries: JournalEntry[]): { weekLabel: string; entries: JournalEntry[] }[] {
  const groups: Map<string, JournalEntry[]> = new Map();
  for (const entry of entries) {
    const label = getWeekLabel(entry.entryDate);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(entry);
  }
  return Array.from(groups.entries()).map(([weekLabel, entries]) => ({
    weekLabel,
    entries,
  }));
}

/** Render notes text as readable paragraphs, splitting on sentence boundaries for long text */
function NotesText({ text }: { text: string }) {
  // Split on double newlines first, then render each as a paragraph
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);

  if (paragraphs.length > 1) {
    return (
      <div className="space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-text leading-relaxed">
            {p.trim()}
          </p>
        ))}
      </div>
    );
  }

  // Single block of text — split into ~2-3 sentence paragraphs for readability
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length <= 3) {
    return (
      <p className="text-sm text-text leading-relaxed">
        {text}
      </p>
    );
  }

  const chunks: string[] = [];
  let current: string[] = [];
  for (const s of sentences) {
    current.push(s);
    if (current.length >= 3) {
      chunks.push(current.join(' '));
      current = [];
    }
  }
  if (current.length > 0) {
    chunks.push(current.join(' '));
  }

  return (
    <div className="space-y-4">
      {chunks.map((chunk, i) => (
        <p key={i} className="text-sm text-text leading-relaxed">
          {chunk}
        </p>
      ))}
    </div>
  );
}

// ── Inline Win Adder ────────────────────────────────

function WinAdder({ entryDate, existingWins }: { entryDate: string; existingWins: string[] }) {
  const upsertJournal = useMutation(api.journals.upsert);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    await upsertJournal({
      date: entryDate,
      wins: [...existingWins, value.trim()],
    });
    setValue('');
    setAdding(false);
  }

  if (adding) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
        <span className="text-accent/60 shrink-0">+</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => { if (!value.trim()) setAdding(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setAdding(false); }}
          placeholder="What went well?"
          className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted/70 focus:outline-none"
        />
      </form>
    );
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="flex items-center gap-2 mt-2 text-sm text-text-muted/80 hover:text-accent/70 transition-colors"
    >
      <span>+</span>
      <span>Add win</span>
    </button>
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
        <h1 className="text-2xl font-bold text-text mb-1">{dateHeader}</h1>
        <p className="text-xs text-text-muted mb-6">{entry.entryDate}</p>

        {(entry.mit || entry.p1 || entry.p2) && (
          <div className="space-y-3 mb-8">
            {entry.mit && (
              <div className="flex items-center gap-3 py-1.5">
                <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 10 10" className="w-4 h-4 opacity-40">
                    <circle cx="5" cy="5" r="4" fill="currentColor" />
                  </svg>
                  MIT
                </span>
                <span className="text-[13px] text-text flex-1">{entry.mit}</span>
              </div>
            )}
            {entry.p1 && (
              <div className="flex items-center gap-3 py-1.5">
                <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 10 10" className="w-4 h-4 opacity-40">
                    <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  P1
                </span>
                <span className="text-[13px] text-text flex-1">{entry.p1}</span>
              </div>
            )}
            {entry.p2 && (
              <div className="flex items-center gap-3 py-1.5">
                <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 10 10" className="w-4 h-4 opacity-40">
                    <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  P2
                </span>
                <span className="text-[13px] text-text flex-1">{entry.p2}</span>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border/40 my-6" />

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
              Journal
            </span>
            {saving && <span className="text-[10px] text-text-muted">Saving...</span>}
          </div>
          <textarea
            ref={notesRef}
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Write your thoughts for this day..."
            rows={6}
            className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/70 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Wins */}
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
            Wins
          </span>
          {hasWins && (
            <ul className="mt-3 space-y-2">
              {entry.wins.map((win: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-accent/60 shrink-0 mt-px">+</span>
                  <span className="text-text-muted">{win}</span>
                </li>
              ))}
            </ul>
          )}
          <WinAdder entryDate={entry.entryDate} existingWins={entry.wins} />
        </div>

        {!entry.mit && !entry.p1 && !entry.p2 && !hasWins && !notesValue && (
          <p className="text-sm text-text-muted italic text-center py-4">
            No content for this day yet. Start writing above.
          </p>
        )}
      </div>
    </SidePeek>
  );
}

// ── Entry Card (new cleaner format) ─────────────────

function EntryCard({ entry, extraWins, onClick }: { entry: JournalEntry; extraWins?: string[]; onClick: () => void }) {
  const hasNotes = entry.notes && entry.notes.trim().length > 0;
  // Merge journal wins + wins table, deduplicated
  const allWins = [...new Set([...(entry.wins ?? []), ...(extraWins ?? [])])];
  const hasWins = allWins.length > 0;
  const hasPriorities = entry.mit || entry.p1 || entry.p2;
  // Section 7I — gratitudes from new schema field
  const gratitudes = (entry as JournalEntry & { gratitudes?: string[] }).gratitudes ?? [];
  const hasGratitudes = gratitudes.length > 0;
  // Section 7I — explicit summary from new schema field, falls back to auto-gen
  const explicitSummary = (entry as JournalEntry & { summary?: string }).summary;
  const hasContent = hasPriorities || hasNotes || hasWins || hasGratitudes || !!explicitSummary;

  return (
    <div id={`journal-entry-${entry.entryDate}`} className="flex gap-6 group">
      {/* Left: day + date */}
      <div className="w-12 shrink-0 pt-1 text-center">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted/80">
          {getWeekday(entry.entryDate)}
        </p>
        <p className="text-xl font-bold text-text leading-tight">
          {getDayNum(entry.entryDate)}
        </p>
        {hasContent && (
          <div className="w-1.5 h-1.5 rounded-full bg-success mx-auto mt-1.5" />
        )}
      </div>

      {/* Right: entry content */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
        }}
        className="flex-1 border border-border rounded-xl p-6 transition-colors hover:border-text/20 cursor-pointer min-w-0"
      >
        {/* Section 7I — clean date — summary header */}
        {hasContent && (
          <p className="text-sm text-text-muted mb-4">
            <strong className="font-bold text-text">{formatDateHeader(entry.entryDate)}</strong>
            <span className="text-text-muted/80"> — </span>
            <span className="italic">
              {explicitSummary
                ? explicitSummary
                : entry.mit
                  ? `Focused on ${entry.mit.toLowerCase()}${entry.p1 ? ` and ${entry.p1.toLowerCase()}` : ''}${hasWins ? ` — ${allWins.length} win${allWins.length !== 1 ? 's' : ''}` : ''}.`
                  : hasNotes
                    ? (entry.notes!.split(/[.!?]/)[0].length > 80 ? entry.notes!.split(/[.!?]/)[0].slice(0, 77) + '...' : entry.notes!.split(/[.!?]/)[0] + '.')
                    : hasWins
                      ? `${entry.wins.length} win${entry.wins.length !== 1 ? 's' : ''} logged.`
                      : ''}
            </span>
          </p>
        )}

        {/* Notes as readable paragraphs */}
        {hasNotes && (
          <NotesText text={entry.notes!} />
        )}

        {/* MIT / P1 / P2 horizontal row */}
        {hasPriorities && (
          <>
            {hasNotes && <div className="border-t border-border/40 my-5" />}
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              {entry.mit && (
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted/80 mb-0.5">MIT</p>
                  <p className="text-sm font-semibold text-text truncate">{entry.mit}</p>
                </div>
              )}
              {entry.p1 && (
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted/80 mb-0.5">P1</p>
                  <p className="text-sm text-text truncate">{entry.p1}</p>
                </div>
              )}
              {entry.p2 && (
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted/80 mb-0.5">P2</p>
                  <p className="text-sm text-text truncate">{entry.p2}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Wins */}
        {hasWins && (
          <>
            {(hasPriorities || hasNotes) && <div className="border-t border-border/40 my-5" />}
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-success/80 mb-2">
                Wins
              </p>
              <ul className="space-y-1.5">
                {allWins.map((win: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-success shrink-0 mt-px">&#10003;</span>
                    <span className="text-text">{win}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Section 7I — gratitudes block */}
        {hasGratitudes && (
          <>
            {(hasPriorities || hasNotes || hasWins) && <div className="border-t border-border/40 my-5" />}
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-accent/80 mb-2">
                Gratitudes
              </p>
              <ul className="space-y-1.5">
                {gratitudes.map((g: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-accent shrink-0 mt-px">&#9826;</span>
                    <span className="text-text">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {!hasContent && (
          <p className="text-sm text-text-muted/80 italic">No content for this day.</p>
        )}
      </div>
    </div>
  );
}

// ── WeekStrip / MonthGrid (Section 7I) ──────────────
// Section 7I asked for a week strip plus a monthly view toggle. Both render
// from the same set of entryDates, with click-to-jump.

type CalendarMode = 'week' | 'month';

function CalendarStrip({
  mode,
  setMode,
  weekStart,
  monthDate,
  entryDates,
  onShiftWeek,
  onShiftMonth,
  onJumpToDate,
}: {
  mode: CalendarMode;
  setMode: (m: CalendarMode) => void;
  weekStart: Date;
  monthDate: Date;
  entryDates: Set<string>;
  onShiftWeek: (delta: number) => void;
  onShiftMonth: (delta: number) => void;
  onJumpToDate: (date: string) => void;
}) {
  const today = todayISO();

  // Build the cells for the current mode
  const headerLabel =
    mode === 'week'
      ? weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Week-mode: 7 day cells
  const weekDays: WeekDay[] = [];
  if (mode === 'week') {
    for (let i = 0; i < 7; i++) {
      const d = shiftDays(weekStart, i);
      const date = dateToISO(d);
      weekDays.push({
        date,
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
        dayNum: String(d.getDate()),
        isToday: date === today,
        hasEntry: entryDates.has(date),
      });
    }
  }

  // Month-mode: build a 6×7 grid starting from the Monday of the week
  // containing the 1st of the month, padding with previous/next month days.
  interface MonthCell {
    date: string;
    dayNum: string;
    isToday: boolean;
    hasEntry: boolean;
    inMonth: boolean;
  }
  const monthCells: MonthCell[] = [];
  if (mode === 'month') {
    const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const gridStart = startOfWeek(firstOfMonth);
    for (let i = 0; i < 42; i++) {
      const d = shiftDays(gridStart, i);
      const date = dateToISO(d);
      monthCells.push({
        date,
        dayNum: String(d.getDate()),
        isToday: date === today,
        hasEntry: entryDates.has(date),
        inMonth: d.getMonth() === monthDate.getMonth(),
      });
    }
  }

  const handlePrev = () => (mode === 'week' ? onShiftWeek(-7) : onShiftMonth(-1));
  const handleNext = () => (mode === 'week' ? onShiftWeek(7) : onShiftMonth(1));

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-bg-subtle">
      {/* Header — month label, nav arrows, mode toggle */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border gap-3">
        <button
          type="button"
          onClick={handlePrev}
          className="p-1 rounded text-text-muted hover:text-text hover:bg-surface transition-colors"
          aria-label={mode === 'week' ? 'Previous week' : 'Previous month'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-text uppercase tracking-wider flex-1 text-center">
          {headerLabel}
        </span>
        <button
          type="button"
          onClick={handleNext}
          className="p-1 rounded text-text-muted hover:text-text hover:bg-surface transition-colors"
          aria-label={mode === 'week' ? 'Next week' : 'Next month'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        {/* Mode toggle pill */}
        <div className="inline-flex items-center bg-bg border border-border rounded-full p-0.5 text-[10px] font-medium ml-1">
          <button
            type="button"
            onClick={() => setMode('week')}
            className={cn(
              'px-2.5 py-0.5 rounded-full transition-colors',
              mode === 'week' ? 'bg-surface text-text' : 'text-text-muted hover:text-text',
            )}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setMode('month')}
            className={cn(
              'px-2.5 py-0.5 rounded-full transition-colors',
              mode === 'month' ? 'bg-surface text-text' : 'text-text-muted hover:text-text',
            )}
          >
            Month
          </button>
        </div>
      </div>

      {mode === 'week' ? (
        <div className="grid grid-cols-7 gap-1 p-2">
          {weekDays.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => onJumpToDate(d.date)}
              className={cn(
                'flex flex-col items-center py-2 rounded-lg transition-colors',
                d.isToday
                  ? 'bg-accent text-white'
                  : d.hasEntry
                    ? 'bg-surface text-text hover:bg-surface-hover'
                    : 'text-text-muted hover:bg-surface',
              )}
            >
              <span className="text-[9px] uppercase tracking-wider opacity-70">{d.weekday}</span>
              <span className="text-base font-semibold tabular-nums leading-tight">{d.dayNum}</span>
              {d.hasEntry && !d.isToday && (
                <span className="mt-1 inline-block h-1 w-1 rounded-full bg-success" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="p-2">
          {/* Weekday header row */}
          <div className="grid grid-cols-7 gap-1 mb-1 px-1 text-[9px] uppercase tracking-wider text-text-muted/60 text-center">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>
          {/* 6×7 day grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((c) => (
              <button
                key={c.date}
                type="button"
                onClick={() => onJumpToDate(c.date)}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center rounded-md transition-colors text-xs',
                  !c.inMonth && 'opacity-30',
                  c.isToday
                    ? 'bg-accent text-white'
                    : c.hasEntry
                      ? 'bg-surface text-text hover:bg-surface-hover'
                      : 'text-text-muted hover:bg-surface',
                )}
              >
                <span className="font-semibold tabular-nums leading-none">{c.dayNum}</span>
                {c.hasEntry && !c.isToday && (
                  <span className="mt-0.5 inline-block h-1 w-1 rounded-full bg-success" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────

export function JournalTimeline() {
  const entries = useQuery(api.journals.list, {});
  const allWins = useQuery(api.wins.list, {});
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  // Section 7I — calendar strip state
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week');
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [monthDate, setMonthDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Build a map of date → wins from the wins table
  const winsMap = new Map<string, string[]>();
  if (allWins) {
    for (const w of allWins) {
      const date = w.entryDate;
      if (!winsMap.has(date)) winsMap.set(date, []);
      winsMap.get(date)!.push(w.content);
    }
  }

  // Set of dates that have a journal entry — used by the week strip dots
  const entryDates = useMemo(() => {
    const set = new Set<string>();
    if (entries) for (const e of entries) set.add(e.entryDate);
    return set;
  }, [entries]);

  const handleJumpToDate = useCallback((date: string) => {
    if (!entries) return;
    const found = entries.find((e) => e.entryDate === date);
    if (found) {
      // Scroll to the entry's card if it's in the rendered list
      const el = document.getElementById(`journal-entry-${date}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setSelectedEntry(found);
    }
  }, [entries]);

  if (!entries) return (
    // Section 18J — week strip + 3 entry-card placeholders
    <div className="space-y-6">
      <Skeleton className="h-20 w-full rounded-xl" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-6">
          <div className="w-12 shrink-0 space-y-1 text-center">
            <Skeleton className="h-2 w-8 mx-auto" />
            <Skeleton className="h-5 w-6 mx-auto" />
          </div>
          <div className="flex-1 border border-border rounded-xl p-6 space-y-3">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );

  const weeks = groupByWeek(entries);

  return (
    <div className="max-w-none space-y-8">
      {/* Section 7I — calendar strip with week ↔ month toggle */}
      <CalendarStrip
        mode={calendarMode}
        setMode={setCalendarMode}
        weekStart={weekStart}
        monthDate={monthDate}
        entryDates={entryDates}
        onShiftWeek={(delta) => setWeekStart((prev) => shiftDays(prev, delta))}
        onShiftMonth={(delta) => {
          setMonthDate((prev) => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + delta);
            return next;
          });
        }}
        onJumpToDate={handleJumpToDate}
      />

      {entries.length === 0 ? (
        <div className="space-y-4">
          <div className="border border-dashed border-border/50 rounded-xl p-6 opacity-40">
            <h3 className="text-lg font-semibold text-text-muted mb-5">Today</h3>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
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
              </div>
            </div>
            <div className="border-t border-border/50 my-5" />
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
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
        <div className="space-y-10">
          {weeks.map(({ weekLabel, entries: weekEntries }) => (
            <div key={weekLabel}>
              {/* Week header */}
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted/70 mb-5 ml-[72px]">
                {weekLabel}
              </p>
              <div className="space-y-4">
                {weekEntries.map((entry) => (
                  <EntryCard
                    key={entry._id}
                    entry={entry}
                    extraWins={winsMap.get(entry.entryDate)}
                    onClick={() => setSelectedEntry(entry)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedEntry && (
        <JournalDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
