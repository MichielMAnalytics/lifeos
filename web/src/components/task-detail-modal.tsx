'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { CalendarDatePicker } from '@/components/calendar-date-picker';

// ── Date helpers ───────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Calendar Icon ───────────────────────────────────

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
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

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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

  // Backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!task) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-start pt-[12vh] justify-center bg-black/50"
        onClick={handleBackdropClick}
      >
        <div className="rounded-2xl bg-surface border border-border shadow-2xl max-w-2xl w-full mx-4 p-8 animate-scale-in">
          <div className="flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
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
    <div
      className="fixed inset-0 z-50 flex items-start pt-[12vh] justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-2xl bg-surface border border-border shadow-2xl max-w-2xl w-full mx-4 flex flex-col max-h-[80vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-end px-4 py-3 border-b border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Left panel -- content */}
          <div className="flex-[3] p-6 overflow-y-auto">
            <div className="flex items-start gap-3">
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

              {/* Title */}
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
                      'w-full bg-transparent text-lg font-semibold text-text focus:outline-none',
                      isDone && 'line-through text-text-muted',
                    )}
                    autoFocus
                  />
                ) : (
                  <h2
                    className={cn(
                      'text-lg font-semibold text-text cursor-text hover:text-accent/80 transition-colors',
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
                  </h2>
                )}
              </div>
            </div>

            {/* Notes / Description */}
            <div className="mt-5 pl-8">
              <textarea
                ref={notesRef}
                value={notesValue}
                onChange={(e) => {
                  setNotesValue(e.target.value);
                  saveNotesDebounced(e.target.value);
                  autoResizeNotes();
                }}
                onBlur={handleNotesBlur}
                placeholder="Add notes..."
                rows={3}
                className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/40 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Right panel -- metadata sidebar */}
          <div className="flex-[2] border-l border-border bg-bg-subtle p-5 overflow-y-auto space-y-4">
            {/* Date */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Date</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDatePickerOpen((prev) => !prev)}
                  className={cn(
                    'flex items-center gap-2 w-full text-left text-sm rounded-lg px-2.5 py-2 transition-colors',
                    isOverdue
                      ? 'text-danger hover:bg-danger/10'
                      : dueDate
                        ? 'text-text hover:bg-surface-hover'
                        : 'text-text-muted hover:bg-surface-hover',
                  )}
                >
                  <CalendarIcon className={isOverdue ? 'text-danger' : 'opacity-50'} />
                  <span>{dueDate ? formatDateLabel(dueDate) : 'No date'}</span>
                </button>
                {datePickerOpen && (
                  <CalendarDatePicker
                    currentDate={dueDate ?? undefined}
                    onSelect={handleDateSelect}
                    onClose={() => setDatePickerOpen(false)}
                  />
                )}
              </div>
            </div>

            {/* Project */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Project</span>
              <div className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 shrink-0">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span className={task.projectId ? 'text-text' : 'text-text-muted'}>
                  {project?.title ?? (task.projectId ? 'Loading...' : 'No project')}
                </span>
              </div>
            </div>

            {/* Goal */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Goal</span>
              <div className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                <span className={task.goalId ? 'text-text' : 'text-text-muted'}>
                  {goal?.title ?? (task.goalId ? 'Loading...' : 'No goal')}
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Status</span>
              <div className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    task.status === 'todo' && 'bg-accent',
                    task.status === 'done' && 'bg-success',
                    task.status === 'dropped' && 'bg-text-muted',
                  )}
                />
                <span className="text-text capitalize">{task.status}</span>
              </div>
            </div>

            {/* Created */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Created</span>
              <div className="flex items-center gap-2 px-2.5 py-2 text-sm text-text-muted rounded-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{createdDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
