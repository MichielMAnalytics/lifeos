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
  icon: 'overdue' | 'today' | 'done';
}

function StatIcon({ type }: { type: StatItem['icon'] }) {
  switch (type) {
    case 'overdue':
      return (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger/70 shrink-0" />
      );
    case 'today':
      return (
        <span className="inline-block h-1.5 w-1.5 rounded-full border border-text-muted shrink-0" />
      );
    case 'done':
      return (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-success/70 shrink-0"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
  }
}

export function TaskStatusBar() {
  const overdueTasks = useQuery(api.tasks.list, { status: 'todo', due: 'overdue' });
  const todayTasks = useQuery(api.tasks.list, { status: 'todo', due: 'today' });
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
      colorClass: 'text-danger/70',
      icon: 'overdue',
    },
    {
      label: 'Today',
      count: todayTasks?.length,
      href: '/tasks?filter=today',
      colorClass: 'text-text-muted',
      icon: 'today',
    },
    {
      label: 'Done',
      count: doneToday?.length,
      href: '/tasks?filter=done',
      colorClass: 'text-success/70',
      icon: 'done',
    },
  ];

  const isLoading = overdueTasks === undefined
    || todayTasks === undefined
    || doneTasks === undefined;

  if (isLoading) {
    return (
      <div className="px-6 py-1.5">
        <div className="flex items-center gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="animate-pulse h-2 w-5 bg-surface rounded" />
              <div className="animate-pulse h-2 w-10 bg-surface rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-1.5">
      <div className="flex items-center gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(
              'flex items-center gap-1.5 transition-opacity hover:opacity-100 opacity-80',
              stat.colorClass,
            )}
          >
            <StatIcon type={stat.icon} />
            <span className="text-[11px] font-semibold tabular-nums">
              {stat.count ?? 0}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {stat.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
