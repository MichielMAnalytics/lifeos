'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { SidePeek } from '@/components/side-peek';
import { ImpactFilterWizard, ImpactFilterView } from '@/components/impact-filter-wizard';

type ProjectStatus = 'active' | 'completed' | 'archived';

const STATUS_OPTIONS: { value: ProjectStatus; label: string; color: string; dot: string }[] = [
  { value: 'active', label: 'Active', color: 'text-success', dot: 'bg-success' },
  { value: 'completed', label: 'Completed', color: 'text-accent', dot: 'bg-accent' },
  { value: 'archived', label: 'Archived', color: 'text-text-muted', dot: 'bg-text-muted' },
];

export function ProjectDetailModal({
  projectId,
  onClose,
}: {
  projectId: Id<'projects'>;
  onClose: () => void;
}) {
  const projectDetail = useQuery(api.projects.get, { id: projectId });
  const updateProject = useMutation(api.projects.update);
  const removeProject = useMutation(api.projects.remove);
  const clearImpactFilter = useMutation(api.projects.clearImpactFilter);
  const createTask = useMutation(api.tasks.create);
  const completeTask = useMutation(api.tasks.complete);

  const [titleValue, setTitleValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [impactFilterMode, setImpactFilterMode] = useState<'view' | 'wizard'>('view');

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // Initialize local state from project data
  useEffect(() => {
    if (projectDetail && !initializedRef.current) {
      setTitleValue(projectDetail.title);
      setDescriptionValue(projectDetail.description ?? '');
      initializedRef.current = true;
    }
  }, [projectDetail]);

  // Reset initialized flag when projectId changes
  useEffect(() => {
    initializedRef.current = false;
  }, [projectId]);

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

  // Focus new task input when addingTask becomes true
  useEffect(() => {
    if (addingTask) {
      setTimeout(() => newTaskInputRef.current?.focus(), 0);
    }
  }, [addingTask]);

  const handleTitleBlur = useCallback(async () => {
    setEditingTitle(false);
    if (titleValue.trim() && projectDetail && titleValue.trim() !== projectDetail.title) {
      try {
        await updateProject({ id: projectId, title: titleValue.trim() });
      } catch (err) {
        console.error('Failed to update project title:', err);
      }
    }
  }, [titleValue, projectDetail, projectId, updateProject]);

  const handleDescriptionBlur = useCallback(async () => {
    if (projectDetail && descriptionValue !== (projectDetail.description ?? '')) {
      try {
        await updateProject({ id: projectId, description: descriptionValue });
      } catch (err) {
        console.error('Failed to update project description:', err);
      }
    }
  }, [descriptionValue, projectDetail, projectId, updateProject]);

  const handleStatusSelect = useCallback(async (status: ProjectStatus) => {
    setStatusOpen(false);
    try {
      await updateProject({ id: projectId, status });
    } catch (err) {
      console.error('Failed to update project status:', err);
    }
  }, [projectId, updateProject]);

  const handleDelete = useCallback(async () => {
    try {
      await removeProject({ id: projectId });
      onClose();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }, [removeProject, projectId, onClose]);

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
      await createTask({ title: newTaskTitle.trim(), projectId });
      setNewTaskTitle('');
      setAddingTask(false);
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  }, [createTask, newTaskTitle, projectId]);

  if (!projectDetail) {
    return (
      <SidePeek open={true} onClose={onClose} title="Project">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </SidePeek>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((o) => o.value === projectDetail.status) ?? STATUS_OPTIONS[0];
  const createdDate = new Date(projectDetail._creationTime).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const tasks = projectDetail.tasks ?? [];
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const droppedTasks = tasks.filter((t) => t.status === 'dropped');
  const totalTasks = tasks.length;
  const completedCount = doneTasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <SidePeek open={true} onClose={onClose} title="Project">
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
              {titleValue || projectDetail.title}
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
                        projectDetail.status === opt.value && 'bg-accent/10 font-medium',
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

          {/* Task Progress */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Progress
            </span>
            <span className="text-[13px] text-text flex-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-text">{completedCount}/{totalTasks} tasks</span>
                  <span className="text-xs text-text-muted">{progressPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </span>
          </div>

          {/* Created */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
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

        {/* Impact Filter — wizard takeover OR filled view OR empty CTA */}
        <div className="mb-8">
          {impactFilterMode === 'wizard' ? (
            <ImpactFilterWizard
              projectId={projectId}
              initial={projectDetail.impactFilter}
              onDone={() => setImpactFilterMode('view')}
              onCancel={() => setImpactFilterMode('view')}
            />
          ) : projectDetail.impactFilter ? (
            <ImpactFilterView
              project={projectDetail}
              onEdit={() => setImpactFilterMode('wizard')}
              onClear={async () => {
                try {
                  await clearImpactFilter({ id: projectId });
                } catch (err) {
                  console.error('Failed to clear impact filter:', err);
                }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setImpactFilterMode('wizard')}
              className="w-full text-left border border-dashed border-border/60 rounded-xl px-4 py-3 hover:border-accent/40 hover:bg-accent/5 transition-colors group"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 block">
                    Impact Filter
                  </span>
                  <span className="text-sm text-text-muted group-hover:text-text transition-colors">
                    Run before delegating · 7 questions
                  </span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-accent group-hover:text-accent-hover transition-colors">
                  Run →
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Linked Tasks */}
        <div className="space-y-2 mb-8">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              Linked Tasks ({totalTasks})
            </span>
            <button
              type="button"
              onClick={() => setAddingTask(true)}
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

          {tasks.length === 0 && !addingTask ? (
            <p className="text-xs text-text-muted italic">No linked tasks</p>
          ) : (
            <div className="space-y-0.5">
              {/* Todo tasks first */}
              {todoTasks.map((task) => (
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
              {doneTasks.map((task) => (
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
              {droppedTasks.map((task) => (
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
              Delete project
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
