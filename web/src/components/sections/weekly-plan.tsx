'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';

export function WeeklyPlan() {
  const weeklyPlanResult = useQuery(api.weeklyPlans.list, { current: true });

  if (weeklyPlanResult === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />
        ))}
      </div>
    );
  }

  // When current: true, the API returns a single plan or null (not an array)
  const weeklyPlan = Array.isArray(weeklyPlanResult)
    ? weeklyPlanResult[0] ?? null
    : weeklyPlanResult;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">Weekly Plan</h2>
        {weeklyPlan && (
          <span className="text-xs font-mono text-text-muted">
            Week of {formatDate(weeklyPlan.weekStart)}
          </span>
        )}
      </div>

      {weeklyPlan ? (
        <div className="p-6 space-y-6">
          {/* Theme */}
          {weeklyPlan.theme && (
            <p className="text-lg font-bold text-text leading-snug">
              &ldquo;{weeklyPlan.theme}&rdquo;
            </p>
          )}

          {/* Goals checklist */}
          {weeklyPlan.goals && weeklyPlan.goals.length > 0 ? (
            <div className="divide-y divide-border">
              {weeklyPlan.goals.map((goal: { title: string; status?: string; goalId?: string }, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 transition-colors hover:bg-surface-hover px-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-muted">
                      [{String(i + 1).padStart(2, '0')}]
                    </span>
                    <span className="text-sm text-text">{goal.title}</span>
                  </div>
                  {goal.status && (
                    <span className="text-xs font-mono text-text-muted">
                      [ {goal.status.replace('_', ' ')} ]
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No goals set.</p>
          )}

          {/* Review score */}
          {weeklyPlan.reviewScore !== null && weeklyPlan.reviewScore !== undefined && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wide">Review Score</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-text">{weeklyPlan.reviewScore}</span>
                <span className="text-sm text-text-muted">/10</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <p className="text-sm text-text-muted">No weekly plan.</p>
          <p className="text-xs text-text-muted mt-1">
            Create a weekly plan via the CLI or API.
          </p>
        </div>
      )}
    </div>
  );
}
