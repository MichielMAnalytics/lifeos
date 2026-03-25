'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import Link from 'next/link';
import type { Id } from '@/lib/convex-api';

function GoalBar({ goalId, title, targetDate }: { goalId: Id<"goals">; title: string; targetDate?: string }) {
  const health = useQuery(api.goals.health, { id: goalId });

  const progress = health && health.totalTasks > 0
    ? Math.round((health.doneTasks / health.totalTasks) * 100)
    : 0;

  const barColor =
    health?.status === 'on_track' ? 'bg-success' :
    health?.status === 'at_risk' ? 'bg-warning' :
    health?.status === 'off_track' ? 'bg-danger' :
    'bg-text-muted';

  return (
    <Link
      href={`/goals/${goalId}`}
      className="group flex items-center gap-4 px-6 py-3 transition-colors hover:bg-surface-hover"
    >
      <span className="flex-1 text-sm text-text truncate group-hover:text-accent transition-colors min-w-0">
        {title}
      </span>

      {/* Progress bar */}
      <div className="w-32 shrink-0">
        <div className="h-1.5 w-full bg-border overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className="text-xs font-mono text-text-muted w-10 text-right shrink-0">
        {progress}%
      </span>

      {targetDate && (
        <span className="text-xs font-mono text-text-muted shrink-0">
          {targetDate}
        </span>
      )}
    </Link>
  );
}

export function GoalsTimeline() {
  const goals = useQuery(api.goals.list, { status: 'active' });

  if (goals === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  // Group by quarter
  const quarterMap = new Map<string, typeof goals>();

  for (const goal of goals) {
    const quarter = goal.quarter ?? '_none';
    const existing = quarterMap.get(quarter);
    if (existing) {
      existing.push(goal);
    } else {
      quarterMap.set(quarter, [goal]);
    }
  }

  // Sort quarters: real quarters first (ascending), then "No Quarter" last
  const sortedQuarters = [...quarterMap.keys()].sort((a, b) => {
    if (a === '_none') return 1;
    if (b === '_none') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Quarterly Timeline
        </span>
        <span className="text-xs font-mono text-text-muted">[ {goals.length} ]</span>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No active goals</p>
          <p className="text-xs text-text-muted/60 mt-1">Set goals with a quarter to see them here</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sortedQuarters.map((quarter) => {
            const quarterGoals = quarterMap.get(quarter) ?? [];
            const label = quarter === '_none' ? 'No Quarter' : quarter;

            return (
              <div key={quarter}>
                {/* Quarter header */}
                <div className="flex items-center gap-4 px-6 py-3 bg-surface">
                  <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-mono text-text-muted">
                    {quarterGoals.length}
                  </span>
                </div>

                {/* Goal bars */}
                <div className="divide-y divide-border">
                  {quarterGoals.map((goal) => (
                    <GoalBar
                      key={goal._id}
                      goalId={goal._id}
                      title={goal.title}
                      targetDate={goal.targetDate}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
