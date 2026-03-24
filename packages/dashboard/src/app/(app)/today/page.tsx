'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { ProgressRing } from '@/components/progress-ring';
import { QuickCapture } from '@/components/quick-capture';
import Link from 'next/link';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayPage() {
  const todayStr = todayISO();

  const todayTasks = useQuery(api.tasks.list, { status: "todo", due: "today" });
  const overdueTasks = useQuery(api.tasks.list, { status: "todo", due: "overdue" });
  const journal = useQuery(api.journals.getByDate, { date: todayStr });
  const dayPlan = useQuery(api.dayPlans.getByDate, { date: todayStr });

  if (todayTasks === undefined || overdueTasks === undefined) {
    return <div className="text-text-muted">Loading...</div>;
  }

  const dateLabel = new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Compute focus progress
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
    <div className="max-w-none space-y-8">
      {/* Greeting header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">
          {getGreeting()}
        </h1>
        <p className="mt-2 text-sm text-text-muted">{dateLabel}</p>
      </div>

      {/* Quick capture bar */}
      <QuickCapture />

      {/* Overdue alert */}
      {overdueTasks.length > 0 && (
        <div className="border border-danger/40 px-6 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-danger">
              {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-text-muted truncate mt-1">
              {overdueTasks.slice(0, 3).map((t) => t.title).join(', ')}
              {overdueTasks.length > 3 && ` +${overdueTasks.length - 3} more`}
            </p>
          </div>
          <Link
            href="/tasks?filter=overdue"
            className="shrink-0 bg-white text-black px-4 py-2 text-xs font-medium uppercase tracking-wide hover:bg-white/90 transition-colors"
          >
            View all
          </Link>
        </div>
      )}

      {/* Focus section -- three columns */}
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

      {/* Two column grid: Tasks left, Journal right -- FULL WIDTH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Today's Tasks */}
        <div className="border border-border flex flex-col">
          <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
            <h2 className="text-sm font-bold text-text uppercase tracking-wide">
              Today&apos;s Tasks
            </h2>
            <span className="text-xs text-text-muted">[ {todayTasks.length} ]</span>
          </div>
          {todayTasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-text-muted">No tasks due today</p>
              <p className="text-xs text-text-muted/60 mt-1">Use quick capture to add one</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todayTasks.map((task, i: number) => (
                <Link
                  key={task._id}
                  href={`/tasks/${task._id}`}
                  className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-hover"
                >
                  <span className="text-xs font-mono text-text-muted w-6 shrink-0">
                    [{String(i + 1).padStart(2, '0')}]
                  </span>
                  <span className="h-4 w-4 shrink-0 rounded-full border border-text-muted/40 group-hover:border-text transition-colors" />
                  <span className="flex-1 text-sm text-text truncate group-hover:text-accent transition-colors">
                    {task.title}
                  </span>
                  {task.goalId && (
                    <span className="text-xs text-text-muted">[ goal ]</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: Journal */}
        <div className="border border-border flex flex-col">
          <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
            <h2 className="text-sm font-bold text-text uppercase tracking-wide">
              Journal
            </h2>
            {journal && (
              <Link
                href={`/journal/${todayStr}`}
                className="text-xs text-text-muted hover:text-text transition-colors"
              >
                Open
              </Link>
            )}
          </div>
          {journal ? (
            <div className="p-6 space-y-4 text-sm">
              {/* MIT / P1 / P2 entries */}
              {(journal.mit || journal.p1 || journal.p2) && (
                <div className="space-y-3">
                  {journal.mit && (
                    <JournalEntry label="MIT" value={journal.mit} />
                  )}
                  {journal.p1 && (
                    <JournalEntry label="P1" value={journal.p1} />
                  )}
                  {journal.p2 && (
                    <JournalEntry label="P2" value={journal.p2} />
                  )}
                </div>
              )}

              {/* Notes */}
              {journal.notes && (
                <div className="border-t border-border pt-4">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Notes</span>
                  <p className="text-text/80 leading-relaxed line-clamp-4 mt-2">
                    {journal.notes}
                  </p>
                </div>
              )}

              {/* Wins */}
              {journal.wins && journal.wins.length > 0 && (
                <div className="border-t border-border pt-4">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Wins</span>
                  <ul className="space-y-2 mt-2">
                    {journal.wins.map((win: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-sm text-success/80"
                      >
                        <span className="text-xs font-mono text-text-muted mt-0.5">
                          [{String(i + 1).padStart(2, '0')}]
                        </span>
                        {win}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-text-muted">No journal entry yet</p>
              <Link
                href={`/journal/${todayStr}`}
                className="mt-3 text-xs text-text-muted hover:text-text transition-colors border border-border px-4 py-2"
              >
                Start writing
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function JournalEntry({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-bold text-text-muted uppercase tracking-wide mt-0.5 w-8 shrink-0">
        {label}
      </span>
      <span className="text-text/80 leading-relaxed">{value}</span>
    </div>
  );
}
