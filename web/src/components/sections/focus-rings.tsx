'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { ProgressRing } from '@/components/progress-ring';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FocusRings() {
  const todayStr = todayISO();
  const dayPlan = useQuery(api.dayPlans.getByDate, { date: todayStr });

  if (dayPlan === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  const mitDone = dayPlan?.mitDone ?? false;
  const p1Done = dayPlan?.p1Done ?? false;
  const p2Done = dayPlan?.p2Done ?? false;

  const focusItems = [
    { label: 'MIT', done: mitDone, taskId: dayPlan?.mitTaskId ?? null },
    { label: 'P1', done: p1Done, taskId: dayPlan?.p1TaskId ?? null },
    { label: 'P2', done: p2Done, taskId: dayPlan?.p2TaskId ?? null },
  ];

  const focusCompleted = [mitDone, p1Done, p2Done].filter(Boolean).length;
  const focusTotal = 3;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-lg font-bold text-text uppercase tracking-wide">Focus</h2>
        <span className="text-sm text-text-muted">
          {focusCompleted}/{focusTotal} complete
        </span>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {focusItems.map((item) => (
          <div
            key={item.label}
            className="border border-border p-6 flex flex-col items-center gap-4"
          >
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
              {item.label}
            </span>
            <ProgressRing
              progress={item.done ? 100 : 0}
              done={item.done}
              label=""
              size={76}
              strokeWidth={4}
            />
            <span className="text-xs text-text-muted truncate max-w-full">
              {item.taskId ? `${String(item.taskId).slice(0, 8)}...` : 'Not set'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
