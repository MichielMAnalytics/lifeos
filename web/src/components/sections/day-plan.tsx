'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn, formatDate } from '@/lib/utils';

const blockBorder: Record<string, string> = {
  mit: 'border-l-accent',
  p1: 'border-l-purple-500',
  p2: 'border-l-indigo-500',
  event: 'border-l-warning',
  break: 'border-l-text-muted',
  lunch: 'border-l-text-muted',
  task: 'border-l-success',
  wake: 'border-l-warning',
  other: 'border-l-text-muted',
};

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function PriorityPill({ label, done }: { label: string; done: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors',
        done
          ? 'border-success/40 text-success'
          : 'border-border text-text-muted',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          done ? 'bg-success' : 'bg-text-muted',
        )}
      />
      {label}
    </span>
  );
}

export function DayPlan() {
  const dayPlan = useQuery(api.dayPlans.getByDate, { date: today() });

  if (dayPlan === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-baseline justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">Today</h2>
        <span className="text-xs font-mono text-text-muted">{formatDate(today())}</span>
      </div>

      {dayPlan ? (
        <div className="p-6 space-y-6">
          {/* Wake time */}
          {dayPlan.wakeTime && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wide">Wake</span>
              <span className="font-bold text-text font-mono">{dayPlan.wakeTime}</span>
            </div>
          )}

          {/* Priority Completion */}
          <div className="flex gap-4">
            <PriorityPill label="MIT" done={dayPlan.mitDone} />
            <PriorityPill label="P1" done={dayPlan.p1Done} />
            <PriorityPill label="P2" done={dayPlan.p2Done} />
          </div>

          {/* Schedule */}
          {dayPlan.schedule && dayPlan.schedule.length > 0 ? (
            <div className="space-y-1">
              {dayPlan.schedule.map((block, i: number) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-4 border-l-2 px-4 py-3 transition-colors hover:bg-surface-hover',
                    blockBorder[block.type] ?? 'border-l-text-muted',
                  )}
                >
                  <span className="w-28 shrink-0 font-mono text-xs text-text-muted">
                    {block.start} - {block.end}
                  </span>
                  <span className="flex-1 text-sm text-text">
                    {block.label}
                  </span>
                  <span className="text-xs font-mono text-text-muted uppercase">
                    {block.type}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No schedule blocks yet.</p>
          )}

          {/* Overflow */}
          {dayPlan.overflow && dayPlan.overflow.length > 0 && (
            <div className="border border-warning/30 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-warning uppercase tracking-wide">Overflow</p>
              <p className="text-xs text-text-muted mt-1">
                {dayPlan.overflow.length} task(s) did not fit in today&apos;s schedule.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <p className="text-sm text-text-muted">No plan for today.</p>
          <p className="text-xs text-text-muted mt-1">
            Create a day plan via the CLI or API.
          </p>
        </div>
      )}
    </div>
  );
}
