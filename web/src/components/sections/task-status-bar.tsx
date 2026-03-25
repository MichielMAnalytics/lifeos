'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfDayMs(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getTime();
}

function endOfDayMs(dateStr: string): number {
  return new Date(dateStr + 'T23:59:59.999').getTime();
}

interface StatItem {
  label: string;
  count: number | undefined;
  href: string;
  colorClass: string;
  icon: 'overdue' | 'today' | 'tomorrow' | 'done';
}

function StatIcon({ type }: { type: StatItem['icon'] }) {
  switch (type) {
    case 'overdue':
      return (
        <span className="inline-block h-2 w-2 rounded-full bg-danger shrink-0" />
      );
    case 'today':
      return (
        <span className="inline-block h-2 w-2 rounded-full border-2 border-text shrink-0" />
      );
    case 'tomorrow':
      return (
        <span className="inline-block h-2 w-2 rounded-full border-2 border-text-muted shrink-0" />
      );
    case 'done':
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-success shrink-0"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
  }
}

export function TaskStatusBar() {
  const overdueTasks = useQuery(api.tasks.list, { status: 'todo', due: 'overdue' });
  const todayTasks = useQuery(api.tasks.list, { status: 'todo', due: 'today' });
  const tomorrowTasks = useQuery(api.tasks.list, { status: 'todo', due: 'tomorrow' });
  const doneTasks = useQuery(api.tasks.list, { status: 'done' });

  const today = todayISO();
  const dayStart = startOfDayMs(today);
  const dayEnd = endOfDayMs(today);

  const doneToday = doneTasks?.filter((t) => {
    if (!t.completedAt) return false;
    return t.completedAt >= dayStart && t.completedAt <= dayEnd;
  });

  const stats: StatItem[] = [
    {
      label: 'Overdue',
      count: overdueTasks?.length,
      href: '/tasks?filter=overdue',
      colorClass: 'text-danger',
      icon: 'overdue',
    },
    {
      label: 'Today',
      count: todayTasks?.length,
      href: '/tasks?filter=today',
      colorClass: 'text-text',
      icon: 'today',
    },
    {
      label: 'Tomorrow',
      count: tomorrowTasks?.length,
      href: '/tasks?filter=tomorrow',
      colorClass: 'text-text-muted',
      icon: 'tomorrow',
    },
    {
      label: 'Done',
      count: doneToday?.length,
      href: '/tasks?filter=done',
      colorClass: 'text-success',
      icon: 'done',
    },
  ];

  const isLoading = overdueTasks === undefined
    || todayTasks === undefined
    || tomorrowTasks === undefined
    || doneTasks === undefined;

  if (isLoading) {
    return (
      <div className="bg-surface/50 px-6 py-3">
        <div className="flex items-center gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="animate-pulse h-3 w-8 bg-surface rounded" />
              <div className="animate-pulse h-3 w-14 bg-surface rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface/50 px-6 py-3">
      <div className="flex items-center gap-0 divide-x divide-border">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(
              'flex items-center gap-2 px-5 first:pl-0 last:pr-0 transition-opacity hover:opacity-80',
              stat.colorClass,
            )}
          >
            <StatIcon type={stat.icon} />
            <span className="text-sm font-bold tabular-nums">
              {stat.count ?? 0}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide">
              {stat.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
