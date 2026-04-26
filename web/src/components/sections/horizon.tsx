'use client';

// Horizon — vertical cascade of long-horizon → short-horizon commitments.
// Year header → active quarterly goals → this week's priorities.
//
// Design: editorial hierarchy. Each level indents under the parent via a
// 1px vertical stem. Typography scales up as you descend (yearly = whisper,
// weekly = primary). Mono numerals on dates and priority bullets.

import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc } from '@/lib/convex-api';

// ── Date helpers ─────────────────────────────────────

function currentYear(): number {
  return new Date().getFullYear();
}

function currentQuarter(): { key: string; label: string; range: string; index: 1 | 2 | 3 | 4 } {
  const now = new Date();
  const idx = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  const ranges: Record<number, string> = {
    1: 'Jan — Mar',
    2: 'Apr — Jun',
    3: 'Jul — Sep',
    4: 'Oct — Dec',
  };
  return {
    key: `${now.getFullYear()}-Q${idx}`,
    label: `Q${idx}`,
    range: ranges[idx],
    index: idx,
  };
}

function dayOfWeek(): { day: number; total: 7 } {
  const now = new Date();
  const day = now.getDay();
  return { day: day === 0 ? 7 : day, total: 7 };
}

// ── Sub-components ───────────────────────────────────

function Stem({ tone = 'muted' }: { tone?: 'muted' | 'accent' }) {
  return (
    <div
      aria-hidden
      className={
        tone === 'accent'
          ? 'absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-accent/0 via-accent/40 to-accent/0'
          : 'absolute left-0 top-0 bottom-0 w-px bg-border'
      }
    />
  );
}

interface NextWeekPriorities {
  p1?: string;
  p2?: string;
  p3?: string;
}

// ── Main ─────────────────────────────────────────────

export function Horizon() {
  const goals = useQuery(api.goals.list, { status: 'active' });
  const latestReview = useQuery(api.reviews.latestOfType, { reviewType: 'weekly' });
  const year = currentYear();
  const q = currentQuarter();
  const dow = dayOfWeek();

  // Active goals tagged to the current quarter. Hide the cascade level if empty.
  const quarterGoals: Doc<'goals'>[] = useMemo(() => {
    if (!goals) return [];
    return goals.filter((g) => g.quarter === q.key);
  }, [goals, q.key]);

  // Three weekly priorities, taken from the most recent weekly review.
  const priorities = useMemo(() => {
    if (!latestReview) return [];
    const content = (latestReview.content ?? null) as
      | { nextWeekPriorities?: NextWeekPriorities }
      | null;
    const np = content?.nextWeekPriorities;
    if (!np) return [];
    return [np.p1, np.p2, np.p3]
      .map((s, i) => ({ rank: i + 1, text: s?.trim() ?? '' }))
      .filter((p) => p.text.length > 0);
  }, [latestReview]);

  const isLoading = goals === undefined || latestReview === undefined;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 animate-pulse">
        <div className="h-3 w-24 bg-bg-subtle rounded mb-6" />
        <div className="h-4 w-40 bg-bg-subtle rounded mb-3" />
        <div className="h-4 w-56 bg-bg-subtle rounded mb-6" />
        <div className="h-6 w-72 bg-bg-subtle rounded" />
      </div>
    );
  }

  const hasContent = quarterGoals.length > 0 || priorities.length > 0;
  if (!hasContent) {
    // Nothing to cascade yet — render a one-line nudge instead of an empty card.
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-surface/40 px-6 py-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted/80">
            Horizon · {year}
          </h3>
          <span className="text-[10px] tabular-nums text-text-muted/60">{q.label} · {q.range}</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Set a {q.label} goal or run <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg-subtle text-text/80">/weekly-review</span> to start the cascade.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Year header */}
      <div className="px-6 pt-5 pb-4 flex items-baseline justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted/80">
          Horizon
        </h3>
        <span className="font-light text-text/85 tabular-nums text-[28px] leading-none">
          {year}
        </span>
      </div>

      <div className="px-6 pb-6">
        {/* Level 2 — Quarter */}
        {quarterGoals.length > 0 && (
          <div className="relative pl-6">
            <Stem />
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {q.label}
              </span>
              <span className="text-[10px] tabular-nums text-text-muted/60">{q.range}</span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {quarterGoals.map((g) => (
                <li key={g._id} className="flex items-baseline gap-2 text-sm text-text/85">
                  <span aria-hidden className="text-text-muted/40">·</span>
                  <span className="leading-snug">{g.title}</span>
                </li>
              ))}
            </ul>

            {/* Level 3 — This week */}
            {priorities.length > 0 && (
              <div className="relative mt-6 pl-6">
                <Stem tone="accent" />
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent/85">
                      This week
                    </span>
                    <span className="text-[10px] tabular-nums text-text-muted/60">
                      Day {dow.day} of {dow.total}
                    </span>
                  </div>
                </div>
                <ol className="mt-3 space-y-3">
                  {priorities.map((p) => (
                    <li key={p.rank} className="flex items-start gap-4">
                      <span className="font-light text-[28px] leading-none tabular-nums text-text/30 w-7 shrink-0">
                        {p.rank}
                      </span>
                      <span className="pt-1.5 text-[15px] leading-snug font-medium text-text">
                        {p.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* No-quarter case — still surface this-week priorities at the top level */}
        {quarterGoals.length === 0 && priorities.length > 0 && (
          <div className="relative pl-6">
            <Stem tone="accent" />
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent/85">
                This week
              </span>
              <span className="text-[10px] tabular-nums text-text-muted/60">
                Day {dow.day} of {dow.total}
              </span>
            </div>
            <ol className="mt-3 space-y-3">
              {priorities.map((p) => (
                <li key={p.rank} className="flex items-start gap-4">
                  <span className="font-light text-[28px] leading-none tabular-nums text-text/30 w-7 shrink-0">
                    {p.rank}
                  </span>
                  <span className="pt-1.5 text-[15px] leading-snug font-medium text-text">
                    {p.text}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
