'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import Link from 'next/link';

const actionabilityOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const actionabilityColors: Record<string, string> = {
  high: 'border-success/60 text-success',
  medium: 'border-warning/60 text-warning',
  low: 'border-text-muted/40 text-text-muted',
};

export function IdeasPipeline() {
  const ideas = useQuery(api.ideas.list, {});

  if (ideas === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  // Sort by actionability: high first, then medium, then low, then undefined
  const sorted = [...ideas].sort((a, b) => {
    const aOrder = actionabilityOrder[a.actionability ?? ''] ?? 3;
    const bOrder = actionabilityOrder[b.actionability ?? ''] ?? 3;
    return aOrder - bOrder;
  });

  const top5 = sorted.slice(0, 5);

  return (
    <div className="border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
          Ideas Pipeline
        </h2>
        <Link
          href="/ideas"
          className="text-xs text-text-muted hover:text-text transition-colors"
        >
          View all
        </Link>
      </div>
      {top5.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No ideas captured yet</p>
          <p className="text-xs text-text-muted/60 mt-1">Use quick capture to add one</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {top5.map((idea, i: number) => {
            const colorClass = actionabilityColors[idea.actionability ?? ''] ?? 'border-text-muted/20 text-text-muted';
            return (
              <div
                key={idea._id}
                className="group flex items-center gap-4 px-6 py-4"
              >
                <span className="text-xs font-mono text-text-muted w-6 shrink-0">
                  [{String(i + 1).padStart(2, '0')}]
                </span>
                <span className="flex-1 text-sm text-text truncate">
                  {idea.content}
                </span>
                {idea.actionability && (
                  <span className={`shrink-0 text-xs font-medium uppercase tracking-wide border px-2 py-0.5 ${colorClass}`}>
                    {idea.actionability}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
