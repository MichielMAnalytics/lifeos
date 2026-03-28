'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

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

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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

  const handleTargetDateBlur = useCallback(async () => {
    if (goalDetail && targetDateValue !== (goalDetail.targetDate ?? '')) {
      try {
        await updateGoal({ id: goalId, targetDate: targetDateValue });
      } catch (err) {
        console.error('Failed to update goal target date:', err);
      }
    }
  }, [targetDateValue, goalDetail, goalId, updateGoal]);

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

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!goalDetail) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
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

  const currentStatus = STATUS_OPTIONS.find((o) => o.value === goalDetail.status) ?? STATUS_OPTIONS[0];
  const healthInfo = HEALTH_CONFIG[health?.status ?? 'unknown'];
  const createdDate = new Date(goalDetail._creationTime).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
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
          {/* Left panel -- title, description, tasks */}
          <div className="flex-[3] p-6 overflow-y-auto space-y-5">
            {/* Title */}
            <div>
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
                  className="w-full bg-transparent text-lg font-semibold text-text focus:outline-none"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-lg font-semibold text-text cursor-text hover:text-accent/80 transition-colors"
                  onClick={() => {
                    setEditingTitle(true);
                    setTimeout(() => titleInputRef.current?.focus(), 0);
                  }}
                >
                  {titleValue || goalDetail.title}
                </h2>
              )}
            </div>

            {/* Description */}
            <textarea
              ref={descriptionRef}
              value={descriptionValue}
              onChange={(e) => {
                setDescriptionValue(e.target.value);
                autoResize();
              }}
              onBlur={handleDescriptionBlur}
              placeholder="Add description..."
              rows={3}
              className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/40 focus:outline-none resize-none leading-relaxed"
            />

            {/* Linked Tasks */}
            <div className="space-y-2">
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
                    className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted/40 focus:outline-none border-b border-border focus:border-accent transition-colors py-1"
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
                          <span className="text-xs text-text-muted/60 ml-auto font-mono shrink-0">
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
          </div>

          {/* Right panel -- metadata sidebar */}
          <div className="flex-[2] border-l border-border bg-bg-subtle p-5 overflow-y-auto space-y-4">
            {/* Status */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Status</span>
              <div className="relative" ref={statusRef}>
                <button
                  type="button"
                  onClick={() => setStatusOpen((prev) => !prev)}
                  className="flex items-center gap-2 w-full text-left text-sm rounded-lg px-2.5 py-2 hover:bg-surface-hover transition-colors"
                >
                  <span className={cn('h-2 w-2 rounded-full shrink-0', currentStatus.dot)} />
                  <span className={currentStatus.color}>{currentStatus.label}</span>
                </button>
                {statusOpen && (
                  <div className="absolute z-50 top-full left-0 mt-1 w-full border border-border bg-surface rounded-lg shadow-xl overflow-hidden">
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
              </div>
            </div>

            {/* Quarter */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Quarter</span>
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
                className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/40 focus:outline-none px-2.5 py-2 rounded-lg hover:bg-surface-hover focus:bg-surface-hover transition-colors"
              />
            </div>

            {/* Target Date */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Target Date</span>
              <input
                type="date"
                value={targetDateValue}
                onChange={(e) => setTargetDateValue(e.target.value)}
                onBlur={handleTargetDateBlur}
                className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/40 focus:outline-none px-2.5 py-2 rounded-lg hover:bg-surface-hover focus:bg-surface-hover transition-colors [color-scheme:dark]"
              />
            </div>

            {/* Health */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Health</span>
              <div className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg">
                {health ? (
                  <>
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
                  </>
                ) : (
                  <span className="text-text-muted">Loading...</span>
                )}
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

            {/* Delete */}
            <div className="pt-2 border-t border-border/40">
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
        </div>
      </div>
    </div>
  );
}
