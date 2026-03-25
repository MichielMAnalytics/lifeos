'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, ArrowLeft, TrendingUp, BarChart3, CheckCircle2 } from 'lucide-react';
import type { Doc, Id } from '@/lib/convex-api';

const healthVariant: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  on_track: 'success',
  at_risk: 'warning',
  off_track: 'danger',
  unknown: 'muted',
};

const healthLabelMap: Record<string, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  off_track: 'Off Track',
  unknown: 'Unknown',
};

const ringColor: Record<string, string> = {
  on_track: 'stroke-success',
  at_risk: 'stroke-warning',
  off_track: 'stroke-danger',
  unknown: 'stroke-text-muted',
};

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"goals">;

  const goal = useQuery(api.goals.get, { id });
  const health = useQuery(api.goals.health, { id });

  if (goal === undefined) return <div className="text-text-muted">Loading...</div>;
  if (goal === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/goals" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft size={14} />
          Back to Goals
        </Link>
        <p className="text-text-muted">Goal not found.</p>
      </div>
    );
  }

  const tasks: Doc<"tasks">[] = goal.tasks ?? [];
  const status = health?.status || 'unknown';
  const variant = healthVariant[status] || 'muted';
  const label = healthLabelMap[status] || 'Unknown';

  const doneTasks = tasks.filter((t) => t.status === 'done');
  const openTasks = tasks.filter((t) => t.status === 'todo');

  const progress = health && health.totalTasks > 0
    ? (health.doneTasks / health.totalTasks) * 100
    : 0;

  // SVG progress ring values
  const ringSize = 80;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const targetDate = goal.targetDate ?? null;
  const createdDate = goal._creationTime
    ? new Date(goal._creationTime).toISOString().slice(0, 10)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      {/* Back link */}
      <Link
        href="/goals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Goals
      </Link>

      {/* Goal title + badge */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-text leading-tight">{goal.title}</h1>
          <Badge variant={variant} className="shrink-0 mt-1">{label}</Badge>
        </div>
        {goal.description && (
          <p className="text-base text-text-muted leading-relaxed max-w-2xl">
            {goal.description}
          </p>
        )}
      </div>

      {/* Health visualization */}
      {health && (
        <Card className="rounded-xl p-6">
          <div className="flex items-center gap-8">
            {/* Progress ring */}
            <div className="relative shrink-0">
              <svg
                width={ringSize}
                height={ringSize}
                className="-rotate-90"
              >
                {/* Background ring */}
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-border"
                />
                {/* Progress ring */}
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  className={ringColor[status] || 'stroke-text-muted'}
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset,
                    transition: 'stroke-dashoffset 0.6s ease-out',
                  }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text">
                {Math.round(progress)}%
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 flex-1">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <BarChart3 size={13} />
                  <span className="text-xs font-medium uppercase tracking-wide">Score</span>
                </div>
                <p className="text-xl font-bold text-text">{health.velocity}%</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <TrendingUp size={13} />
                  <span className="text-xs font-medium uppercase tracking-wide">Velocity</span>
                </div>
                <p className="text-xl font-bold text-text">{health.velocity}/wk</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <CheckCircle2 size={13} />
                  <span className="text-xs font-medium uppercase tracking-wide">Done</span>
                </div>
                <p className="text-xl font-bold text-text">
                  {health.doneTasks}<span className="text-sm font-normal text-text-muted">/{health.totalTasks}</span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Meta info */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-text-muted">
          Status: <span className="font-medium text-text capitalize">{goal.status}</span>
        </span>
        {goal.quarter && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-text-muted">
            Quarter: <span className="font-medium text-text">{goal.quarter}</span>
          </span>
        )}
        {targetDate && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-text-muted">
            Target: <span className="font-medium text-text">{formatDate(targetDate)}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-text-muted">
          Created: <span className="font-medium text-text">{formatDate(createdDate)}</span>
        </span>
      </div>

      {/* Open Tasks */}
      <section>
        <div className="flex items-center gap-2.5 mb-3">
          <h2 className="text-sm font-semibold text-text">Open Tasks</h2>
          <span className="text-xs text-text-muted">({openTasks.length})</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {openTasks.length === 0 ? (
          <Card className="rounded-xl">
            <p className="text-sm text-text-muted text-center py-4">All tasks completed.</p>
          </Card>
        ) : (
          <Card className="rounded-xl p-0 overflow-hidden divide-y divide-border/50">
            <div className="stagger-children">
              {openTasks.map((task) => {
                const taskDueDate = task.dueDate ?? null;
                return (
                  <Link
                    key={task._id}
                    href={`/tasks/${task._id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover group"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-text-muted/40 group-hover:border-accent transition-colors" />
                    <span className="flex-1 text-sm font-medium text-text group-hover:text-accent transition-colors truncate">
                      {task.title}
                    </span>
                    {taskDueDate && (
                      <span className="text-xs text-text-muted shrink-0">
                        {formatDate(taskDueDate)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </Card>
        )}
      </section>

      {/* Completed Tasks */}
      {doneTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <h2 className="text-sm font-semibold text-text">Completed</h2>
            <span className="text-xs text-text-muted">({doneTasks.length})</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Card className="rounded-xl p-0 overflow-hidden divide-y divide-border/50">
            <div className="stagger-children">
              {doneTasks.map((task) => (
                <Link
                  key={task._id}
                  href={`/tasks/${task._id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover group"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success">
                    <Check size={12} className="text-bg" strokeWidth={3} />
                  </span>
                  <span className="flex-1 text-sm text-text-muted line-through group-hover:text-accent transition-colors truncate">
                    {task.title}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
