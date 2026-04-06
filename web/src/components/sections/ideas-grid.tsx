'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';
import { IdeaForm } from '@/components/idea-form';
import { IdeaDetailModal } from '@/components/idea-detail-modal';
import type { Doc } from '@/lib/convex-api';

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
      className="absolute z-50 top-full right-0 mt-1 w-28 border border-border bg-bg shadow-lg p-1 rounded-xl"
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
  onSelect: (idea: Idea) => void;
}

function IdeaRow({ idea, index, onSelect }: IdeaRowProps) {
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
  const contentPreview = truncate(idea.content, 60);

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Main row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(idea)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(idea);
          }
        }}
        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-hover cursor-pointer group"
      >
        {/* Index */}
        <span className="text-xs text-text-muted w-8 shrink-0 tabular-nums">
          {String(index).padStart(2, '0')}
        </span>

        {/* Content preview */}
        <span className="flex-1 text-sm text-text truncate min-w-0">
          {contentPreview}
        </span>

        {/* Actionability badge - clickable */}
        <div className="relative shrink-0 w-20 text-center">
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
        <span className="text-xs text-text-muted shrink-0 w-16 text-right">
          {formatDate(createdDate)}
        </span>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────

export function IdeasGrid() {
  const ideas = useQuery(api.ideas.list, {});
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  if (!ideas) return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 rounded-xl bg-surface animate-pulse" />
      ))}
    </div>
  );

  // Sort by creation time descending (newest first)
  const sorted = [...ideas].sort((a, b) => b._creationTime - a._creationTime);

  return (
    <div className="max-w-none space-y-6">
      {/* Ideas Table */}
      {sorted.length === 0 ? (
        <div className="space-y-4">
          <div className="border border-dashed border-border/50 rounded-xl overflow-hidden">
            {[
              { content: 'What if we could automate the weekly review...', level: 'High' },
              { content: 'A better way to track daily wins and progress', level: 'Medium' },
              { content: 'Explore integrating with calendar for reminders', level: 'Low' },
            ].map((ghost, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 px-5 py-3.5 opacity-40 border-b border-border/30 last:border-b-0"
              >
                <span className="text-xs font-mono text-text-muted w-8 shrink-0">
                  [{String(idx + 1).padStart(2, '0')}]
                </span>
                <span className="flex-1 text-sm text-text-muted italic truncate min-w-0">
                  {ghost.content}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded border border-border/50 text-text-muted shrink-0">
                  {ghost.level}
                </span>
                <span className="text-xs text-text-muted shrink-0 w-16 text-right">
                  Today
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-text-muted/70">
            Capture your first idea
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border bg-surface text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
            <span className="w-8 shrink-0">#</span>
            <span className="flex-1">Content</span>
            <span className="shrink-0 w-20 text-center">Potential</span>
            <span className="shrink-0 w-16 text-right">Date</span>
            <span className="shrink-0 w-3" />
          </div>

          {/* Rows */}
          {sorted.map((idea, idx) => (
            <IdeaRow key={idea._id} idea={idea} index={idx + 1} onSelect={setSelectedIdea} />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          allIdeas={ideas ?? []}
          onClose={() => setSelectedIdea(null)}
          onSelectIdea={(id) => {
            const found = ideas?.find((i) => i._id === id);
            if (found) setSelectedIdea(found);
          }}
        />
      )}
    </div>
  );
}
