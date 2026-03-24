'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';

const reviewTypeLabel: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

function extractHighlights(content: Record<string, unknown>): string | null {
  for (const key of ['highlights', 'summary', 'wins', 'reflection', 'notes']) {
    const val = content[key];
    if (typeof val === 'string' && val.length > 0) {
      return val.length > 200 ? val.slice(0, 200) + '...' : val;
    }
    if (Array.isArray(val) && val.length > 0) {
      return val.slice(0, 3).join(', ');
    }
  }
  return null;
}

export function ReviewsTimeline() {
  const reviews = useQuery(api.reviews.list, {});

  if (!reviews) return <div className="text-text-muted">Loading...</div>;

  return (
    <div className="max-w-none space-y-8">
      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight text-text">
        Reviews <span className="text-text-muted font-normal">[ {reviews.length} ]</span>
      </h1>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-text">No reviews yet</p>
          <p className="text-sm text-text-muted mt-1">Complete a daily or weekly review to see it here.</p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {reviews.map((review, idx: number) => {
            const reviewType = review.reviewType;
            const typeLabel = reviewTypeLabel[reviewType] ?? reviewType;
            const highlights = review.content ? extractHighlights(review.content as Record<string, unknown>) : null;
            const periodStart = review.periodStart;
            const periodEnd = review.periodEnd;

            return (
              <div key={review._id} className="px-6 py-5 hover:bg-surface-hover transition-colors">
                {/* Top row */}
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-text-muted">
                      [{String(idx + 1).padStart(2, '0')}]
                    </span>
                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
                      {typeLabel}
                    </span>
                    <span className="text-sm text-text">
                      {formatDate(periodStart)} &mdash; {formatDate(periodEnd)}
                    </span>
                  </div>
                  {review.score !== null && review.score !== undefined && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-text">{review.score}</span>
                      <span className="text-xs text-text-muted">/10</span>
                    </div>
                  )}
                </div>

                {/* Content preview */}
                {highlights && (
                  <p className="text-sm text-text-muted leading-relaxed pl-16">
                    {highlights}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
