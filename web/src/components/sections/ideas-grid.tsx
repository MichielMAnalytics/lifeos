'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { IdeaForm } from '@/components/idea-form';
import { IdeaDetailModal } from '@/components/idea-detail-modal';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ────────────────────────────────────────────

type Idea = Doc<'ideas'>;
type ActionabilityLevel = 'high' | 'medium' | 'low';

const COLUMNS: {
  key: ActionabilityLevel;
  label: string;
  accentClass: string;
  borderTopClass: string;
}[] = [
  { key: 'high',   label: 'High',   accentClass: 'text-success',  borderTopClass: 'border-t-success' },
  { key: 'medium', label: 'Medium', accentClass: 'text-warning',  borderTopClass: 'border-t-warning' },
  { key: 'low',    label: 'Low',    accentClass: 'text-text-muted', borderTopClass: 'border-t-text-muted' },
];

// ── Helpers ──────────────────────────────────────────

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function shortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── IdeaCard ─────────────────────────────────────────

function IdeaCard({
  idea,
  borderTopClass,
  onSelect,
}: {
  idea: Idea;
  borderTopClass: string;
  onSelect: (idea: Idea) => void;
}) {
  const markReviewed = useMutation(api.ideas.markReviewed);
  const isReviewed = idea.reviewedAt != null;

  const toggleReviewed = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void markReviewed({ id: idea._id, reviewed: !isReviewed }).catch((err) => {
        console.error('Failed to toggle reviewed:', err);
      });
    },
    [markReviewed, idea._id, isReviewed],
  );

  return (
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
      className={cn(
        'relative bg-bg-subtle border border-border-subtle rounded-lg p-3 mb-2 cursor-pointer transition-all hover:border-border',
        'border-t-2',
        borderTopClass,
        isReviewed && 'opacity-60',
      )}
    >
      {/* Reviewed checkbox in top-right */}
      <button
        type="button"
        onClick={toggleReviewed}
        title={isReviewed ? `Reviewed ${shortDate(idea.reviewedAt!)}` : 'Mark as reviewed'}
        className={cn(
          'absolute top-2 right-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] transition-all',
          isReviewed
            ? 'border-success bg-success text-white'
            : 'border-text-muted/40 hover:border-success',
        )}
      >
        {isReviewed && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Title / content */}
      <div className="text-sm text-text font-medium leading-snug pr-6">
        {idea.content.length > 140 ? idea.content.slice(0, 140).trimEnd() + '…' : idea.content}
      </div>

      {/* Next step */}
      {idea.nextStep && (
        <div className="text-xs text-text-muted mt-2 leading-snug">
          → {idea.nextStep}
        </div>
      )}

      {/* Footer: date + status */}
      <div className="flex items-center justify-between mt-3 text-[10px] text-text-muted/70">
        <span className="tabular-nums">{shortDate(idea._creationTime)} · {formatRelativeDate(idea._creationTime)}</span>
        {isReviewed && (
          <span className="text-success/80 font-medium">Reviewed</span>
        )}
      </div>
    </div>
  );
}

// ── Column ───────────────────────────────────────────

function Column({
  config,
  ideas,
  onSelect,
}: {
  config: typeof COLUMNS[number];
  ideas: Idea[];
  onSelect: (idea: Idea) => void;
}) {
  return (
    <div className="bg-surface/50 rounded-xl p-3 border border-border-subtle min-h-[160px]">
      <div className={cn('flex items-center justify-between mb-3 px-1', config.accentClass)}>
        <span className="text-[10px] font-bold uppercase tracking-wider">{config.label}</span>
        <span className="text-[10px] font-semibold tabular-nums opacity-70">{ideas.length}</span>
      </div>
      {ideas.length === 0 ? (
        <p className="text-[11px] text-text-muted/60 italic px-1 py-2">No ideas</p>
      ) : (
        ideas.map((idea) => (
          <IdeaCard
            key={idea._id}
            idea={idea}
            borderTopClass={config.borderTopClass}
            onSelect={onSelect}
          />
        ))
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────

export function IdeasGrid() {
  const ideas = useQuery(api.ideas.list, {});
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [showReviewed, setShowReviewed] = useState(false);

  const grouped = useMemo(() => {
    const empty: Record<ActionabilityLevel, Idea[]> = { high: [], medium: [], low: [] };
    if (!ideas) return empty;
    for (const idea of ideas) {
      if (!showReviewed && idea.reviewedAt != null) continue;
      const level = (idea.actionability as ActionabilityLevel | undefined) ?? 'low';
      if (level === 'high' || level === 'medium' || level === 'low') {
        empty[level].push(idea);
      } else {
        empty.low.push(idea);
      }
    }
    // Newest first within each column
    for (const k of Object.keys(empty) as ActionabilityLevel[]) {
      empty[k].sort((a, b) => b._creationTime - a._creationTime);
    }
    return empty;
  }, [ideas, showReviewed]);

  if (!ideas) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-surface/50 rounded-xl p-3 border border-border-subtle">
            <Skeleton className="h-3 w-16 mb-3" />
            <Skeleton className="h-20 w-full mb-2 rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const totalVisible = grouped.high.length + grouped.medium.length + grouped.low.length;
  const reviewedHidden = !showReviewed
    ? ideas.filter((i) => i.reviewedAt != null).length
    : 0;

  return (
    <div className="max-w-none space-y-4">
      {/* Header with reviewed toggle and add button */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-text-muted">
          {totalVisible} idea{totalVisible === 1 ? '' : 's'}
          {reviewedHidden > 0 && ` · ${reviewedHidden} reviewed (hidden)`}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReviewed((p) => !p)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-colors',
              showReviewed
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-transparent border-border text-text-muted hover:text-text hover:border-text/40',
            )}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {showReviewed ? 'Showing reviewed' : 'Show reviewed'}
          </button>
          <IdeaForm />
        </div>
      </div>

      {/* 3-column kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {COLUMNS.map((config) => (
          <Column
            key={config.key}
            config={config}
            ideas={grouped[config.key]}
            onSelect={setSelectedIdea}
          />
        ))}
      </div>

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
