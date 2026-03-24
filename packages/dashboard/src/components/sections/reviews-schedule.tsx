'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';

// ── Date helpers ─────────────────────────────────────

function getNextSunday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilSunday);
  return next;
}

function getWeekStartForSunday(sunday: Date): Date {
  const monday = new Date(sunday);
  monday.setDate(sunday.getDate() - 6);
  return monday;
}

function getQuarterEnd(): { date: Date; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  let endMonth: number;
  let quarterLabel: string;
  if (month < 3) {
    endMonth = 2;
    quarterLabel = `Q1 ${year}`;
  } else if (month < 6) {
    endMonth = 5;
    quarterLabel = `Q2 ${year}`;
  } else if (month < 9) {
    endMonth = 8;
    quarterLabel = `Q3 ${year}`;
  } else {
    endMonth = 11;
    quarterLabel = `Q4 ${year}`;
  }
  const lastDay = new Date(year, endMonth + 1, 0);
  return { date: lastDay, label: quarterLabel };
}

function getQuarterStart(): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let startMonth: number;
  if (month < 3) startMonth = 0;
  else if (month < 6) startMonth = 3;
  else if (month < 9) startMonth = 6;
  else startMonth = 9;
  return new Date(year, startMonth, 1);
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const sStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const eStr = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${sStr} \u2013 ${eStr}`;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Types ────────────────────────────────────────────

type ReviewFormType = 'weekly' | 'quarterly' | null;

interface ReviewsScheduleProps {
  onStartReview?: (type: ReviewFormType) => void;
}

// ── Component ────────────────────────────────────────

export function ReviewsSchedule({ onStartReview }: ReviewsScheduleProps = {}) {
  const reviews = useQuery(api.reviews.list, {});
  const [activeForm, setActiveForm] = useState<ReviewFormType>(null);

  if (!reviews) {
    return (
      <div className="border border-border p-6">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide mb-4">
          Review Schedule
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-surface rounded" />
          <div className="h-10 bg-surface rounded" />
        </div>
      </div>
    );
  }

  const nextSunday = getNextSunday();
  const weekStart = getWeekStartForSunday(nextSunday);
  const quarterEnd = getQuarterEnd();
  const quarterStart = getQuarterStart();

  // Check if we already have a weekly review covering this coming period
  const weekStartStr = toDateStr(weekStart);
  const weekEndStr = toDateStr(nextSunday);
  const hasCurrentWeeklyReview = reviews.some(
    (r) => r.reviewType === 'weekly' && r.periodStart === weekStartStr && r.periodEnd === weekEndStr,
  );

  // Check if we already have a quarterly review for this quarter
  const qStartStr = toDateStr(quarterStart);
  const qEndStr = toDateStr(quarterEnd.date);
  const hasCurrentQuarterlyReview = reviews.some(
    (r) => r.reviewType === 'quarterly' && r.periodStart === qStartStr && r.periodEnd === qEndStr,
  );

  const completedReviews = reviews.slice(0, 6); // show latest 6

  function handleStart(type: 'weekly' | 'quarterly') {
    if (onStartReview) {
      onStartReview(type);
    }
    setActiveForm(type);
  }

  // Notify parent when form is in view
  const _ = activeForm; // used by internal state only

  return (
    <div className="border border-border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Review Schedule
        </h2>
      </div>

      {/* Upcoming */}
      <div className="px-6 py-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Upcoming
        </span>
        <div className="mt-3 space-y-2">
          {/* Weekly review */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3 min-w-0">
              {hasCurrentWeeklyReview ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success">
                  <polyline points="3 7 6 10 11 4" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-text-muted">
                  <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
              )}
              <span className="text-sm font-medium text-text">Weekly Review</span>
              <span className="text-xs text-text-muted">
                Due: {formatDateShort(nextSunday)}
              </span>
            </div>
            {!hasCurrentWeeklyReview && (
              <button
                onClick={() => handleStart('weekly')}
                className="text-xs font-bold uppercase tracking-wide text-accent hover:text-accent-hover transition-colors px-3 py-1 border border-accent/30 hover:border-accent/60"
              >
                Start
              </button>
            )}
          </div>

          {/* Quarterly review */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3 min-w-0">
              {hasCurrentQuarterlyReview ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success">
                  <polyline points="3 7 6 10 11 4" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-text-muted">
                  <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
              )}
              <span className="text-sm font-medium text-text">Quarterly Review</span>
              <span className="text-xs text-text-muted">
                Due: {quarterEnd.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({quarterEnd.label} end)
              </span>
            </div>
            {!hasCurrentQuarterlyReview && (
              <button
                onClick={() => handleStart('quarterly')}
                className="text-xs font-bold uppercase tracking-wide text-accent hover:text-accent-hover transition-colors px-3 py-1 border border-accent/30 hover:border-accent/60"
              >
                Start
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Completed */}
      {completedReviews.length > 0 && (
        <div className="px-6 py-4 border-t border-border">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Completed
          </span>
          <div className="mt-3 space-y-1">
            {completedReviews.map((review) => {
              const typeLabel = review.reviewType === 'weekly' ? 'Weekly Review' :
                review.reviewType === 'quarterly' ? 'Quarterly Review' :
                review.reviewType === 'daily' ? 'Daily Review' :
                review.reviewType === 'monthly' ? 'Monthly Review' :
                review.reviewType;

              return (
                <div
                  key={review._id}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success">
                      <polyline points="3 7 6 10 11 4" />
                    </svg>
                    <span className="text-sm text-text">{typeLabel}</span>
                    <span className="text-xs text-text-muted">
                      {formatDateRange(review.periodStart, review.periodEnd)}
                    </span>
                  </div>
                  {review.score != null && (
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-sm font-bold text-text">{review.score}</span>
                      <span className="text-[10px] text-text-muted">/10</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
