'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';
import { IdeaForm } from '@/components/idea-form';
import type { Doc } from '../../../../../convex/_generated/dataModel';

// ── Types ────────────────────────────────────────────

type Idea = Doc<'ideas'>;
type ActionabilityLevel = 'high' | 'medium' | 'low';

const ACTIONABILITY_LEVELS: ActionabilityLevel[] = ['high', 'medium', 'low'];

const ACTIONABILITY_CONFIG: Record<ActionabilityLevel, { label: string; color: string }> = {
  high: { label: 'High', color: 'text-success' },
  medium: { label: 'Medium', color: 'text-warning' },
  low: { label: 'Low', color: 'text-text-muted' },
};

function getActionabilityDisplay(level: string | undefined): { label: string; color: string } {
  if (level && level in ACTIONABILITY_CONFIG) {
    return ACTIONABILITY_CONFIG[level as ActionabilityLevel];
  }
  return { label: 'Unset', color: 'text-text-muted' };
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '...';
}

function creationDateStr(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

// ── Actionability Dropdown ───────────────────────────

interface ActionabilityDropdownProps {
  current: string | undefined;
  onSelect: (level: ActionabilityLevel) => void;
  onClose: () => void;
}

function ActionabilityDropdown({ current, onSelect, onClose }: ActionabilityDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full right-0 mt-1 w-28 border border-border bg-bg shadow-lg p-1"
    >
      {ACTIONABILITY_LEVELS.map((level) => {
        const config = ACTIONABILITY_CONFIG[level];
        const isActive = current === level;
        return (
          <button
            key={level}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(level);
            }}
            className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
              isActive ? 'bg-accent/10 font-medium' : 'hover:bg-surface-hover'
            } ${config.color}`}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Idea Row ─────────────────────────────────────────

interface IdeaRowProps {
  idea: Idea;
  index: number;
}

function IdeaRow({ idea, index }: IdeaRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const updateIdea = useMutation(api.ideas.update);

  const handleActionabilityChange = useCallback(async (level: ActionabilityLevel) => {
    setDropdownOpen(false);
    try {
      await updateIdea({ id: idea._id, actionability: level });
    } catch (err) {
      console.error('Failed to update idea actionability:', err);
    }
  }, [updateIdea, idea._id]);

  const display = getActionabilityDisplay(idea.actionability);
  const createdDate = creationDateStr(idea._creationTime);
  const nextStep = idea.nextStep ?? null;
  const contentPreview = truncate(idea.content, 60);
  const hasMoreContent = idea.content.length > 60 || nextStep;

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Main row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-hover cursor-pointer group"
      >
        {/* Index */}
        <span className="text-xs font-mono text-text-muted w-8 shrink-0">
          [{String(index).padStart(2, '0')}]
        </span>

        {/* Content preview */}
        <span className="flex-1 text-sm text-text truncate min-w-0">
          {contentPreview}
        </span>

        {/* Actionability badge - clickable */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen((prev) => !prev);
            }}
            className={`text-xs font-medium px-2 py-0.5 rounded border border-border hover:border-text-muted/40 transition-colors ${display.color}`}
          >
            {display.label}
          </button>
          {dropdownOpen && (
            <ActionabilityDropdown
              current={idea.actionability}
              onSelect={handleActionabilityChange}
              onClose={() => setDropdownOpen(false)}
            />
          )}
        </div>

        {/* Date */}
        <span className="text-xs text-text-muted font-mono shrink-0 w-16 text-right">
          {formatDate(createdDate)}
        </span>

        {/* Expand indicator */}
        {hasMoreContent && (
          <span className={`text-xs text-text-muted transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}>
            &rsaquo;
          </span>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-4 pl-[calc(2rem+2.25rem)]">
          <div className="border-l-2 border-border pl-4 space-y-2">
            {/* Full content */}
            <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
              {idea.content}
            </p>

            {/* Next step */}
            {nextStep && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-text-muted">
                  <span className="font-bold text-text uppercase tracking-wide">Next:</span>{' '}
                  {nextStep}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────

export function IdeasGrid() {
  const ideas = useQuery(api.ideas.list, {});

  if (!ideas) return <div className="text-text-muted">Loading...</div>;

  // Sort by creation time descending (newest first)
  const sorted = [...ideas].sort((a, b) => b._creationTime - a._creationTime);

  return (
    <div className="max-w-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-text">
          Ideas{' '}
          <span className="text-text-muted font-normal">[ {ideas.length} ]</span>
        </h1>
      </div>

      {/* Quick Add */}
      <div className="border border-border p-5">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
          Quick Add
        </p>
        <IdeaForm />
      </div>

      {/* Ideas Table */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-text">No ideas yet</p>
          <p className="text-sm text-text-muted mt-1">
            Capture one above to get started.
          </p>
        </div>
      ) : (
        <div className="border border-border">
          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border bg-surface text-xs font-bold uppercase tracking-widest text-text-muted">
            <span className="w-8 shrink-0">#</span>
            <span className="flex-1">Content</span>
            <span className="shrink-0 w-20 text-center">Potential</span>
            <span className="shrink-0 w-16 text-right">Date</span>
            <span className="shrink-0 w-3" />
          </div>

          {/* Rows */}
          {sorted.map((idea, idx) => (
            <IdeaRow key={idea._id} idea={idea} index={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
