'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc, Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { SidePeek } from '@/components/side-peek';

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

  const createdDate = new Date(idea._creationTime).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const currentActionability = ACTIONABILITY_OPTIONS.find((o) => o.value === actionability);

  return (
    <SidePeek open={true} onClose={onClose} title="Idea">
      <div className="px-8 py-6">
        {/* Content - large, editable textarea as title area */}
        <textarea
          ref={contentRef}
          value={contentValue}
          onChange={(e) => {
            setContentValue(e.target.value);
            autoResize();
          }}
          onBlur={handleContentBlur}
          placeholder="What's your idea?"
          rows={3}
          className="w-full bg-transparent text-2xl font-bold text-text placeholder:text-text-muted/40 focus:outline-none resize-none leading-snug mb-6"
        />

        {/* Properties section */}
        <div className="space-y-3 mb-8">
          {/* Actionability */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Actionability
            </span>
            <span className="text-[13px] text-text flex-1 relative" ref={actionabilityRef}>
              <button
                type="button"
                onClick={() => setActionabilityOpen((prev) => !prev)}
                className="flex items-center gap-2 hover:bg-surface-hover px-2 py-0.5 -mx-2 rounded transition-colors"
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
                <div className="absolute z-50 top-full left-0 mt-1 w-40 border border-border bg-surface rounded-lg shadow-xl overflow-hidden">
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
            </span>
          </div>

          {/* Next Step */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Next Step
            </span>
            <span className="text-[13px] text-text flex-1">
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
                className="w-full bg-transparent text-[13px] text-text placeholder:text-text-muted/40 focus:outline-none hover:bg-surface-hover focus:bg-surface-hover px-2 py-0.5 -mx-2 rounded transition-colors"
              />
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

        {/* Promote to Project */}
        <div className="space-y-3 mb-6">
          {promotedProjectId ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg bg-success/5 border border-success/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-xs text-success">Promoted to project</span>
            </div>
          ) : !promoteOpen ? (
            <button
              type="button"
              onClick={() => setPromoteOpen(true)}
              className="w-full text-center text-xs font-medium text-accent hover:text-accent-hover py-2.5 rounded-lg hover:bg-accent/10 transition-colors border border-border/40"
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
                className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/40 focus:outline-none px-3 py-2 rounded-lg border border-border focus:border-accent transition-colors"
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
            <div className="space-y-2 mb-6">
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
        <div className="border-t border-border/40 pt-4">
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
    </SidePeek>
  );
}
