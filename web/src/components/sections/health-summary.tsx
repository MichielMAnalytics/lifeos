'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';

function currentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split('T')[0];
}

const TYPE_COLORS: Record<string, string> = {
  strength: 'bg-accent/20 text-accent',
  cardio: 'bg-success/20 text-success',
  mobility: 'bg-warning/20 text-warning',
  sport: 'bg-text/20 text-text',
  other: 'bg-text-muted/20 text-text-muted',
};

export function HealthSummary() {
  const weekStart = currentMonday();
  const summary = useQuery(api.workouts.summary, { weekStart });

  if (summary === undefined) {
    return <div className="animate-pulse h-32 bg-surface rounded-lg" />;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
          This Week
        </h2>
        <span className="text-xs text-text-muted/60">
          {summary.weekStart} &mdash; {summary.weekEnd}
        </span>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60 mb-1">
              Workouts
            </p>
            <p className="text-2xl font-bold text-text tabular-nums">
              {summary.totalWorkouts}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60 mb-1">
              Duration
            </p>
            <p className="text-2xl font-bold text-text tabular-nums">
              {summary.totalDurationMinutes}<span className="text-sm font-normal text-text-muted ml-1">min</span>
            </p>
          </div>
        </div>

        {Object.keys(summary.byType).length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(summary.byType).map(([type, count]) => (
              <span
                key={type}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${TYPE_COLORS[type] ?? 'bg-surface text-text-muted'}`}
              >
                {type}
                <span className="font-mono">{count}</span>
              </span>
            ))}
          </div>
        )}

        {summary.totalWorkouts === 0 && (
          <p className="mt-4 text-sm text-text-muted/60 text-center">
            No workouts this week yet
          </p>
        )}
      </div>
    </div>
  );
}
