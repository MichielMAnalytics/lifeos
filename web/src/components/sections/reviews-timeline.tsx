'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';
import { SidePeek } from '@/components/side-peek';
import type { Doc } from '@/lib/convex-api';

type Review = Doc<'reviews'>;

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

// ── Expanded content view ────────────────────────────

function ReviewContentExpanded({ content }: { content: Record<string, unknown> }) {
  const highlights = content.highlights;
  const challenges = content.challenges;
  const goalUpdates = content.goalUpdates;
  const nextWeekPriorities = content.nextWeekPriorities as Record<string, string> | undefined;
  const summary = content.summary;
  const achievements = content.achievements;
  const whatDidntWork = content.whatDidntWork;
  const nextQuarterGoals = content.nextQuarterGoals;
  const quarterLabel = content.quarterLabel;
  const weeklyReviewCount = content.weeklyReviewCount;
  const completedGoals = content.completedGoals;

  return (
    <div className="space-y-5">
      {/* Quarter label (quarterly reviews) */}
      {typeof quarterLabel === 'string' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">{quarterLabel}</span>
          {typeof weeklyReviewCount === 'number' && (
            <span className="text-xs text-text-muted">
              Based on {weeklyReviewCount} weekly review{weeklyReviewCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Summary (quarterly) */}
      {typeof summary === 'string' && summary.length > 0 && (
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            Summary
          </span>
          <p className="mt-2 text-sm text-text leading-relaxed whitespace-pre-line">{summary}</p>
        </div>
      )}

      {/* Highlights / Achievements */}
      {Array.isArray(highlights) && highlights.length > 0 && (
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            Highlights
          </span>
          <ul className="mt-2 space-y-1.5">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-success">
                  <polyline points="3 7 6 10 11 4" />
                </svg>
                <span className="text-text">{String(h)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(achievements) && achievements.length > 0 && (
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            Achievements
          </span>
          <ul className="mt-2 space-y-1.5">
            {achievements.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-success">
                  <polyline points="3 7 6 10 11 4" />
                </svg>
                <span className="text-text">{String(a)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Challenges */}
      {typeof challenges === 'string' && challenges.length > 0 && (
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            Challenges
          </span>
          <p className="mt-2 text-sm text-text leading-relaxed whitespace-pre-line">{challenges}</p>
        </div>
      )}

      {/* What Didn't Work (quarterly) */}
      {typeof whatDidntWork === 'string' && whatDidntWork.length > 0 && (
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            What Didn&apos;t Work
          </span>
          <p className="mt-2 text-sm text-text leading-relaxed whitespace-pre-line">{whatDidntWork}</p>
        </div>
      )}

      {/* Goal Updates (weekly) */}
      {Array.isArray(goalUpdates) && goalUpdates.length > 0 && (
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            Goal Updates
          </span>
          <div className="mt-2 space-y-2">
            {goalUpdates.map((gu, i) => {
              const update = gu as Record<string, unknown>;
              return (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-text">
                    {String(update.title ?? '')}
                  </span>
                  {typeof update.notes === 'string' && update.notes.length > 0 && (
                    <span className="text-sm text-text-muted pl-4">
                      {String(update.notes)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals (quarterly) */}
      {Array.isArray(completedGoals) && completedGoals.length > 0 && (
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            Goals Completed
          </span>
          <ul className="mt-2 space-y-1.5">
            {completedGoals.map((g, i) => {
              const goal = g as Record<string, unknown>;
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-success">
                    <polyline points="3 7 6 10 11 4" />
                  </svg>
                  <span className="text-text">{String(goal.title ?? '')}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Next Week Priorities */}
      {nextWeekPriorities && (
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            Next Week Priorities
          </span>
          <div className="mt-2 space-y-1.5">
            {nextWeekPriorities.p1 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs font-bold uppercase tracking-wide text-text-muted w-6 shrink-0">P1</span>
                <span className="text-text">{nextWeekPriorities.p1}</span>
              </div>
            )}
            {nextWeekPriorities.p2 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs font-bold uppercase tracking-wide text-text-muted w-6 shrink-0">P2</span>
                <span className="text-text">{nextWeekPriorities.p2}</span>
              </div>
            )}
            {nextWeekPriorities.p3 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs font-bold uppercase tracking-wide text-text-muted w-6 shrink-0">P3</span>
                <span className="text-text">{nextWeekPriorities.p3}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next Quarter Goals */}
      {Array.isArray(nextQuarterGoals) && nextQuarterGoals.length > 0 && (
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            Next Quarter Goals
          </span>
          <ul className="mt-2 space-y-1.5">
            {nextQuarterGoals.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <svg width="14" height="14" viewBox="0 0 14 14" className="mt-0.5 shrink-0 text-text-muted">
                  <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
                <span className="text-text">{String(g)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Review Detail Modal ─────────────────────────────

function ReviewDetailModal({
  review,
  onClose,
}: {
  review: Review;
  onClose: () => void;
}) {
  const content = review.content as Record<string, unknown> | null;
  const typeLabel = reviewTypeLabel[review.reviewType] ?? review.reviewType;

  return (
    <SidePeek open={true} onClose={onClose} title="Review">
      <div className="px-8 py-6">
        {/* Title: Review type + period */}
        <h1 className="text-2xl font-bold text-text mb-6">
          {typeLabel} Review
        </h1>

        {/* Properties section */}
        <div className="space-y-3 mb-8">
          {/* Score */}
          {review.score !== null && review.score !== undefined && (
            <div className="flex items-center gap-3 py-1.5 group">
              <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Score
              </span>
              <span className="text-[13px] text-text flex-1 flex items-baseline gap-1">
                <span className="text-xl font-bold">{review.score}</span>
                <span className="text-xs text-text-muted">/10</span>
              </span>
            </div>
          )}

          {/* Period */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Period
            </span>
            <span className="text-[13px] text-text flex-1">
              {formatDate(review.periodStart)} &mdash; {formatDate(review.periodEnd)}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/40 my-6" />

        {/* Content section */}
        {content ? (
          <ReviewContentExpanded content={content} />
        ) : (
          <p className="text-sm text-text-muted italic text-center py-4">
            No review content available.
          </p>
        )}
      </div>
    </SidePeek>
  );
}

// ── Main component ───────────────────────────────────

export function ReviewsTimeline() {
  const reviews = useQuery(api.reviews.list, {});
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  if (!reviews) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="max-w-none space-y-8">
      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight text-text">
        Reviews
      </h1>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-text">No reviews yet</p>
          <p className="text-sm text-text-muted mt-1">Complete a daily or weekly review to see it here.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {reviews.map((review, idx: number) => {
            const reviewType = review.reviewType;
            const typeLabel = reviewTypeLabel[reviewType] ?? reviewType;
            const content = review.content as Record<string, unknown> | null;
            const highlights = content ? extractHighlights(content) : null;
            const periodStart = review.periodStart;
            const periodEnd = review.periodEnd;

            return (
              <div key={review._id}>
                <button
                  onClick={() => setSelectedReview(review)}
                  className="w-full text-left px-6 py-5 hover:bg-surface-hover transition-colors"
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-text-muted tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
                        {typeLabel}
                      </span>
                      <span className="text-sm text-text">
                        {formatDate(periodStart)} &mdash; {formatDate(periodEnd)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {review.score !== null && review.score !== undefined && (
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-text">{review.score}</span>
                          <span className="text-xs text-text-muted">/10</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content preview */}
                  {highlights && (
                    <p className="text-sm text-text-muted leading-relaxed pl-16">
                      {highlights}
                    </p>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </div>
  );
}
