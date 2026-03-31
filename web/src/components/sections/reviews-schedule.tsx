'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { WeeklyReviewForm } from './weekly-review-form';
import { QuarterlyReviewForm } from './quarterly-review-form';

// ── Date helpers ─────────────────────────────────────

function getLastSunday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? 0 : day;
  const last = new Date(now);
  last.setDate(now.getDate() - diff);
  last.setHours(0, 0, 0, 0);
  return last;
}

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

function getPreviousQuarterEnd(): Date {
  const qStart = getQuarterStart();
  const prev = new Date(qStart);
  prev.setDate(prev.getDate() - 1);
  return prev;
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

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

// ── Types ────────────────────────────────────────────

type ReviewFormType = 'weekly' | 'quarterly' | null;

// ── Component ────────────────────────────────────────

export function ReviewsSchedule() {
  const reviews = useQuery(api.reviews.list, {});
  const [activeForm, setActiveForm] = useState<ReviewFormType>(null);

  if (!reviews) {
    return (
      <div className="border border-border rounded-xl p-6">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60 mb-4">
          Review Schedule
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-surface rounded-lg" />
          <div className="h-10 bg-surface rounded-lg" />
        </div>
      </div>
    );
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const nextSunday = getNextSunday();
  const weekStart = getWeekStartForSunday(nextSunday);
  const quarterEnd = getQuarterEnd();
  const quarterStart = getQuarterStart();

  // -- Current period checks --
  const weekStartStr = toDateStr(weekStart);
  const weekEndStr = toDateStr(nextSunday);
  const hasCurrentWeeklyReview = reviews.some(
    (r) => r.reviewType === 'weekly' && r.periodStart === weekStartStr && r.periodEnd === weekEndStr,
  );

  const qStartStr = toDateStr(quarterStart);
  const qEndStr = toDateStr(quarterEnd.date);
  const hasCurrentQuarterlyReview = reviews.some(
    (r) => r.reviewType === 'quarterly' && r.periodStart === qStartStr && r.periodEnd === qEndStr,
  );

  // -- Overdue checks --
  // Weekly: overdue if last Sunday has passed and that week's review is missing
  const lastSunday = getLastSunday();
  const lastWeekStart = getWeekStartForSunday(lastSunday);
  const lastWeekStartStr = toDateStr(lastWeekStart);
  const lastSundayStr = toDateStr(lastSunday);
  const isLastSundayPast = lastSunday < now;
  const hasLastWeeklyReview = reviews.some(
    (r) => r.reviewType === 'weekly' && r.periodStart === lastWeekStartStr && r.periodEnd === lastSundayStr,
  );
  const weeklyOverdue = isLastSundayPast && !hasLastWeeklyReview && lastSundayStr !== weekEndStr;
  const weeklyOverdueDays = weeklyOverdue ? daysBetween(lastSunday, now) : 0;

  // Quarterly: overdue if previous quarter end has passed and no review for it
  const prevQEnd = getPreviousQuarterEnd();
  const prevQEndStr = toDateStr(prevQEnd);
  // Find the start of the previous quarter
  const prevQEndDate = new Date(prevQEnd);
  const prevQMonth = prevQEndDate.getMonth();
  let prevQStartMonth: number;
  if (prevQMonth < 3) prevQStartMonth = 0;
  else if (prevQMonth < 6) prevQStartMonth = 3;
  else if (prevQMonth < 9) prevQStartMonth = 6;
  else prevQStartMonth = 9;
  const prevQStart = new Date(prevQEndDate.getFullYear(), prevQStartMonth, 1);
  const prevQStartStr = toDateStr(prevQStart);
  const hasPrevQuarterlyReview = reviews.some(
    (r) => r.reviewType === 'quarterly' && r.periodStart === prevQStartStr && r.periodEnd === prevQEndStr,
  );
  const quarterlyOverdue = !hasPrevQuarterlyReview && prevQEnd < now;
  const quarterlyOverdueDays = quarterlyOverdue ? daysBetween(prevQEnd, now) : 0;
  const prevQuarterMonth = prevQEnd.getMonth();
  const prevQuarterLabel = `Q${Math.floor(prevQuarterMonth / 3) + 1} ${prevQEnd.getFullYear()}`;

  // -- Completed reviews (most recent 6) --
  const completedReviews = reviews.slice(0, 6);

  function handleStart(type: 'weekly' | 'quarterly') {
    setActiveForm(type);
  }

  function handleCancel() {
    setActiveForm(null);
  }

  function handleSaved() {
    setActiveForm(null);
  }

  const hasOverdue = weeklyOverdue || quarterlyOverdue;

  return (
    <div className="border border-border rounded-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
          Review Schedule
        </h2>
      </div>

      {/* Inline form when active */}
      {activeForm === 'weekly' && (
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-accent">
              Writing Weekly Review
            </span>
            <button
              onClick={handleCancel}
              className="text-xs font-bold uppercase tracking-wide text-text-muted hover:text-text transition-colors px-3 py-1 border border-border hover:border-text-muted rounded-lg"
            >
              Cancel
            </button>
          </div>
          <WeeklyReviewForm onSaved={handleSaved} />
        </div>
      )}
      {activeForm === 'quarterly' && (
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-accent">
              Writing Quarterly Review
            </span>
            <button
              onClick={handleCancel}
              className="text-xs font-bold uppercase tracking-wide text-text-muted hover:text-text transition-colors px-3 py-1 border border-border hover:border-text-muted rounded-lg"
            >
              Cancel
            </button>
          </div>
          <QuarterlyReviewForm onSaved={handleSaved} />
        </div>
      )}

      {/* Overdue section */}
      {hasOverdue && !activeForm && (
        <div className="px-6 py-4 border-b border-border">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-danger">
            Overdue
          </span>
          <div className="mt-3 space-y-2">
            {weeklyOverdue && (
              <div className="flex items-center justify-between gap-4 py-3 px-4 border border-danger/30 bg-danger/5 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-danger">
                    <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="7" y1="4" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="7" cy="10" r="0.75" fill="currentColor" />
                  </svg>
                  <span className="text-sm font-medium text-text">Weekly Review</span>
                  <span className="text-xs font-medium text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                    Overdue
                  </span>
                  <span className="text-xs text-text-muted">
                    {weeklyOverdueDays} day{weeklyOverdueDays !== 1 ? 's' : ''} overdue
                  </span>
                </div>
                <button
                  onClick={() => handleStart('weekly')}
                  className="text-xs font-bold uppercase tracking-wide text-danger hover:text-bg hover:bg-danger transition-colors px-3 py-1 border border-danger/40 hover:border-danger rounded-lg"
                >
                  Start Now
                </button>
              </div>
            )}
            {quarterlyOverdue && (
              <div className="flex items-center justify-between gap-4 py-3 px-4 border border-danger/30 bg-danger/5 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-danger">
                    <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="7" y1="4" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="7" cy="10" r="0.75" fill="currentColor" />
                  </svg>
                  <span className="text-sm font-medium text-text">Quarterly Review ({prevQuarterLabel})</span>
                  <span className="text-xs font-medium text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                    Overdue
                  </span>
                  <span className="text-xs text-text-muted">
                    {quarterlyOverdueDays} day{quarterlyOverdueDays !== 1 ? 's' : ''} overdue
                  </span>
                </div>
                <button
                  onClick={() => handleStart('quarterly')}
                  className="text-xs font-bold uppercase tracking-wide text-danger hover:text-bg hover:bg-danger transition-colors px-3 py-1 border border-danger/40 hover:border-danger rounded-lg"
                >
                  Start Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming section */}
      {!activeForm && (
        <div className="px-6 py-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
            Upcoming
          </span>
          <div className="mt-3 space-y-2">
            {/* Weekly review */}
            <div className="flex items-center justify-between gap-4 py-3 px-4 border border-border rounded-lg">
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
                  className="text-xs font-bold uppercase tracking-wide text-accent hover:text-accent-hover transition-colors px-3 py-1 border border-accent/30 hover:border-accent/60 rounded-lg"
                >
                  Start
                </button>
              )}
            </div>

            {/* Quarterly review */}
            <div className="flex items-center justify-between gap-4 py-3 px-4 border border-border rounded-lg">
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
                  className="text-xs font-bold uppercase tracking-wide text-accent hover:text-accent-hover transition-colors px-3 py-1 border border-accent/30 hover:border-accent/60 rounded-lg"
                >
                  Start
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completed section */}
      {completedReviews.length > 0 && !activeForm && (
        <div className="px-6 py-4 border-t border-border">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
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
                  className="flex items-center justify-between gap-4 py-2 px-4 rounded-lg opacity-75 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success">
                      <polyline points="3 7 6 10 11 4" />
                    </svg>
                    <span className="text-sm text-text-muted">{typeLabel}</span>
                    <span className="text-xs text-text-muted/70">
                      {formatDateRange(review.periodStart, review.periodEnd)}
                    </span>
                  </div>
                  {review.score != null && (
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-sm font-bold text-text-muted">{review.score}</span>
                      <span className="text-[10px] text-text-muted/70">/10</span>
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
