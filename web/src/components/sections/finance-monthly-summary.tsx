'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc, Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

type MonthlySummary = {
  yearMonth: string;
  income: number;
  spend: number;
  net: number;
  // `unconverted` was added later — it's the count of non-USD rows whose
  // FX rate failed to resolve and so were excluded from totals. Optional
  // here so older mock fixtures (and the old return shape) still type-check.
  counts: { total: number; categorized: number; uncategorized: number; unconverted?: number };
  byCategory: Record<string, number>;
};

type FinanceCategory = Doc<'financeCategories'>;

const bigMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const lineMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const monthLabel = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

const shortMonthLabel = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
});

function currentYearMonth(): string {
  // Build YYYY-MM from local date parts, not from `toISOString()`. The UTC
  // path showed the wrong month around midnight in non-UTC timezones (e.g.
  // a user in Asia/Jakarta opening the app at 01:00 local would have seen
  // last month's summary because UTC was still on the prior day).
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftYearMonth(yearMonth: string, delta: number): string {
  const [yStr, mStr] = yearMonth.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  // Date constructor handles year wraparound when month overflows past Dec or underflows below Jan
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function yearMonthToDate(yearMonth: string): Date {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export function FinanceMonthlySummary({
  summary: summaryProp,
  categories: categoriesProp,
}: {
  summary?: MonthlySummary;
  categories?: FinanceCategory[];
} = {}) {
  const seedDefaults = useMutation(api.financeCategories.seedDefaults);
  const usingProps = summaryProp !== undefined && categoriesProp !== undefined;

  const [yearMonth, setYearMonth] = useState<string>(
    summaryProp?.yearMonth ?? currentYearMonth(),
  );

  const queriedSummary = useQuery(
    api.financeTransactions.monthlySummary,
    usingProps ? 'skip' : { yearMonth },
  );
  const queriedCategories = useQuery(
    api.financeCategories.list,
    usingProps ? 'skip' : {},
  );

  // Seed the 13 default categories on first render — but ONLY when the
  // user actually has none yet. Firing unconditionally on every mount used
  // to cause a redundant mutation per page visit (and one stray rejection
  // when paired with stale auth state).
  const seededRef = useRef(false);
  useEffect(() => {
    if (usingProps) return;
    if (seededRef.current) return;
    if (queriedCategories === undefined) return;
    if (queriedCategories.length > 0) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    void seedDefaults({});
  }, [queriedCategories, seedDefaults, usingProps]);

  const summary = summaryProp ?? queriedSummary;
  const categories = categoriesProp ?? queriedCategories;

  const today = currentYearMonth();
  const isAtCurrentMonth = yearMonth >= today;

  const handlePrev = () => setYearMonth((ym) => shiftYearMonth(ym, -1));
  const handleNext = () => {
    if (isAtCurrentMonth) return;
    setYearMonth((ym) => shiftYearMonth(ym, 1));
  };

  const headerLabel = monthLabel.format(yearMonthToDate(yearMonth));
  const navLabel = shortMonthLabel.format(yearMonthToDate(yearMonth));

  const categoryMap = useMemo(() => {
    const map = new Map<string, FinanceCategory>();
    for (const c of categories ?? []) map.set(c._id as unknown as string, c);
    return map;
  }, [categories]);

  if (summary === undefined || categories === undefined) {
    return (
      <Shell headerLabel={headerLabel} navLabel={navLabel} disablePrev disableNext>
        <div className="px-5 py-6 space-y-4 animate-pulse">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-7 w-24 bg-bg-subtle rounded" />
                <div className="h-2 w-16 bg-bg-subtle rounded" />
              </div>
            ))}
          </div>
          <div className="h-2 w-full bg-bg-subtle rounded-full" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 w-full bg-bg-subtle rounded" />
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  const { income, spend, net, counts, byCategory } = summary;
  const isEmpty = counts.total === 0;

  if (isEmpty) {
    return (
      <Shell
        headerLabel={headerLabel}
        navLabel={navLabel}
        disablePrev={false}
        disableNext={isAtCurrentMonth}
        onPrev={handlePrev}
        onNext={handleNext}
      >
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-2">
          <p className="text-sm text-text-muted">No transactions this month yet.</p>
          <p className="text-xs text-text-muted/70">
            Drop a CSV in the Uploads card below to get started.
          </p>
        </div>
      </Shell>
    );
  }

  const totalSpend = spend;
  const rows = Object.entries(byCategory)
    .map(([catId, amount]) => {
      const cat = categoryMap.get(catId);
      return {
        id: catId as unknown as Id<'financeCategories'>,
        name: cat?.name ?? 'Unknown',
        color: cat?.color ?? '#888888',
        amount,
        pct: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const visibleSegments = rows.filter((r) => r.pct >= 1);
  const otherPct = rows
    .filter((r) => r.pct < 1)
    .reduce((sum, r) => sum + r.pct, 0);

  const netClass =
    net > 0 ? 'text-success' : net < 0 ? 'text-warning' : 'text-text';

  return (
    <Shell
      headerLabel={headerLabel}
      navLabel={navLabel}
      disablePrev={false}
      disableNext={isAtCurrentMonth}
      onPrev={handlePrev}
      onNext={handleNext}
    >
      <div className="px-5 py-5 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Income" value={bigMoney.format(income)} className="text-success" />
          <Stat label="Spend" value={bigMoney.format(spend)} className="text-danger" />
          <Stat label="Net" value={bigMoney.format(net)} className={netClass} />
        </div>

        {totalSpend > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden bg-bg-subtle">
            {visibleSegments.map((r) => (
              <div
                key={r.id as unknown as string}
                style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                title={`${r.name}: ${lineMoney.format(r.amount)} (${r.pct.toFixed(1)}%)`}
              />
            ))}
            {otherPct >= 1 && (
              <div
                style={{ width: `${otherPct}%`, backgroundColor: '#888888' }}
                title={`Other: ${otherPct.toFixed(1)}%`}
              />
            )}
          </div>
        )}

        {rows.length > 0 && (
          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li
                key={r.id as unknown as string}
                className="flex items-center gap-3 text-xs"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                <span className="flex-1 truncate text-text">{r.name}</span>
                <span className="tabular-nums text-text-muted">
                  {lineMoney.format(r.amount)}
                </span>
                <span className="tabular-nums text-text-muted/70 w-12 text-right">
                  {r.pct.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-border">
        <span className="text-[11px] text-text-muted">
          {counts.categorized} of {counts.total} transactions categorised
        </span>
        {counts.uncategorized > 0 && (
          <span className="text-[11px] text-text-muted/70">
            {counts.uncategorized} awaiting triage in the inbox above
          </span>
        )}
      </div>
    </Shell>
  );
}

function Shell({
  headerLabel,
  navLabel,
  disablePrev,
  disableNext,
  onPrev,
  onNext,
  children,
}: {
  headerLabel: string;
  navLabel: string;
  disablePrev: boolean;
  disableNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text">Monthly summary</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={disablePrev}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded border border-border text-text-muted hover:text-text hover:border-accent transition-colors',
              disablePrev && 'opacity-30 pointer-events-none',
            )}
            aria-label="Previous month"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-xs font-medium text-text tabular-nums min-w-[68px] text-center">
            {navLabel}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={disableNext}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded border border-border text-text-muted hover:text-text hover:border-accent transition-colors',
              disableNext && 'opacity-30 pointer-events-none',
            )}
            aria-label="Next month"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
      <div className="sr-only">{headerLabel}</div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <div className={cn('text-2xl font-bold tabular-nums', className)}>{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
    </div>
  );
}
