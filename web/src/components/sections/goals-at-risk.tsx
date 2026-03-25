'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import Link from 'next/link';
import type { Id } from '@/lib/convex-api';

const statusColors: Record<string, string> = {
  at_risk: 'text-warning',
  off_track: 'text-danger',
};

const statusLabels: Record<string, string> = {
  at_risk: 'AT RISK',
  off_track: 'OFF TRACK',
};

function GoalHealthRow({ goalId, title }: { goalId: Id<"goals">; title: string }) {
  const health = useQuery(api.goals.health, { id: goalId });

  if (health === undefined) {
    return <div className="animate-pulse h-10 bg-surface rounded" />;
  }

  // Only render if at_risk or off_track
  if (!health || (health.status !== 'at_risk' && health.status !== 'off_track')) {
    return null;
  }

  const colorClass = statusColors[health.status] ?? 'text-text-muted';
  const label = statusLabels[health.status] ?? health.status;

  return (
    <Link
      href={`/goals/${goalId}`}
      className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className={`text-xs font-bold uppercase tracking-wide ${colorClass}`}>
          {label}
        </span>
        <span className="text-sm text-text truncate group-hover:text-accent transition-colors">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-mono text-text-muted">
          {health.doneTasks}/{health.totalTasks}
        </span>
        <span className="text-xs text-text-muted">tasks</span>
      </div>
    </Link>
  );
}

export function GoalsAtRisk() {
  const goals = useQuery(api.goals.list, { status: 'active' });

  if (goals === undefined) {
    return <div className="animate-pulse h-32 bg-surface rounded-lg" />;
  }

  if (goals.length === 0) {
    return (
      <div className="border border-border p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Goals at Risk
          </h2>
        </div>
        <p className="text-sm text-text-muted">No active goals</p>
      </div>
    );
  }

  return (
    <div className="border border-border flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Goals at Risk
        </h2>
        <Link
          href="/goals"
          className="text-xs text-text-muted hover:text-text transition-colors"
        >
          All goals
        </Link>
      </div>
      <GoalsList goals={goals} />
    </div>
  );
}

function GoalsList({ goals }: { goals: Array<{ _id: Id<"goals">; title: string }> }) {
  return (
    <div className="divide-y divide-border">
      {goals.map((goal) => (
        <GoalHealthRow key={goal._id} goalId={goal._id} title={goal.title} />
      ))}
      <AtRiskFallback />
    </div>
  );
}

/**
 * Fallback message when all goals are on track.
 * Uses CSS :only-child to show only when no GoalHealthRow siblings render.
 */
function AtRiskFallback() {
  return (
    <div className="px-6 py-8 text-center only:flex hidden flex-col items-center">
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-success mb-2"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <p className="text-sm text-success">All goals on track</p>
    </div>
  );
}
