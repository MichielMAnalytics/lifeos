'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useTodayDate } from '@/lib/today-date-context';
import { cn } from '@/lib/utils';

// ── Block type colors (reuse the same palette as day-plan.tsx) ──

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

const checkableTypes = new Set(['mit', 'p1', 'p2', 'task']);

// ── Helpers ──────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getDoneField(type: string): 'mitDone' | 'p1Done' | 'p2Done' | null {
  switch (type) {
    case 'mit':
      return 'mitDone';
    case 'p1':
      return 'p1Done';
    case 'p2':
      return 'p2Done';
    default:
      return null;
  }
}

function getDoneValue(
  dayPlan: { mitDone: boolean; p1Done: boolean; p2Done: boolean },
  type: string,
): boolean {
  const field = getDoneField(type);
  if (!field) return false;
  return dayPlan[field];
}

// ── ScheduleBlock ────────────────────────────────────────

interface ScheduleBlock {
  start: string;
  end: string;
  label: string;
  type: string;
  taskId?: string;
}

function BlockRow({
  block,
  isPast,
  isCurrent,
  done,
  onToggle,
}: {
  block: ScheduleBlock;
  isPast: boolean;
  isCurrent: boolean;
  done: boolean;
  onToggle: (() => void) | null;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 border-l-2 px-4 py-3 transition-colors',
        blockBorder[block.type] ?? 'border-l-text-muted',
        isPast && 'opacity-50',
        isCurrent && 'bg-danger/5',
      )}
    >
      {/* Time range */}
      <span className="w-28 shrink-0 font-mono text-xs text-text-muted">
        {block.start} - {block.end}
      </span>

      {/* Optional checkbox for priority/task blocks */}
      {onToggle ? (
        <button
          onClick={onToggle}
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all',
            done
              ? 'border-success bg-success text-white'
              : 'border-text-muted/40 hover:border-text',
          )}
          aria-label={`Toggle ${block.label}`}
        >
          {done && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      {/* Label */}
      <span
        className={cn(
          'flex-1 text-sm truncate',
          done ? 'line-through text-text-muted' : 'text-text',
        )}
      >
        {block.label}
      </span>

      {/* Type badge */}
      <span className="text-xs font-mono text-text-muted uppercase">
        {block.type}
      </span>
    </div>
  );
}

// ── NowLine ──────────────────────────────────────────────

function NowLine() {
  return (
    <div className="relative flex items-center gap-2 py-1">
      <span className="h-2 w-2 rounded-full bg-danger shrink-0" />
      <span className="text-xs font-bold text-danger uppercase tracking-widest">
        Now
      </span>
      <div className="flex-1 h-px bg-danger" />
    </div>
  );
}

// ── Main component ───────────────────────────────────────

export function DayTimeline() {
  const { date, isToday } = useTodayDate();
  const dayPlan = useQuery(api.dayPlans.getByDate, { date });
  const upsert = useMutation(api.dayPlans.upsert);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [isToday]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (dayPlan === undefined) {
    return (
      <div className="border border-border">
        <div className="px-6 py-4 border-b border-border">
          <div className="animate-pulse h-4 w-28 bg-surface rounded" />
        </div>
        <div className="p-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse h-10 bg-surface rounded" />
          ))}
        </div>
      </div>
    );
  }

  const schedule: ScheduleBlock[] = dayPlan?.schedule ?? [];

  const handleToggle = (type: string) => {
    const field = getDoneField(type);
    if (!field || !dayPlan) return;
    void upsert({ date, [field]: !dayPlan[field] });
  };

  // Build render list with NOW line insertions
  type RenderItem =
    | { kind: 'block'; block: ScheduleBlock; index: number }
    | { kind: 'now' };

  const items: RenderItem[] = [];
  let nowInserted = false;

  for (let i = 0; i < schedule.length; i++) {
    const block = schedule[i];

    // Insert NOW line before this block if now falls before its start
    if (isToday && !nowInserted && nowMinutes < timeToMinutes(block.start)) {
      items.push({ kind: 'now' });
      nowInserted = true;
    }

    items.push({ kind: 'block', block, index: i });

    // Insert NOW line between blocks if now falls in the gap
    if (isToday && !nowInserted) {
      const nextBlock = schedule[i + 1];
      const blockEnd = timeToMinutes(block.end);
      if (nowMinutes >= blockEnd) {
        if (!nextBlock || nowMinutes < timeToMinutes(nextBlock.start)) {
          items.push({ kind: 'now' });
          nowInserted = true;
        }
      }
    }
  }

  // If NOW hasn't been inserted yet and it's today, append it at the end
  if (isToday && !nowInserted) {
    items.push({ kind: 'now' });
  }

  return (
    <div className="border border-border">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Timeline
        </h2>
        {dayPlan?.wakeTime && (
          <span className="text-xs font-mono text-text-muted">
            Wake {dayPlan.wakeTime}
          </span>
        )}
      </div>

      {schedule.length > 0 ? (
        <div className="py-2">
          {items.map((item) => {
            if (item.kind === 'now') {
              return <div key="now-line" className="px-4"><NowLine /></div>;
            }

            const { block, index } = item;
            const blockStart = timeToMinutes(block.start);
            const blockEnd = timeToMinutes(block.end);
            const isPast = isToday && nowMinutes >= blockEnd;
            const isCurrent =
              isToday && nowMinutes >= blockStart && nowMinutes < blockEnd;

            const isCheckable = checkableTypes.has(block.type);
            const done = dayPlan ? getDoneValue(dayPlan, block.type) : false;

            return (
              <BlockRow
                key={`block-${index}`}
                block={block}
                isPast={isPast}
                isCurrent={isCurrent}
                done={done}
                onToggle={isCheckable ? () => handleToggle(block.type) : null}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <p className="text-sm text-text-muted">No schedule blocks</p>
          <p className="text-xs text-text-muted/60 mt-1">
            Create a day plan to populate the timeline
          </p>
        </div>
      )}

      {/* Overflow warning */}
      {dayPlan?.overflow && dayPlan.overflow.length > 0 && (
        <div className="border-t border-warning/30 px-6 py-3">
          <p className="text-xs font-bold text-warning uppercase tracking-wide">
            Overflow
          </p>
          <p className="text-xs text-text-muted mt-1">
            {dayPlan.overflow.length} task(s) did not fit in the schedule.
          </p>
        </div>
      )}
    </div>
  );
}
