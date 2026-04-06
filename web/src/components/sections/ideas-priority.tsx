'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { IdeaForm } from '../idea-form';

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

export function IdeasPriority() {
  const ideas = useQuery(api.ideas.list, {});

  if (ideas === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  // Sort by actionability: high -> medium -> low -> unset
  const sorted = [...ideas].sort((a, b) => {
    const aOrder = actionabilityOrder[a.actionability ?? ''] ?? 3;
    const bOrder = actionabilityOrder[b.actionability ?? ''] ?? 3;
    return aOrder - bOrder;
  });

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Ideas by Priority
        </span>
      </div>

      {/* Capture form */}
      <div className="px-6 py-4 border-b border-border">
        <IdeaForm />
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No ideas captured yet</p>
          <p className="text-xs text-text-muted mt-1">Use the form above to add one</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sorted.map((idea, i: number) => {
            const colorClass = actionabilityColors[idea.actionability ?? ''] ?? 'border-text-muted/20 text-text-muted';

            return (
              <div
                key={idea._id}
                className="px-6 py-4 space-y-2"
              >
                <div className="flex items-start gap-4">
                  {/* Index */}
                  <span className="text-xs font-mono text-text-muted mt-0.5 w-8 shrink-0">
                    [{String(i + 1).padStart(2, '0')}]
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text leading-relaxed">
                      {idea.content}
                    </p>
                    {idea.nextStep && (
                      <p className="text-xs text-text-muted mt-1.5">
                        <span className="font-bold uppercase tracking-widest">Next:</span>{' '}
                        {idea.nextStep}
                      </p>
                    )}
                  </div>

                  {/* Actionability badge */}
                  {idea.actionability ? (
                    <span className={`shrink-0 text-xs font-medium uppercase tracking-wide border px-2 py-0.5 ${colorClass}`}>
                      {idea.actionability}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-medium uppercase tracking-wide border border-text-muted/20 text-text-muted/70 px-2 py-0.5">
                      unset
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
