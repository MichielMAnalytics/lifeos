'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { InspirationData, InspirationIdea } from '@/lib/inspiration-types';

const STORAGE_KEY = 'lifeos-inspiration:operatorai';

type State = {
  picks: Record<string, boolean>;
  notes: Record<string, string>;
};

const EMPTY: State = { picks: {}, notes: {} };

function loadState(): State {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return { picks: parsed.picks ?? {}, notes: parsed.notes ?? {} };
  } catch {
    return EMPTY;
  }
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function InspirationView({ data }: { data: InspirationData }) {
  const [state, setState] = useState<State>(EMPTY);
  const [filter, setFilter] = useState<string>('all');
  const hydrated = useRef(false);

  useEffect(() => {
    setState(loadState());
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = ['all'];
    for (const i of data.ideas) {
      if (!seen.has(i.category)) {
        seen.add(i.category);
        list.push(i.category);
      }
    }
    return list;
  }, [data.ideas]);

  const visible = useMemo(
    () => (filter === 'all' ? data.ideas : data.ideas.filter((i) => i.category === filter)),
    [filter, data.ideas],
  );

  const pickedCount = useMemo(
    () => data.ideas.filter((i) => state.picks[i.id]).length,
    [data.ideas, state.picks],
  );

  const togglePick = (id: string) =>
    setState((s) => ({ ...s, picks: { ...s.picks, [id]: !s.picks[id] } }));

  const setNote = (id: string, value: string) =>
    setState((s) => ({ ...s, notes: { ...s.notes, [id]: value } }));

  const selectAllInView = () =>
    setState((s) => {
      const picks = { ...s.picks };
      for (const i of visible) picks[i.id] = true;
      return { ...s, picks };
    });

  const clearAll = () => {
    if (!confirm('Clear all picks and notes?')) return;
    setState(EMPTY);
  };

  const copyPicks = async () => {
    const picked = data.ideas.filter((i) => state.picks[i.id]);
    if (picked.length === 0) return;
    const md = picked
      .map((i) => {
        const note = state.notes[i.id]?.trim();
        return note ? `- **${i.title}** — ${note}` : `- **${i.title}**`;
      })
      .join('\n');
    try {
      await navigator.clipboard.writeText(md);
      alert(`Copied ${picked.length} picks to clipboard.`);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto max-w-6xl py-12 px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Operatorai inspiration</h1>
          <p className="mt-1 text-sm text-text-muted">
            Diff between {data.diff_period.from.slice(0, 7)} and {data.diff_period.to.slice(0, 7)} ·{' '}
            {data.ideas.length} ideas · generated {formatRelative(data.generated_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted hidden sm:inline">{pickedCount} picked</span>
          <Button variant="ghost" size="sm" onClick={selectAllInView} disabled={visible.length === 0}>
            Select all
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear
          </Button>
          <Button variant="secondary" size="sm" onClick={copyPicks} disabled={pickedCount === 0}>
            Copy picks
          </Button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => {
          const count = c === 'all' ? data.ideas.length : data.ideas.filter((i) => i.category === c).length;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] transition-colors',
                filter === c
                  ? 'bg-accent/15 text-accent font-medium'
                  : 'text-text-muted hover:bg-surface-hover',
              )}
            >
              {c === 'all' ? 'All' : c} · {count}
            </button>
          );
        })}
      </div>

      {/* Tile grid */}
      {visible.length === 0 ? (
        <div className="rounded-lg border border-border py-10 text-center text-sm text-text-muted">
          Nothing in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((idea) => (
            <IdeaTile
              key={idea.id}
              idea={idea}
              picked={!!state.picks[idea.id]}
              note={state.notes[idea.id] ?? ''}
              onToggle={() => togglePick(idea.id)}
              onNote={(v) => setNote(idea.id, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IdeaTile({
  idea,
  picked,
  note,
  onToggle,
  onNote,
}: {
  idea: InspirationIdea;
  picked: boolean;
  note: string;
  onToggle: () => void;
  onNote: (v: string) => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        'cursor-pointer overflow-hidden rounded-lg border bg-transparent transition-all',
        picked
          ? 'border-accent ring-2 ring-accent/30'
          : 'border-border hover:border-text-muted/30',
      )}
    >
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-text-muted">
          <span className="rounded bg-surface px-1.5 py-0.5 text-text-muted">{idea.category}</span>
          {idea.source_commits && idea.source_commits.length > 0 && (
            <span className="font-mono normal-case tracking-normal">
              {idea.source_commits.slice(0, 2).join(' · ')}
              {idea.source_commits.length > 2 && ` +${idea.source_commits.length - 2}`}
            </span>
          )}
        </div>
        <input
          type="checkbox"
          checked={picked}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-accent"
        />
      </div>

      <div className="px-4 pb-3">
        <h3 className="text-[14px] font-semibold leading-snug text-text">{idea.title}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{idea.description}</p>
        {idea.lifeai_relevance && (
          <p className="mt-2 text-[12px] leading-relaxed text-text/80">
            <span className="text-text-muted">For lifeai: </span>
            {idea.lifeai_relevance}
          </p>
        )}
        {idea.rationale && (
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-text-muted/80 italic">
            {idea.rationale}
          </p>
        )}
      </div>

      <div className="px-4 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder={picked ? 'looks good but…' : 'skip because…'}
          className={cn(
            'w-full border-b bg-transparent py-1 text-[12px] placeholder:text-text-muted/60 focus:border-accent focus:outline-none',
            picked ? 'border-border text-text' : 'border-border/60 text-text-muted',
          )}
        />
      </div>
    </div>
  );
}
