'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { SidePeek } from '@/components/side-peek';

// ── Date helpers ───────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}


// ── Task Detail Modal ───────────────────────────────

export function TaskDetailModal({ taskId, onClose }: { taskId: Id<'tasks'>; onClose: () => void }) {
  const task = useQuery(api.tasks.get, { id: taskId });
  const project = useQuery(api.projects.get, task?.projectId ? { id: task.projectId } : 'skip');
  const goal = useQuery(api.goals.get, task?.goalId ? { id: task.goalId } : 'skip');

  const updateTask = useMutation(api.tasks.update);
  const completeTask = useMutation(api.tasks.complete);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [completing, setCompleting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Initialize local state from task data
  useEffect(() => {
    if (task && !initializedRef.current) {
      setTitleValue(task.title);
      setNotesValue(task.notes ?? '');
      initializedRef.current = true;
    }
  }, [task]);

  // Reset initialized flag when taskId changes
  useEffect(() => {
    initializedRef.current = false;
  }, [taskId]);

  // Auto-resize textarea
  const autoResizeNotes = useCallback(() => {
    if (notesRef.current) {
      notesRef.current.style.height = 'auto';
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResizeNotes();
  }, [notesValue, autoResizeNotes]);

  // Debounced save for title
  const saveTitleDebounced = useCallback(
    (value: string) => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = setTimeout(async () => {
        if (value.trim() && task && value.trim() !== task.title) {
          try {
            await updateTask({ id: taskId, title: value.trim() });
          } catch (err) {
            console.error('Failed to update title:', err);
          }
        }
      }, 1000);
    },
    [taskId, task, updateTask],
  );

  // Debounced save for notes
  const saveNotesDebounced = useCallback(
    (value: string) => {
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
      notesDebounceRef.current = setTimeout(async () => {
        if (task && value !== (task.notes ?? '')) {
          try {
            await updateTask({ id: taskId, notes: value });
          } catch (err) {
            console.error('Failed to update notes:', err);
          }
        }
      }, 1000);
    },
    [taskId, task, updateTask],
  );

  // Save title on blur
  const handleTitleBlur = useCallback(async () => {
    setEditingTitle(false);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    if (titleValue.trim() && task && titleValue.trim() !== task.title) {
      try {
        await updateTask({ id: taskId, title: titleValue.trim() });
      } catch (err) {
        console.error('Failed to update title:', err);
      }
    }
  }, [titleValue, task, taskId, updateTask]);

  // Save notes on blur
  const handleNotesBlur = useCallback(async () => {
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    if (task && notesValue !== (task.notes ?? '')) {
      try {
        await updateTask({ id: taskId, notes: notesValue });
      } catch (err) {
        console.error('Failed to update notes:', err);
      }
    }
  }, [notesValue, task, taskId, updateTask]);

  const handleComplete = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await completeTask({ id: taskId });
      // Close modal after completing
      setTimeout(() => onClose(), 300);
    } catch (err) {
      console.error('Failed to complete task:', err);
      setCompleting(false);
    }
  }, [completeTask, completing, taskId, onClose]);

  const handleDateSelect = useCallback(
    async (date: string | null) => {
      setDatePickerOpen(false);
      try {
        await updateTask({ id: taskId, dueDate: date ?? '' });
      } catch (err) {
        console.error('Failed to update date:', err);
      }
    },
    [updateTask, taskId],
  );

  if (!task) {
    return (
      <SidePeek open={true} onClose={onClose} title="Task">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </SidePeek>
    );
  }

  const dueDate = task.dueDate ?? null;
  const isOverdue = dueDate ? dueDate < todayISO() : false;
  const isDone = task.status === 'done';
  const createdDate = new Date(task._creationTime).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SidePeek open={true} onClose={onClose} title="Task">
      <div className="px-8 py-6">
        {/* Title - large, editable */}
        <div className="flex items-start gap-3 mb-6">
          {/* Checkbox */}
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing || isDone}
            className={cn(
              'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-150',
              completing || isDone
                ? 'border-success bg-success/20'
                : isOverdue
                  ? 'border-danger/60 hover:border-danger hover:bg-danger/10'
                  : 'border-text-muted/30 hover:border-accent hover:bg-accent/10',
            )}
            aria-label={isDone ? 'Task completed' : `Complete "${task.title}"`}
          >
            {(completing || isDone) && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success">
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
                onChange={(e) => {
                  setTitleValue(e.target.value);
                  saveTitleDebounced(e.target.value);
                }}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
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
                onClick={() => {
                  if (!isDone) {
                    setEditingTitle(true);
                    setTimeout(() => titleInputRef.current?.focus(), 0);
                  }
                }}
              >
                {titleValue || task.title}
              </h1>
            )}
          </div>
        </div>

        {/* Properties section */}
        <div className="space-y-3 mb-8">
          {/* Date */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Date
            </span>
            <span className="text-[13px] text-text flex-1 relative">
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
                  onSelect={handleDateSelect}
                  onClose={() => setDatePickerOpen(false)}
                />
              )}
            </span>
          </div>

          {/* Project */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Project
            </span>
            <span className={cn('text-[13px] flex-1', task.projectId ? 'text-text' : 'text-text-muted')}>
              {project?.title ?? (task.projectId ? 'Loading...' : 'No project')}
            </span>
          </div>

          {/* Goal */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              Goal
            </span>
            <span className={cn('text-[13px] flex-1', task.goalId ? 'text-text' : 'text-text-muted')}>
              {goal?.title ?? (task.goalId ? 'Loading...' : 'No goal')}
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Status
            </span>
            <span className="text-[13px] text-text flex-1 flex items-center gap-2">
              <span
                className={cn(
                  'h-2 w-2 rounded-full shrink-0',
                  task.status === 'todo' && 'bg-accent',
                  task.status === 'done' && 'bg-success',
                  task.status === 'dropped' && 'bg-text-muted',
                )}
              />
              <span className="capitalize">{task.status}</span>
            </span>
          </div>

          {/* Created */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Created
            </span>
            <span className="text-[13px] text-text-muted flex-1">
              {createdDate}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/40 my-6" />

        {/* Description textarea */}
        <div>
          <textarea
            ref={notesRef}
            value={notesValue}
            onChange={(e) => {
              setNotesValue(e.target.value);
              saveNotesDebounced(e.target.value);
              autoResizeNotes();
            }}
            onBlur={handleNotesBlur}
            placeholder="Add a description..."
            rows={3}
            className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/40 focus:outline-none resize-none leading-relaxed"
          />
        </div>
      </div>
    </SidePeek>
  );
}
