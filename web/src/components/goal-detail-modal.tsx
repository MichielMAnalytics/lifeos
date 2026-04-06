'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { SidePeek } from '@/components/side-peek';

type GoalStatus = 'active' | 'completed' | 'dropped';

const STATUS_OPTIONS: { value: GoalStatus; label: string; color: string; dot: string }[] = [
  { value: 'active', label: 'Active', color: 'text-accent', dot: 'bg-accent' },
  { value: 'completed', label: 'Completed', color: 'text-success', dot: 'bg-success' },
  { value: 'dropped', label: 'Dropped', color: 'text-text-muted', dot: 'bg-text-muted' },
];

const HEALTH_CONFIG: Record<string, { label: string; color: string }> = {
  on_track: { label: 'On Track', color: 'text-success' },
  at_risk: { label: 'At Risk', color: 'text-warning' },
  off_track: { label: 'Off Track', color: 'text-danger' },
  unknown: { label: 'No Data', color: 'text-text-muted' },
};

export function GoalDetailModal({
  goalId,
  onClose,
}: {
  goalId: Id<'goals'>;
  onClose: () => void;
}) {
  const goalDetail = useQuery(api.goals.get, { id: goalId });
  const health = useQuery(api.goals.health, { id: goalId });
  const updateGoal = useMutation(api.goals.update);
  const removeGoal = useMutation(api.goals.remove);
  const completeTask = useMutation(api.tasks.complete);
  const createTask = useMutation(api.tasks.create);

  const [titleValue, setTitleValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [quarterValue, setQuarterValue] = useState('');
  const [targetDateValue, setTargetDateValue] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const initializedRef = useRef(false);

  // Initialize local state from goal data
  useEffect(() => {
    if (goalDetail && !initializedRef.current) {
      setTitleValue(goalDetail.title);
      setDescriptionValue(goalDetail.description ?? '');
      setQuarterValue(goalDetail.quarter ?? '');
      setTargetDateValue(goalDetail.targetDate ?? '');
      initializedRef.current = true;
    }
  }, [goalDetail]);

  // Reset initialized flag when goalId changes
  useEffect(() => {
    initializedRef.current = false;
  }, [goalId]);

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusOpen) return;
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusOpen]);

  // Auto-resize description textarea
  const autoResize = useCallback(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => { autoResize(); }, [descriptionValue, autoResize]);

  const handleTitleBlur = useCallback(async () => {
    setEditingTitle(false);
    if (titleValue.trim() && goalDetail && titleValue.trim() !== goalDetail.title) {
      try {
        await updateGoal({ id: goalId, title: titleValue.trim() });
      } catch (err) {
        console.error('Failed to update goal title:', err);
      }
    }
  }, [titleValue, goalDetail, goalId, updateGoal]);

  const handleDescriptionBlur = useCallback(async () => {
    if (goalDetail && descriptionValue !== (goalDetail.description ?? '')) {
      try {
        await updateGoal({ id: goalId, description: descriptionValue });
      } catch (err) {
        console.error('Failed to update goal description:', err);
      }
    }
  }, [descriptionValue, goalDetail, goalId, updateGoal]);

  const handleStatusSelect = useCallback(async (status: GoalStatus) => {
    setStatusOpen(false);
    try {
      await updateGoal({ id: goalId, status });
    } catch (err) {
      console.error('Failed to update goal status:', err);
    }
  }, [goalId, updateGoal]);

  const handleQuarterBlur = useCallback(async () => {
    if (goalDetail && quarterValue !== (goalDetail.quarter ?? '')) {
      try {
        await updateGoal({ id: goalId, quarter: quarterValue });
      } catch (err) {
        console.error('Failed to update goal quarter:', err);
      }
    }
  }, [quarterValue, goalDetail, goalId, updateGoal]);

  const handleTargetDateSelect = useCallback(async (date: string | null) => {
    setDatePickerOpen(false);
    const newValue = date ?? '';
    setTargetDateValue(newValue);
    try {
      await updateGoal({ id: goalId, targetDate: newValue });
    } catch (err) {
      console.error('Failed to update goal target date:', err);
    }
  }, [goalId, updateGoal]);

  const handleCompleteTask = useCallback(async (taskId: Id<'tasks'>) => {
    try {
      await completeTask({ id: taskId });
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  }, [completeTask]);

  const handleAddTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await createTask({ title: newTaskTitle.trim(), goalId });
      setNewTaskTitle('');
      setAddingTask(false);
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  }, [createTask, newTaskTitle, goalId]);

  const handleDelete = useCallback(async () => {
    try {
      await removeGoal({ id: goalId });
      onClose();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  }, [removeGoal, goalId, onClose]);

  if (!goalDetail) {
    return (
      <SidePeek open={true} onClose={onClose} title="Goal">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </SidePeek>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((o) => o.value === goalDetail.status) ?? STATUS_OPTIONS[0];
  const healthInfo = HEALTH_CONFIG[health?.status ?? 'unknown'];
  const createdDate = new Date(goalDetail._creationTime).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SidePeek open={true} onClose={onClose} title="Goal">
      <div className="px-8 py-6">
        {/* Title - large, editable */}
        <div className="mb-6">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-full bg-transparent text-2xl font-bold text-text focus:outline-none"
              autoFocus
            />
          ) : (
            <h1
              className="text-2xl font-bold text-text cursor-text hover:text-accent/80 transition-colors"
              onClick={() => {
                setEditingTitle(true);
                setTimeout(() => titleInputRef.current?.focus(), 0);
              }}
            >
              {titleValue || goalDetail.title}
            </h1>
          )}
        </div>

        {/* Properties section */}
        <div className="space-y-3 mb-8">
          {/* Status */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Status
            </span>
            <span className="text-[13px] text-text flex-1 relative" ref={statusRef}>
              <button
                type="button"
                onClick={() => setStatusOpen((prev) => !prev)}
                className="flex items-center gap-2 hover:bg-surface-hover px-2 py-0.5 -mx-2 rounded transition-colors"
              >
                <span className={cn('h-2 w-2 rounded-full shrink-0', currentStatus.dot)} />
                <span className={currentStatus.color}>{currentStatus.label}</span>
              </button>
              {statusOpen && (
                <div className="absolute z-50 top-full left-0 mt-1 w-40 border border-border bg-surface rounded-lg shadow-xl overflow-hidden">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleStatusSelect(opt.value)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs transition-colors hover:bg-surface-hover flex items-center gap-2',
                        goalDetail.status === opt.value && 'bg-accent/10 font-medium',
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full shrink-0', opt.dot)} />
                      <span className={opt.color}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </span>
          </div>

          {/* Quarter */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Quarter
            </span>
            <span className="text-[13px] text-text flex-1">
              <input
                type="text"
                value={quarterValue}
                onChange={(e) => setQuarterValue(e.target.value)}
                onBlur={handleQuarterBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="e.g. 2026-Q1"
                className="w-full bg-transparent text-[13px] text-text placeholder:text-text-muted/70 focus:outline-none hover:bg-surface-hover focus:bg-surface-hover px-2 py-0.5 -mx-2 rounded transition-colors"
              />
            </span>
          </div>

          {/* Target Date */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Target Date
            </span>
            <span className="text-[13px] text-text flex-1 relative">
              <button
                type="button"
                onClick={() => setDatePickerOpen((prev) => !prev)}
                className={cn(
                  'text-left hover:bg-surface-hover px-2 py-0.5 -mx-2 rounded transition-colors',
                  targetDateValue ? 'text-text' : 'text-text-muted',
                )}
              >
                {targetDateValue
                  ? new Date(targetDateValue + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'No date'}
              </button>
              {datePickerOpen && (
                <CalendarDatePicker
                  currentDate={targetDateValue || undefined}
                  onSelect={handleTargetDateSelect}
                  onClose={() => setDatePickerOpen(false)}
                />
              )}
            </span>
          </div>

          {/* Health */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              Health
            </span>
            <span className="text-[13px] text-text flex-1">
              {health ? (
                <span className="flex items-center gap-2">
                  <span className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    health.status === 'on_track' && 'bg-success',
                    health.status === 'at_risk' && 'bg-warning',
                    health.status === 'off_track' && 'bg-danger',
                    health.status === 'unknown' && 'bg-text-muted',
                  )} />
                  <span className={healthInfo.color}>{healthInfo.label}</span>
                  <span className="text-xs text-text-muted ml-auto">
                    {health.doneTasks}/{health.totalTasks} tasks
                  </span>
                </span>
              ) : (
                <span className="text-text-muted">Loading...</span>
              )}
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
        <div className="mb-8">
          <textarea
            ref={descriptionRef}
            value={descriptionValue}
            onChange={(e) => {
              setDescriptionValue(e.target.value);
              autoResize();
            }}
            onBlur={handleDescriptionBlur}
            placeholder="Add a description..."
            rows={3}
            className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/70 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Linked Tasks */}
        <div className="space-y-2 mb-8">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              Linked Tasks ({goalDetail.tasks.length})
            </span>
            <button
              type="button"
              onClick={() => {
                setAddingTask(true);
                setTimeout(() => newTaskInputRef.current?.focus(), 0);
              }}
              className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
            >
              + Add task
            </button>
          </div>

          {/* Add task inline */}
          {addingTask && (
            <div className="flex items-center gap-2">
              <input
                ref={newTaskInputRef}
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTask();
                  }
                  if (e.key === 'Escape') {
                    setAddingTask(false);
                    setNewTaskTitle('');
                  }
                }}
                placeholder="Task title..."
                className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted/70 focus:outline-none border-b border-border focus:border-accent transition-colors py-1"
              />
              <button
                type="button"
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="text-xs font-medium text-accent hover:text-accent-hover disabled:opacity-40 transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAddingTask(false); setNewTaskTitle(''); }}
                className="text-xs text-text-muted hover:text-text transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {goalDetail.tasks.length === 0 && !addingTask ? (
            <p className="text-xs text-text-muted italic">No linked tasks</p>
          ) : (
            <div className="space-y-0.5">
              {/* Todo tasks first */}
              {goalDetail.tasks
                .filter((t) => t.status === 'todo')
                .map((task) => (
                  <div
                    key={task._id}
                    className="flex items-center gap-2 text-sm py-1.5 group/task"
                  >
                    <button
                      type="button"
                      onClick={() => handleCompleteTask(task._id)}
                      className="h-4 w-4 rounded border border-border hover:border-accent shrink-0 transition-colors flex items-center justify-center group-hover/task:border-accent/60"
                      aria-label="Complete task"
                    />
                    <span className="flex-1 min-w-0 truncate text-text">
                      {task.title}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-text-muted ml-auto font-mono shrink-0">
                        {task.dueDate}
                      </span>
                    )}
                  </div>
                ))}
              {/* Done tasks */}
              {goalDetail.tasks
                .filter((t) => t.status === 'done')
                .map((task) => (
                  <div
                    key={task._id}
                    className="flex items-center gap-2 text-sm py-1.5"
                  >
                    <div className="h-4 w-4 rounded border border-success/40 bg-success/20 shrink-0 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="flex-1 min-w-0 truncate text-text-muted line-through">
                      {task.title}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-text-muted ml-auto font-mono shrink-0">
                        {task.dueDate}
                      </span>
                    )}
                  </div>
                ))}
              {/* Dropped tasks */}
              {goalDetail.tasks
                .filter((t) => t.status === 'dropped')
                .map((task) => (
                  <div
                    key={task._id}
                    className="flex items-center gap-2 text-sm py-1.5"
                  >
                    <div className="h-4 w-4 rounded border border-text-muted/30 bg-text-muted/10 shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-text-muted line-through">
                      {task.title}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="border-t border-border/40 pt-4">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full text-center text-xs text-text-muted hover:text-danger py-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              Delete goal
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 text-xs font-medium text-danger bg-danger/10 hover:bg-danger/20 py-1.5 rounded-lg transition-colors"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-text-muted hover:text-text py-1.5 px-3 rounded-lg hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </SidePeek>
  );
}
