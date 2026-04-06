'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/breadcrumb';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { PropertyDropdown } from '@/components/property-dropdown';
import { useParams } from 'next/navigation';
import type { Id } from '@/lib/convex-api';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"tasks">;

  const task = useQuery(api.tasks.get, { id });
  const project = useQuery(api.projects.get, task?.projectId ? { id: task.projectId } : 'skip');
  const goal = useQuery(api.goals.get, task?.goalId ? { id: task.goalId } : 'skip');
  const allProjects = useQuery(api.projects.list, {});
  const allGoals = useQuery(api.goals.list, { status: 'active' });

  const updateTask = useMutation(api.tasks.update);
  const completeTask = useMutation(api.tasks.complete);

  const [titleValue, setTitleValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (task && !initializedRef.current) {
      setTitleValue(task.title);
      setNotesValue(task.notes ?? '');
      initializedRef.current = true;
    }
  }, [task]);

  const autoResizeNotes = useCallback(() => {
    if (notesRef.current) {
      notesRef.current.style.height = 'auto';
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => { autoResizeNotes(); }, [notesValue, autoResizeNotes]);

  const saveTitle = useCallback(async () => {
    setEditingTitle(false);
    if (titleValue.trim() && task && titleValue.trim() !== task.title) {
      await updateTask({ id, title: titleValue.trim() });
    }
  }, [titleValue, task, id, updateTask]);

  const saveNotes = useCallback(async () => {
    if (task && notesValue !== (task.notes ?? '')) {
      await updateTask({ id, notes: notesValue });
    }
  }, [notesValue, task, id, updateTask]);

  if (task === undefined) {
    return (
      <div className="mx-auto max-w-2xl py-8 px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-surface rounded" />
          <div className="h-8 w-2/3 bg-surface rounded" />
          <div className="h-4 w-full bg-surface rounded" />
        </div>
      </div>
    );
  }

  if (task === null) {
    return (
      <div className="mx-auto max-w-2xl py-8 px-6">
        <Breadcrumb items={[
          { label: 'LifeOS', href: '/today' },
          { label: 'Tasks', href: '/tasks' },
          { label: 'Not found' },
        ]} />
        <p className="text-text-muted">Task not found.</p>
      </div>
    );
  }

  const dueDate = task.dueDate ?? null;
  const isOverdue = dueDate ? dueDate < todayISO() : false;
  const isDone = task.status === 'done';

  return (
    <div className="mx-auto max-w-2xl py-8 px-6">
      <Breadcrumb items={[
        { label: 'LifeOS', href: '/today' },
        { label: 'Tasks', href: '/tasks' },
        { label: titleValue || task.title },
      ]} />

      {/* Title */}
      <div className="flex items-start gap-3 mb-8">
        <button
          type="button"
          onClick={async () => {
            if (!isDone) await completeTask({ id });
          }}
          disabled={isDone}
          className={cn(
            'mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all',
            isDone
              ? 'border-success bg-success/20'
              : isOverdue
                ? 'border-danger/60 hover:border-danger hover:bg-danger/10'
                : 'border-text-muted/30 hover:border-accent hover:bg-accent/10',
          )}
        >
          {isDone && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className={cn(
                'w-full bg-transparent text-2xl font-bold text-text focus:outline-none',
                isDone && 'line-through text-text-muted',
              )}
              autoFocus
            />
          ) : (
            <h1
              className={cn(
                'text-2xl font-bold text-text cursor-text hover:text-accent/80 transition-colors',
                isDone && 'line-through text-text-muted',
              )}
              onClick={() => { if (!isDone) { setEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 0); } }}
            >
              {titleValue || task.title}
            </h1>
          )}
        </div>
      </div>

      {/* Properties */}
      <div className="space-y-3 mb-8">
        {/* Date */}
        <div className="flex items-center gap-3 py-1.5">
          <span className="text-sm text-text-muted w-28 shrink-0 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Date
          </span>
          <span className="text-sm text-text flex-1 relative">
            <button
              type="button"
              onClick={() => setDatePickerOpen((prev) => !prev)}
              className={cn(
                'text-left hover:bg-surface-hover px-2 py-0.5 -mx-2 rounded transition-colors',
                isOverdue ? 'text-danger' : dueDate ? 'text-text' : 'text-text-muted',
              )}
            >
              {dueDate ? formatDateLabel(dueDate) : 'No date'}
            </button>
            {datePickerOpen && (
              <CalendarDatePicker
                currentDate={dueDate ?? undefined}
                onSelect={async (date) => {
                  setDatePickerOpen(false);
                  await updateTask({ id, dueDate: date ?? '' });
                }}
                onClose={() => setDatePickerOpen(false)}
              />
            )}
          </span>
        </div>

        {/* Project */}
        <div className="flex items-center gap-3 py-1.5">
          <span className="text-sm text-text-muted w-28 shrink-0 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Project
          </span>
          <PropertyDropdown
            options={(allProjects ?? []).map((p) => ({ id: p._id, label: p.title }))}
            value={task.projectId ?? null}
            onSelect={async (pid) => {
              await updateTask({ id, projectId: (pid ?? undefined) as Id<'projects'> | undefined });
            }}
            placeholder="No project"
            loading={allProjects === undefined}
          />
        </div>

        {/* Goal */}
        <div className="flex items-center gap-3 py-1.5">
          <span className="text-sm text-text-muted w-28 shrink-0 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            Goal
          </span>
          <PropertyDropdown
            options={(allGoals ?? []).map((g) => ({ id: g._id, label: g.title }))}
            value={task.goalId ?? null}
            onSelect={async (gid) => {
              await updateTask({ id, goalId: (gid ?? undefined) as Id<'goals'> | undefined });
            }}
            placeholder="No goal"
            loading={allGoals === undefined}
          />
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 py-1.5">
          <span className="text-sm text-text-muted w-28 shrink-0 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Status
          </span>
          <span className="text-sm text-text flex-1 flex items-center gap-2">
            <span className={cn(
              'h-2 w-2 rounded-full shrink-0',
              task.status === 'todo' && 'bg-accent',
              task.status === 'done' && 'bg-success',
              task.status === 'dropped' && 'bg-text-muted',
            )} />
            <span className="capitalize">{task.status}</span>
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40 my-6" />

      {/* Description */}
      <textarea
        ref={notesRef}
        value={notesValue}
        onChange={(e) => {
          setNotesValue(e.target.value);
          autoResizeNotes();
        }}
        onBlur={saveNotes}
        placeholder="Add a description..."
        rows={5}
        className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/70 focus:outline-none resize-none leading-relaxed"
      />
    </div>
  );
}
