'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Layout,
  Zap,
  Sparkles,
  Wrench,
  Plug,
  Code2,
  Brain,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { InspirationData, InspirationIdea } from '@/lib/inspiration-types';

const STORAGE_KEY = 'lifeos-inspiration:operatorai';
const SOURCE = 'operatorai';

type State = {
  picks: Record<string, boolean>;
  notes: Record<string, string>;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

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

const CATEGORY_ICON: Record<string, LucideIcon> = {
  UI: Layout,
  Performance: Zap,
  Feature: Sparkles,
  Refactor: Wrench,
  Integration: Plug,
  DX: Code2,
  AI: Brain,
};

function iconFor(category: string): LucideIcon {
  return CATEGORY_ICON[category] ?? Sparkles;
}

export function InspirationView({ data }: { data: InspirationData }) {
  const [state, setState] = useState<State>(EMPTY);
  const [filter, setFilter] = useState<string>('all');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const hydrated = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const persist = useCallback(
    async (next: State) => {
      const picks = data.ideas.map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        picked: !!next.picks[i.id],
        note: next.notes[i.id] ?? '',
      }));
      const res = await fetch('/api/inspiration/picks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: SOURCE, picks }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      return (await res.json()) as { ok: boolean; file: string; picked: number };
    },
    [data.ideas],
  );

  // Auto-save (debounced) on every state change after hydration.
  useEffect(() => {
    if (!hydrated.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      setSaveState('saving');
      persist(state)
        .then(() => {
          setSaveState('saved');
          setLastSavedAt(new Date().toISOString());
        })
        .catch(() => setSaveState('error'));
    }, 800);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [state, persist]);

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

  const saveNow = async () => {
    setSaveState('saving');
    try {
      await persist(state);
      setSaveState('saved');
      setLastSavedAt(new Date().toISOString());
    } catch {
      setSaveState('error');
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
          <SaveStatus state={saveState} lastSavedAt={lastSavedAt} pickedCount={pickedCount} />
          <Button variant="ghost" size="sm" onClick={selectAllInView} disabled={visible.length === 0}>
            Select all
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear
          </Button>
          <Button size="sm" onClick={saveNow}>
            Save picks
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

function SaveStatus({
  state,
  lastSavedAt,
  pickedCount,
}: {
  state: SaveState;
  lastSavedAt: string | null;
  pickedCount: number;
}) {
  let text: string;
  let tone: string;
  switch (state) {
    case 'saving':
      text = 'Saving…';
      tone = 'text-text-muted';
      break;
    case 'error':
      text = 'Save failed';
      tone = 'text-danger';
      break;
    case 'saved':
      text = lastSavedAt ? `Saved · ${pickedCount} picked` : `${pickedCount} picked`;
      tone = 'text-text-muted';
      break;
    default:
      text = `${pickedCount} picked`;
      tone = 'text-text-muted';
  }
  return <span className={cn('hidden text-xs sm:inline', tone)}>{text}</span>;
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
  const Icon = iconFor(idea.category);
  return (
    <div
      onClick={onToggle}
      className={cn(
        'flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-transparent transition-all',
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

      <div className="flex items-start gap-3 px-4 pb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold leading-snug text-text">{idea.title}</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{idea.description}</p>
        </div>
      </div>

      {/* Mini visual sketch — category-specific, intentionally low-fi */}
      <div className="mx-4 mb-3 rounded-md border border-border/80 bg-bg p-3" onClick={(e) => e.stopPropagation()}>
        <CategorySketch category={idea.category} />
      </div>

      {(idea.lifeai_relevance || idea.rationale) && (
        <div className="px-4 pb-3 text-[12px] leading-relaxed">
          {idea.lifeai_relevance && (
            <p className="text-text/80">
              <span className="text-text-muted">For lifeai: </span>
              {idea.lifeai_relevance}
            </p>
          )}
          {idea.rationale && (
            <p className="mt-1.5 italic text-text-muted/80">{idea.rationale}</p>
          )}
        </div>
      )}

      <div className="mt-auto px-4 pb-4 pt-1" onClick={(e) => e.stopPropagation()}>
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

// Sketches are deliberately abstract — they exist as a visual anchor and
// rough vibe-check, not a spec. One per category, chosen for the kind of
// surface area the category usually changes.
function CategorySketch({ category }: { category: string }) {
  switch (category) {
    case 'UI':
      return (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <span className="h-2 w-12 rounded-full bg-accent/50" />
            <span className="h-2 w-8 rounded-full bg-text-muted/30" />
            <span className="h-2 w-10 rounded-full bg-text-muted/30" />
          </div>
          <div className="flex gap-2">
            <span className="h-6 w-full rounded bg-surface" />
            <span className="h-6 w-12 shrink-0 rounded bg-accent/40" />
          </div>
          <div className="h-2 w-3/4 rounded bg-text-muted/20" />
        </div>
      );
    case 'Performance':
      return (
        <div className="flex h-14 items-end gap-1">
          {[40, 70, 30, 90, 55, 80, 45, 65].map((h, i) => (
            <span
              key={i}
              className={cn('w-3 rounded-sm', i % 2 === 0 ? 'bg-accent/50' : 'bg-text-muted/30')}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      );
    case 'Feature':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-accent/60" />
            <span className="h-2 w-2/3 rounded bg-text-muted/30" />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-text-muted/40" />
            <span className="h-2 w-1/2 rounded bg-text-muted/20" />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-success/60" />
            <span className="h-2 w-3/5 rounded bg-text-muted/30" />
          </div>
        </div>
      );
    case 'Refactor':
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded bg-text-muted/30" />
            <div className="h-1.5 w-4/5 rounded bg-text-muted/20" />
            <div className="h-1.5 w-2/3 rounded bg-text-muted/20" />
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded bg-accent/40" />
            <div className="h-1.5 w-3/4 rounded bg-accent/30" />
          </div>
        </div>
      );
    case 'Integration':
      return (
        <div className="flex items-center justify-between">
          <span className="h-8 w-8 rounded-md bg-surface" />
          <span className="mx-2 h-px flex-1 border-t border-dashed border-text-muted/40" />
          <span className="h-8 w-8 rounded-md bg-accent/30" />
          <span className="mx-2 h-px flex-1 border-t border-dashed border-text-muted/40" />
          <span className="h-8 w-8 rounded-md bg-surface" />
        </div>
      );
    case 'DX':
      return (
        <div className="rounded bg-surface px-2 py-2 font-mono text-[10px] leading-tight text-text-muted">
          <span className="text-accent">$</span> bun dev
          <br />
          <span className="text-success">✓</span> ready in 1.6s
          <br />
          <span className="text-text-muted/60">→</span> http://localhost:4101
        </div>
      );
    case 'AI':
      return (
        <div className="space-y-1.5">
          <div className="ml-auto w-3/4 rounded-md rounded-tr-sm bg-accent/15 px-2 py-1.5">
            <div className="h-1.5 w-full rounded bg-accent/40" />
          </div>
          <div className="w-2/3 rounded-md rounded-tl-sm bg-surface px-2 py-1.5">
            <div className="h-1.5 w-3/4 rounded bg-text-muted/30" />
          </div>
        </div>
      );
    default:
      return (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded bg-text-muted/30" />
          <div className="h-1.5 w-3/4 rounded bg-text-muted/20" />
          <div className="h-1.5 w-1/2 rounded bg-text-muted/20" />
        </div>
      );
  }
}
