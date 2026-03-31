'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import type { Doc } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { GoalForm } from '@/components/goal-form';
import { GoalDetailModal } from '@/components/goal-detail-modal';

// ── Helpers ────────────────────────────────────────────

function getCurrentQuarter(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const q = Math.floor(month / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

const statusBadge: Record<string, { label: string; classes: string }> = {
  active: { label: 'Active', classes: 'bg-accent/10 text-accent' },
  completed: { label: 'Done', classes: 'bg-success/10 text-success' },
  dropped: { label: 'Dropped', classes: 'bg-text-muted/10 text-text-muted' },
};

const healthDot: Record<string, string> = {
  on_track: 'bg-success',
  at_risk: 'bg-warning',
  off_track: 'bg-danger',
  unknown: 'bg-text-muted',
};

// ── GoalRow ──────────────────────────────────────────

function GoalRow({ goal, onSelect }: { goal: Doc<'goals'>; onSelect: (goalId: Id<'goals'>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const health = useQuery(api.goals.health, { id: goal._id });
  const goalDetail = useQuery(api.goals.get, expanded ? { id: goal._id } : 'skip');
  const updateGoal = useMutation(api.goals.update);

  const badge = statusBadge[goal.status] ?? statusBadge.active;
  const dot = healthDot[health?.status ?? 'unknown'];
  const taskCount = health?.totalTasks ?? 0;
  const isCompleted = goal.status === 'completed';

  async function toggleCompleted() {
    try {
      await updateGoal({
        id: goal._id,
        status: isCompleted ? 'active' : 'completed',
      });
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  }

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3 group">
        {/* Checkbox */}
        <button
          onClick={toggleCompleted}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            isCompleted
              ? 'border-success bg-success/10 text-success'
              : 'border-border hover:border-text-muted',
          )}
        >
          {isCompleted && (
            <svg
              width={12}
              height={12}
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

        {/* Title + open detail */}
        <button
          onClick={() => onSelect(goal._id)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <span className="text-xs text-text-muted shrink-0">
            {expanded ? '\u25BE' : '\u25B8'}
          </span>
          <span
            className={cn(
              'text-sm font-medium truncate',
              isCompleted ? 'text-text-muted line-through' : 'text-text',
            )}
          >
            {goal.title}
          </span>
        </button>

        {/* Status badge */}
        <span
          className={cn(
            'shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            badge.classes,
          )}
        >
          {badge.label}
        </span>

        {/* Health dot */}
        <span className={cn('h-2 w-2 rounded-full shrink-0', dot)} title={health?.status ?? 'unknown'} />

        {/* Task count */}
        <span className="text-xs text-text-muted shrink-0 w-14 text-right">
          {taskCount} tasks
        </span>
      </div>

      {/* Expanded: linked tasks */}
      {expanded && (
        <div className="px-4 pb-4 pl-14">
          {goalDetail === undefined ? (
            <div className="animate-pulse h-8 bg-surface rounded" />
          ) : goalDetail === null || goalDetail.tasks.length === 0 ? (
            <p className="text-xs text-text-muted italic">No linked tasks</p>
          ) : (
            <div className="space-y-1">
              {goalDetail.tasks.map((task) => (
                <div
                  key={task._id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      task.status === 'done' ? 'bg-success' : task.status === 'dropped' ? 'bg-text-muted' : 'bg-border',
                    )}
                  />
                  <span
                    className={cn(
                      task.status === 'done'
                        ? 'text-text-muted line-through'
                        : task.status === 'dropped'
                          ? 'text-text-muted line-through'
                          : 'text-text',
                    )}
                  >
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-text-muted ml-auto">
                      {task.dueDate}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {goal.description && (
            <p className="mt-3 text-xs text-text-muted leading-relaxed border-l-2 border-border pl-3">
              {goal.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Quarter colors ──────────────────────────────────

const QUARTER_COLORS: Record<string, string> = {
  'Q1': 'border-l-4 border-l-blue-500/40',
  'Q2': 'border-l-4 border-l-emerald-500/40',
  'Q3': 'border-l-4 border-l-amber-500/40',
  'Q4': 'border-l-4 border-l-purple-500/40',
};

function getQuarterColorClass(quarter: string): string {
  const match = quarter.match(/Q([1-4])/);
  if (match) {
    return QUARTER_COLORS[`Q${match[1]}`] ?? '';
  }
  return '';
}

// ── QuarterSection ───────────────────────────────────

function QuarterSection({
  quarter,
  goals,
  isCurrent,
  onSelectGoal,
}: {
  quarter: string;
  goals: Doc<'goals'>[];
  isCurrent: boolean;
  onSelectGoal: (goalId: Id<'goals'>) => void;
}) {
  const activeCount = goals.filter((g) => g.status === 'active').length;
  const completedCount = goals.filter((g) => g.status === 'completed').length;

  const quarterColor = getQuarterColorClass(quarter);

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden',
        isCurrent ? 'border-accent/40' : 'border-border',
        quarterColor,
      )}
    >
      {/* Quarter header */}
      <div
        className={cn(
          'flex items-baseline justify-between px-4 py-3 border-b',
          isCurrent ? 'border-accent/40 bg-accent/5' : 'border-border',
        )}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            {quarter}
          </h3>
          {isCurrent && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
              Current
            </span>
          )}
        </div>
        <span className="text-xs text-text-muted">
          {completedCount}/{goals.length} done
          {activeCount > 0 && ` \u00b7 ${activeCount} active`}
        </span>
      </div>

      {/* Goal rows */}
      {goals.map((goal) => (
        <GoalRow key={goal._id} goal={goal} onSelect={onSelectGoal} />
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────

export function QuarterlyGoals() {
  const allGoals = useQuery(api.goals.list, {});
  const currentQuarter = useMemo(() => getCurrentQuarter(), []);
  const [selectedGoalId, setSelectedGoalId] = useState<Id<'goals'> | null>(null);

  const grouped = useMemo(() => {
    if (!allGoals) return null;

    const map = new Map<string, Doc<'goals'>[]>();
    const unassigned: Doc<'goals'>[] = [];

    for (const goal of allGoals) {
      if (goal.quarter) {
        const existing = map.get(goal.quarter);
        if (existing) {
          existing.push(goal);
        } else {
          map.set(goal.quarter, [goal]);
        }
      } else {
        unassigned.push(goal);
      }
    }

    // Sort quarters in ascending chronological order (earliest first)
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return { sorted, unassigned };
  }, [allGoals]);

  if (allGoals === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  return (
    <div className="max-w-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Quarterly Goals
        </h1>
        <GoalForm />
      </div>

      {/* Quarters */}
      {grouped && grouped.sorted.length === 0 && grouped.unassigned.length === 0 ? (
        <div className="space-y-4">
          {/* Ghost quarter section */}
          <div className="border border-dashed border-border/50 rounded-xl overflow-hidden">
            {/* Quarter header */}
            <div className="flex items-baseline justify-between px-4 py-3 border-b border-border/30 bg-accent/5 opacity-60">
              <div className="flex items-center gap-3">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
                  {currentQuarter}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent/60">
                  Current
                </span>
              </div>
              <span className="text-xs text-text-muted">0/3 done</span>
            </div>

            {/* Ghost goal rows */}
            {[
              { title: 'Launch product beta', tasks: 5 },
              { title: 'Grow revenue to $10k MRR', tasks: 3 },
              { title: 'Hire 2 team members', tasks: 2 },
            ].map((ghost, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3 opacity-40 border-b border-border/30 last:border-b-0"
              >
                {/* Ghost checkbox */}
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-dashed border-border" />

                {/* Title */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <span className="text-xs text-text-muted shrink-0">{'\u25B8'}</span>
                  <span className="text-sm font-medium text-text-muted italic truncate">
                    {ghost.title}
                  </span>
                </div>

                {/* Status badge */}
                <span className="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent/50">
                  Active
                </span>

                {/* Health dot */}
                <span className="h-2 w-2 rounded-full shrink-0 bg-text-muted/50" />

                {/* Task count */}
                <span className="text-xs text-text-muted shrink-0 w-14 text-right">
                  {ghost.tasks} tasks
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-text-muted/70">
            Set your first quarterly goal
          </p>
        </div>
      ) : grouped ? (
        <div className="space-y-6">
          {grouped.sorted.map(([quarter, goals]) => (
            <QuarterSection
              key={quarter}
              quarter={quarter}
              goals={goals}
              isCurrent={quarter === currentQuarter}
              onSelectGoal={setSelectedGoalId}
            />
          ))}

          {grouped.unassigned.length > 0 && (
            <QuarterSection
              quarter="No Quarter"
              goals={grouped.unassigned}
              isCurrent={false}
              onSelectGoal={setSelectedGoalId}
            />
          )}
        </div>
      ) : null}

      {/* Detail Modal */}
      {selectedGoalId && (
        <GoalDetailModal
          goalId={selectedGoalId}
          onClose={() => setSelectedGoalId(null)}
        />
      )}
    </div>
  );
}
