'use client';

// Reviews schedule — the "what's next?" hero for reflection.
//
// All cadences are calendar-anchored: weekly = current Mon–Sun, monthly =
// current calendar month (e.g. April), quarterly = current calendar quarter
// (Q2 = Apr–Jun). Daily reviews live in the journal entry and intentionally
// don't appear here.

import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { WeeklyReviewForm } from './weekly-review-form';
import { MonthlyReviewForm } from './monthly-review-form';
import { MovingFutureForm } from './moving-future-form';

type ReviewType = 'weekly' | 'monthly' | 'quarterly';

interface ReviewPeriod {
  type: ReviewType;
  /** Compact label (e.g. "Weekly Review" / "April 2026" / "Q2 2026") */
  typeLabel: string;
  /** Full title shown in the hero */
  heroTitle: string;
  /** Sub-label (e.g. "Apr 14 – Apr 20") */
  rangeLabel: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  /** End date of the period — this is "due by" */
  endDate: Date;
  completed: boolean;
  /** Negative when overdue, 0 = due today, positive = days away */
  daysUntilDue: number;
  /** True when the period has fully ended and the review wasn't logged */
  overdue: boolean;
}

// ── Date helpers ─────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function midnight(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function daysBetween(from: Date, to: Date): number {
  const ms = midnight(to).getTime() - midnight(from).getTime();
  return Math.round(ms / 86_400_000);
}

function formatRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const eStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${sStr} – ${eStr}`;
}

function formatRelativeDue(daysUntilDue: number): string {
  if (daysUntilDue < 0) {
    const d = Math.abs(daysUntilDue);
    return d === 1 ? '1 day overdue' : `${d} days overdue`;
  }
  if (daysUntilDue === 0) return 'Due today';
  if (daysUntilDue === 1) return 'Due tomorrow';
  return `Due in ${daysUntilDue} days`;
}

// ── Period builders ──────────────────────────────────

function currentWeekRange(): { start: Date; end: Date } {
  const now = midnight(new Date());
  const day = now.getDay(); // 0 Sun, 1 Mon, ...
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

function previousWeekRange(): { start: Date; end: Date } {
  const cur = currentWeekRange();
  const start = new Date(cur.start);
  start.setDate(start.getDate() - 7);
  const end = new Date(cur.end);
  end.setDate(end.getDate() - 7);
  return { start, end };
}

function currentMonthRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

function previousMonthRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

interface QuarterRange { start: Date; end: Date; label: string; }

function currentQuarterRange(): QuarterRange {
  const now = new Date();
  const month = now.getMonth();
  const startMonth = Math.floor(month / 3) * 3;
  const start = new Date(now.getFullYear(), startMonth, 1);
  const end = new Date(now.getFullYear(), startMonth + 3, 0);
  const qNum = Math.floor(startMonth / 3) + 1;
  return { start, end, label: `Q${qNum} ${start.getFullYear()}` };
}

function previousQuarterRange(): QuarterRange {
  const cur = currentQuarterRange();
  const startOfPrev = new Date(cur.start.getFullYear(), cur.start.getMonth() - 3, 1);
  const endOfPrev = new Date(cur.start.getFullYear(), cur.start.getMonth(), 0);
  const qNum = Math.floor(startOfPrev.getMonth() / 3) + 1;
  return { start: startOfPrev, end: endOfPrev, label: `Q${qNum} ${startOfPrev.getFullYear()}` };
}

// ── Component ────────────────────────────────────────

type ActiveForm =
  | { type: 'weekly'; start: Date; end: Date }
  | { type: 'monthly'; start: Date; end: Date }
  | { type: 'quarterly'; start: Date; end: Date }
  | null;

export function ReviewsSchedule() {
  const reviews = useQuery(api.reviews.list, {});
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);

  const periods = useMemo<ReviewPeriod[]>(() => {
    if (!reviews) return [];
    const today = midnight(new Date());

    const built: ReviewPeriod[] = [];

    // Helper: build a period entry, computing completion + overdue status.
    function build(
      type: ReviewType,
      typeLabel: string,
      heroTitle: string,
      start: Date,
      end: Date,
    ): ReviewPeriod {
      const periodStart = toDateStr(start);
      const periodEnd = toDateStr(end);
      const completed = reviews!.some(
        (r) =>
          r.reviewType === type &&
          r.periodStart === periodStart &&
          r.periodEnd === periodEnd,
      );
      const daysUntilDue = daysBetween(today, end);
      // A review is "overdue" when its period has fully ended and we haven't
      // logged a review row covering it.
      const overdue = !completed && end < today;
      return {
        type,
        typeLabel,
        heroTitle,
        rangeLabel: formatRange(start, end),
        periodStart,
        periodEnd,
        endDate: end,
        completed,
        daysUntilDue,
        overdue,
      };
    }

    // Weekly — current then previous (only previous if not completed)
    const cw = currentWeekRange();
    built.push(build('weekly', 'Weekly Review', 'Weekly Review', cw.start, cw.end));
    const pw = previousWeekRange();
    const prevWeek = build('weekly', 'Weekly Review', 'Weekly Review', pw.start, pw.end);
    if (!prevWeek.completed && prevWeek.endDate < today) built.push(prevWeek);

    // Monthly
    const cm = currentMonthRange();
    built.push(build('monthly', cm.label, `Monthly Review · ${cm.label}`, cm.start, cm.end));
    const pm = previousMonthRange();
    const prevMonth = build('monthly', pm.label, `Monthly Review · ${pm.label}`, pm.start, pm.end);
    if (!prevMonth.completed && prevMonth.endDate < today) built.push(prevMonth);

    // Quarterly (Moving Future)
    const cq = currentQuarterRange();
    built.push(
      build('quarterly', cq.label, `Moving Future · ${cq.label}`, cq.start, cq.end),
    );
    const pq = previousQuarterRange();
    const prevQuarter = build(
      'quarterly',
      pq.label,
      `Moving Future · ${pq.label}`,
      pq.start,
      pq.end,
    );
    if (!prevQuarter.completed && prevQuarter.endDate < today) built.push(prevQuarter);

    return built;
  }, [reviews]);

  if (!reviews) {
    return (
      <div className="border border-border rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-24 bg-surface rounded" />
          <div className="h-32 bg-surface rounded-xl" />
          <div className="h-12 bg-surface rounded-lg" />
          <div className="h-12 bg-surface rounded-lg" />
        </div>
      </div>
    );
  }

  // Pending = not completed yet. Sort by daysUntilDue ascending so most
  // urgent comes first; on ties (e.g. an overdue monthly + quarterly that
  // both ended on the same day) prefer the bigger horizon — a missed Moving
  // Future is more consequential than a missed monthly check-in.
  const typeWeight: Record<ReviewType, number> = { quarterly: 0, monthly: 1, weekly: 2 };
  const pending = periods
    .filter((p) => !p.completed)
    .sort((a, b) => {
      if (a.daysUntilDue !== b.daysUntilDue) return a.daysUntilDue - b.daysUntilDue;
      return typeWeight[a.type] - typeWeight[b.type];
    });

  const hero = pending[0] ?? null;
  const otherPending = hero ? pending.slice(1) : [];

  // History — most recent first, capped.
  const completedReviews = [...reviews]
    .sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1))
    .slice(0, 8);

  function startForm(period: ReviewPeriod) {
    const start = new Date(period.periodStart + 'T00:00:00');
    const end = new Date(period.periodEnd + 'T00:00:00');
    setActiveForm({ type: period.type, start, end });
  }
  function clearForm() {
    setActiveForm(null);
  }

  return (
    <div className="border border-border rounded-xl">
      {/* Inline form takeover */}
      {activeForm ? (
        <div className="p-4">
          {activeForm.type === 'weekly' && (
            <WeeklyReviewForm
              weekStart={activeForm.start}
              weekEnd={activeForm.end}
              onSaved={clearForm}
            />
          )}
          {activeForm.type === 'monthly' && (
            <MonthlyReviewForm
              monthStart={activeForm.start}
              monthEnd={activeForm.end}
              onSaved={clearForm}
              onCancel={clearForm}
            />
          )}
          {activeForm.type === 'quarterly' && (
            <MovingFutureForm
              closingPeriodStart={activeForm.start}
              closingPeriodEnd={activeForm.end}
              onSaved={clearForm}
              onCancel={clearForm}
            />
          )}
          <div className="px-2 pt-3">
            <button
              type="button"
              onClick={clearForm}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              ← Back to schedule
            </button>
          </div>
        </div>
      ) : (
        <>
          {hero && (
            <div className="px-6 pt-6 pb-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 block mb-3">
                Next review
              </span>
              <HeroCard period={hero} onStart={() => startForm(hero)} />
            </div>
          )}

          {!hero && (
            <div className="px-6 py-10 text-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-success">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="text-sm font-medium text-text">All caught up</p>
              <p className="text-xs text-text-muted mt-1">
                No reviews to write right now. Past entries are below.
              </p>
            </div>
          )}

          {otherPending.length > 0 && (
            <div className="px-6 pb-5 space-y-4">
              {(['weekly', 'monthly', 'quarterly'] as const).map((groupType) => {
                const groupItems = otherPending.filter((p) => p.type === groupType);
                if (groupItems.length === 0) return null;
                const heading =
                  groupType === 'weekly'
                    ? 'Weekly'
                    : groupType === 'monthly'
                      ? 'Monthly'
                      : 'Quarterly · Moving Future';
                return (
                  <div key={groupType}>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 block mb-2">
                      {heading}
                    </span>
                    <ul className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden">
                      {groupItems.map((p) => (
                        <PendingRow
                          key={`${p.type}-${p.periodStart}`}
                          period={p}
                          onStart={() => startForm(p)}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {completedReviews.length > 0 && (
            <div className="px-6 py-5 border-t border-border">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 block mb-2">
                Recently completed
              </span>
              <ul className="space-y-1">
                {completedReviews.map((r) => {
                  const startDate = new Date(r.periodStart + 'T00:00:00');
                  const endDate = new Date(r.periodEnd + 'T00:00:00');
                  const typeBadge =
                    r.reviewType === 'quarterly'
                      ? 'Quarterly'
                      : r.reviewType === 'monthly'
                        ? 'Monthly'
                        : r.reviewType === 'weekly'
                          ? 'Weekly'
                          : r.reviewType === 'daily'
                            ? 'Daily'
                            : r.reviewType;
                  return (
                    <li
                      key={r._id}
                      className="flex items-center gap-3 py-1.5 text-sm"
                    >
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success/80">
                        <polyline points="3 7 6 10 11 4" />
                      </svg>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80 w-16 shrink-0">
                        {typeBadge}
                      </span>
                      <span className="text-text-muted truncate">
                        {formatRange(startDate, endDate)}
                      </span>
                      {r.score != null && (
                        <span className="ml-auto text-xs text-text-muted/80 tabular-nums shrink-0">
                          {r.score}/10
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub components ───────────────────────────────────

function HeroCard({ period, onStart }: { period: ReviewPeriod; onStart: () => void }) {
  const isOverdue = period.overdue;
  return (
    <div
      className={cn(
        'rounded-xl p-5 transition-colors',
        isOverdue
          ? 'border border-danger/40 bg-danger/5'
          : 'border border-accent/40 bg-accent/5',
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'text-[10px] font-semibold uppercase tracking-[0.12em]',
                isOverdue ? 'text-danger' : 'text-accent',
              )}
            >
              {period.type === 'quarterly'
                ? 'Quarterly · Moving Future'
                : period.type === 'monthly'
                  ? 'Monthly'
                  : 'Weekly'}
            </span>
            {isOverdue && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-danger bg-danger/10 px-1.5 py-0.5 rounded-full">
                Overdue
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-text leading-tight">
            {period.heroTitle}
          </h3>
          <p className="text-sm text-text-muted mt-1">{period.rangeLabel}</p>
          <p
            className={cn(
              'text-xs font-medium mt-2',
              isOverdue ? 'text-danger' : 'text-text-muted',
            )}
          >
            {formatRelativeDue(period.daysUntilDue)}
          </p>
        </div>
        <button
          type="button"
          onClick={onStart}
          className={cn(
            'px-5 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-colors shrink-0',
            isOverdue
              ? 'bg-danger text-white hover:bg-danger/90'
              : 'bg-accent text-white hover:bg-accent-hover',
          )}
        >
          Start →
        </button>
      </div>
    </div>
  );
}

function PendingRow({ period, onStart }: { period: ReviewPeriod; onStart: () => void }) {
  const isOverdue = period.overdue;
  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors">
      <span
        className={cn(
          'shrink-0 h-2 w-2 rounded-full',
          isOverdue ? 'bg-danger' : 'bg-text-muted/50',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium text-text">
            {period.type === 'quarterly'
              ? `Moving Future · ${period.typeLabel}`
              : period.type === 'monthly'
                ? `Monthly · ${period.typeLabel}`
                : 'Weekly Review'}
          </span>
          <span className="text-xs text-text-muted">{period.rangeLabel}</span>
        </div>
        <span
          className={cn(
            'text-xs',
            isOverdue ? 'text-danger font-medium' : 'text-text-muted/80',
          )}
        >
          {formatRelativeDue(period.daysUntilDue)}
        </span>
      </div>
      <button
        type="button"
        onClick={onStart}
        className={cn(
          'shrink-0 text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-lg border transition-colors',
          isOverdue
            ? 'text-danger border-danger/30 hover:bg-danger hover:text-white'
            : 'text-accent border-accent/30 hover:bg-accent hover:text-white',
        )}
      >
        Start
      </button>
    </li>
  );
}
