'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import Link from 'next/link';

export function WeeklyTheme() {
  const weeklyPlan = useQuery(api.weeklyPlans.list, { current: true });

  if (weeklyPlan === undefined) {
    return <div className="animate-pulse h-32 bg-surface rounded-lg" />;
  }

  // When current: true, the query returns a single plan or null (not an array).
  // TypeScript infers a union with the array branch, so narrow it here.
  const plan = Array.isArray(weeklyPlan) ? weeklyPlan[0] ?? null : weeklyPlan;

  return (
    <div className="border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
          Weekly Theme
        </h2>
        <Link
          href="/weekly"
          className="text-xs text-text-muted hover:text-text transition-colors"
        >
          Plan
        </Link>
      </div>
      {plan ? (
        <div className="p-6 space-y-4">
          {/* Theme */}
          {plan.theme ? (
            <p className="text-lg font-semibold text-text leading-snug">
              {plan.theme}
            </p>
          ) : (
            <p className="text-sm text-text-muted italic">No theme set for this week</p>
          )}

          {/* Weekly goals */}
          {plan.goals && plan.goals.length > 0 && (
            <div className="border-t border-border pt-4">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Goals
              </span>
              <ul className="space-y-2 mt-3">
                {plan.goals.map((goal: { title: string; status?: string }, i: number) => {
                  const isDone = goal.status === 'done' || goal.status === 'completed';
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-3"
                    >
                      <span className="text-xs text-text-muted w-6 shrink-0 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {isDone ? (
                        <svg
                          width={14}
                          height={14}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-success shrink-0"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-text-muted/40" />
                      )}
                      <span className={`text-sm ${isDone ? 'text-text-muted line-through' : 'text-text'}`}>
                        {goal.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No weekly plan yet</p>
          <Link
            href="/weekly"
            className="mt-3 text-xs text-text-muted hover:text-text transition-colors border border-border px-4 py-2 rounded-lg"
          >
            Create plan
          </Link>
        </div>
      )}
    </div>
  );
}
