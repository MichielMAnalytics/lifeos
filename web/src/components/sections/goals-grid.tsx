'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { GoalForm } from '@/components/goal-form';
import Link from 'next/link';
import type { Doc } from '@/lib/convex-api';

const healthColor: Record<string, string> = {
  on_track: 'bg-success',
  at_risk: 'bg-warning',
  off_track: 'bg-danger',
  unknown: 'bg-text-muted',
};

const healthLabel: Record<string, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  off_track: 'Off Track',
  unknown: 'No Data',
};

const progressBarColor: Record<string, string> = {
  on_track: 'bg-success',
  at_risk: 'bg-warning',
  off_track: 'bg-danger',
  unknown: 'bg-text-muted',
};

function GoalCard({ goal }: { goal: Doc<"goals"> }) {
  const health = useQuery(api.goals.health, { id: goal._id });

  const status = health?.status || 'unknown';
  const dotColor = healthColor[status] || 'bg-text-muted';
  const label = healthLabel[status] || 'No Data';
  const barColor = progressBarColor[status] || 'bg-text-muted';
  const progress = health && health.totalTasks > 0
    ? (health.doneTasks / health.totalTasks) * 100
    : 0;

  return (
    <Link key={goal._id} href={`/goals/${goal._id}`}>
      <div className="border border-border rounded-xl p-6 transition-all duration-200 ease-out hover:border-text/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] group h-full flex flex-col">
        {/* Top row: title + health dot */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-lg font-bold text-text group-hover:text-accent transition-colors leading-snug">
            {goal.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <span className={`h-2 w-2 rounded-full ${dotColor}`} />
            <span className="text-xs text-text-muted">{label}</span>
          </div>
        </div>

        {/* Description */}
        {goal.description && (
          <p className="text-sm text-text-muted line-clamp-2 mb-4 leading-relaxed">
            {goal.description}
          </p>
        )}

        {/* Progress bar */}
        <div className="mb-4 mt-auto">
          <div className="h-1 w-full bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-text-muted">
          {goal.quarter ? (
            <span>{goal.quarter}</span>
          ) : (
            <span />
          )}
          {health && (
            <span className="tabular-nums">
              {health.doneTasks}/{health.totalTasks} tasks
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function GoalsGrid() {
  const goals = useQuery(api.goals.list, { status: "active" });

  if (!goals) return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 rounded-xl bg-surface animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="max-w-none space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Goals
        </h1>
        <GoalForm />
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-text">No active goals</p>
          <p className="text-sm text-text-muted mt-1">Set one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal._id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
