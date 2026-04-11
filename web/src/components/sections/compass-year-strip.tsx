'use client';

import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getCurrentQuarter(): string {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
}

const QUARTER_RANGES: Record<string, string> = {
  Q1: 'Jan – Mar',
  Q2: 'Apr – Jun',
  Q3: 'Jul – Sep',
  Q4: 'Oct – Dec',
};

export function CompassYearStrip() {
  const allGoals = useQuery(api.goals.list, {});
  const year = getCurrentYear();
  const currentQuarter = getCurrentQuarter();

  const byQuarter = useMemo(() => {
    const map: Record<string, { active: number; done: number; goals: { title: string; status: string }[] }> = {
      Q1: { active: 0, done: 0, goals: [] },
      Q2: { active: 0, done: 0, goals: [] },
      Q3: { active: 0, done: 0, goals: [] },
      Q4: { active: 0, done: 0, goals: [] },
    };
    if (!allGoals) return map;
    for (const goal of allGoals) {
      if (!goal.quarter) continue;
      const m = goal.quarter.match(/^(\d{4})-(Q[1-4])$/);
      if (!m) continue;
      if (Number(m[1]) !== year) continue;
      const slot = map[m[2]];
      if (!slot) continue;
      slot.goals.push({ title: goal.title, status: goal.status });
      if (goal.status === 'active') slot.active += 1;
      if (goal.status === 'completed') slot.done += 1;
    }
    return map;
  }, [allGoals, year]);

  if (allGoals === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[180px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
          Year compass · {year}
        </h2>
        <span className="text-[11px] text-text-muted">
          You are in <strong className="text-text">{currentQuarter}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => {
          const slot = byQuarter[q];
          const isCurrent = currentQuarter === `${year}-${q}`;
          const total = slot.goals.length;
          return (
            <div
              key={q}
              className={cn(
                'rounded-xl border p-4 min-h-[180px] flex flex-col',
                isCurrent
                  ? 'border-accent/50 bg-accent/5'
                  : 'border-border bg-surface',
              )}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[18px] font-extrabold tracking-tight">{q}</span>
                {isCurrent && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent">Active</span>
                )}
              </div>
              <div className="text-[10px] text-text-muted uppercase tracking-[0.08em] mt-0.5">
                {QUARTER_RANGES[q]}
              </div>

              <div className="mt-3 flex-1 space-y-1.5">
                {total === 0 ? (
                  <p className="text-[11px] text-text-muted/70 italic">No goals set</p>
                ) : (
                  slot.goals.slice(0, 4).map((g, i) => (
                    <div
                      key={i}
                      className={cn(
                        'text-[12px] leading-snug truncate',
                        g.status === 'completed' && 'line-through text-text-muted',
                      )}
                    >
                      {g.status === 'completed' ? '✓ ' : '· '}
                      {g.title}
                    </div>
                  ))
                )}
                {total > 4 && (
                  <div className="text-[10px] text-text-muted/60">+{total - 4} more</div>
                )}
              </div>

              {total > 0 && (
                <div className="text-[10px] text-text-muted mt-3 pt-3 border-t border-border-subtle tabular-nums">
                  {slot.done}/{total} done
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
