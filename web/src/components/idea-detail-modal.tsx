'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc, Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

type ActionabilityLevel = 'high' | 'medium' | 'low';

const ACTIONABILITY_OPTIONS: { value: ActionabilityLevel; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'text-success' },
  { value: 'medium', label: 'Medium', color: 'text-warning' },
  { value: 'low', label: 'Low', color: 'text-text-muted' },
];

export function IdeaDetailModal({
  idea,
  allIdeas,
  onClose,
  onSelectIdea,
}: {
  idea: Doc<'ideas'>;
  allIdeas?: Doc<'ideas'>[];
  onClose: () => void;
  onSelectIdea?: (id: Id<'ideas'>) => void;
}) {
  const updateIdea = useMutation(api.ideas.update);
  const removeIdea = useMutation(api.ideas.remove);
  const promoteIdea = useMutation(api.ideas.promote);

  const [contentValue, setContentValue] = useState(idea.content);
  const [nextStepValue, setNextStepValue] = useState(idea.nextStep ?? '');
  const [actionability, setActionability] = useState(idea.actionability);
  const [actionabilityOpen, setActionabilityOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteTitle, setPromoteTitle] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [promotedProjectId, setPromotedProjectId] = useState<Id<'projects'> | null>(
    idea.projectId ?? null,
  );

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const actionabilityRef = useRef<HTMLDivElement>(null);

  // Sync state if idea changes from outside
  useEffect(() => {
    setContentValue(idea.content);
    setNextStepValue(idea.nextStep ?? '');
    setActionability(idea.actionability);
  }, [idea.content, idea.nextStep, idea.actionability]);

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

  // Close actionability dropdown on outside click
  useEffect(() => {
    if (!actionabilityOpen) return;
    function handleClick(e: MouseEvent) {
      if (actionabilityRef.current && !actionabilityRef.current.contains(e.target as Node)) {
        setActionabilityOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [actionabilityOpen]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.height = 'auto';
      contentRef.current.style.height = `${contentRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => { autoResize(); }, [contentValue, autoResize]);

  const handleContentBlur = useCallback(async () => {
    if (contentValue.trim() && contentValue !== idea.content) {
      try {
        await updateIdea({ id: idea._id, content: contentValue.trim() });
      } catch (err) {
        console.error('Failed to update idea content:', err);
      }
    }
  }, [contentValue, idea.content, idea._id, updateIdea]);

  const handleNextStepBlur = useCallback(async () => {
    if (nextStepValue !== (idea.nextStep ?? '')) {
      try {
        await updateIdea({ id: idea._id, nextStep: nextStepValue });
      } catch (err) {
        console.error('Failed to update idea next step:', err);
      }
    }
  }, [nextStepValue, idea.nextStep, idea._id, updateIdea]);

  const handleActionabilitySelect = useCallback(async (level: ActionabilityLevel) => {
    setActionability(level);
    setActionabilityOpen(false);
    try {
      await updateIdea({ id: idea._id, actionability: level });
    } catch (err) {
      console.error('Failed to update idea actionability:', err);
    }
  }, [idea._id, updateIdea]);

  const handleDelete = useCallback(async () => {
    try {
      await removeIdea({ id: idea._id });
      onClose();
    } catch (err) {
      console.error('Failed to delete idea:', err);
    }
  }, [removeIdea, idea._id, onClose]);

  const handlePromote = useCallback(async () => {
    if (!promoteTitle.trim()) return;
    setPromoting(true);
    try {
      const result = await promoteIdea({ id: idea._id, projectTitle: promoteTitle.trim() });
      if (result?.project?._id) {
        setPromotedProjectId(result.project._id);
      }
      setPromoteOpen(false);
      setPromoteTitle('');
    } catch (err) {
      console.error('Failed to promote idea:', err);
    } finally {
      setPromoting(false);
    }
  }, [promoteIdea, idea._id, promoteTitle]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const createdDate = new Date(idea._creationTime).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const currentActionability = ACTIONABILITY_OPTIONS.find((o) => o.value === actionability);

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
          {/* Left panel -- content */}
          <div className="flex-[3] p-6 overflow-y-auto">
            <textarea
              ref={contentRef}
              value={contentValue}
              onChange={(e) => {
                setContentValue(e.target.value);
                autoResize();
              }}
              onBlur={handleContentBlur}
              placeholder="Add content..."
              rows={4}
              className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/40 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Right panel -- metadata */}
          <div className="flex-[2] border-l border-border bg-bg-subtle p-5 overflow-y-auto space-y-4">
            {/* Actionability */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Actionability</span>
              <div className="relative" ref={actionabilityRef}>
                <button
                  type="button"
                  onClick={() => setActionabilityOpen((prev) => !prev)}
                  className="flex items-center gap-2 w-full text-left text-sm rounded-lg px-2.5 py-2 hover:bg-surface-hover transition-colors"
                >
                  <span className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    currentActionability?.value === 'high' && 'bg-success',
                    currentActionability?.value === 'medium' && 'bg-warning',
                    currentActionability?.value === 'low' && 'bg-text-muted',
                    !currentActionability && 'bg-text-muted/30',
                  )} />
                  <span className={currentActionability ? 'text-text' : 'text-text-muted'}>
                    {currentActionability?.label ?? 'Unset'}
                  </span>
                </button>
                {actionabilityOpen && (
                  <div className="absolute z-50 top-full left-0 mt-1 w-full border border-border bg-surface rounded-lg shadow-xl overflow-hidden">
                    {ACTIONABILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleActionabilitySelect(opt.value)}
                        className={cn(
                          'w-full text-left px-3 py-2 text-xs transition-colors hover:bg-surface-hover flex items-center gap-2',
                          actionability === opt.value && 'bg-accent/10 font-medium',
                        )}
                      >
                        <span className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          opt.value === 'high' && 'bg-success',
                          opt.value === 'medium' && 'bg-warning',
                          opt.value === 'low' && 'bg-text-muted',
                        )} />
                        <span className={opt.color}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Next Step */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Next Step</span>
              <input
                type="text"
                value={nextStepValue}
                onChange={(e) => setNextStepValue(e.target.value)}
                onBlur={handleNextStepBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Define next step..."
                className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/40 focus:outline-none px-2.5 py-2 rounded-lg hover:bg-surface-hover focus:bg-surface-hover transition-colors"
              />
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

            {/* Promote to Project */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              {promotedProjectId ? (
                <div className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-lg bg-success/5 border border-success/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-xs text-success">Promoted to project</span>
                </div>
              ) : !promoteOpen ? (
                <button
                  type="button"
                  onClick={() => setPromoteOpen(true)}
                  className="w-full text-center text-xs font-medium text-accent hover:text-accent-hover py-2 rounded-lg hover:bg-accent/10 transition-colors"
                >
                  Promote to Project
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={promoteTitle}
                    onChange={(e) => setPromoteTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePromote();
                      }
                    }}
                    placeholder="Project title..."
                    autoFocus
                    className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/40 focus:outline-none px-2.5 py-2 rounded-lg border border-border focus:border-accent transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handlePromote}
                      disabled={promoting || !promoteTitle.trim()}
                      className="flex-1 text-xs font-medium text-bg bg-accent hover:bg-accent-hover disabled:opacity-50 py-1.5 rounded-lg transition-colors"
                    >
                      {promoting ? 'Creating...' : 'Create Project'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPromoteOpen(false); setPromoteTitle(''); }}
                      className="text-xs text-text-muted hover:text-text py-1.5 px-3 rounded-lg hover:bg-surface-hover transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Related Ideas */}
            {allIdeas && allIdeas.length > 0 && (() => {
              const related = allIdeas.filter(
                (i) => i._id !== idea._id && i.actionability === idea.actionability,
              );
              if (related.length === 0) return null;
              return (
                <div className="pt-2 border-t border-border/40 space-y-1.5">
                  <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                    Related Ideas ({related.length})
                  </span>
                  <div className="space-y-1">
                    {related.slice(0, 5).map((relatedIdea) => (
                      <button
                        key={relatedIdea._id}
                        type="button"
                        onClick={() => onSelectIdea?.(relatedIdea._id)}
                        className="w-full text-left text-xs text-text-muted hover:text-text py-1.5 px-2.5 rounded-lg hover:bg-surface-hover transition-colors truncate block"
                      >
                        {relatedIdea.content.length > 60
                          ? `${relatedIdea.content.slice(0, 60)}...`
                          : relatedIdea.content}
                      </button>
                    ))}
                    {related.length > 5 && (
                      <span className="text-[10px] text-text-muted/60 px-2.5">
                        +{related.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Delete */}
            <div className="pt-2 border-t border-border/40">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-center text-xs text-text-muted hover:text-danger py-2 rounded-lg hover:bg-surface-hover transition-colors"
                >
                  Delete idea
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
