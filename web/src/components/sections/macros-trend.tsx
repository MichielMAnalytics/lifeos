'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Phase 2 / Section 10A — MacroFactor-style weekly macro trend.
 *
 * Shows daily calories and protein over a 7-day window (either current
 * Mon-Sun calendar week or the last 7 days, toggled via 10T-1 pill).
 *
 * Each metric gets its own line chart with target line, current avg,
 * and a per-day axis. The two metrics share the same X-axis.
 */

type RangeMode = 'week' | 'rolling';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function endOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function rollingFromISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

function shortDayLabel(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
}

interface DailyTotals {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ── Mini line chart ────────────────────────────────

function LineChart({
  data,
  metric,
  target,
  color,
  unit,
}: {
  data: DailyTotals[];
  metric: 'calories' | 'protein';
  target: number;
  color: string;
  unit: string;
}) {
  const values = data.map((d) => d[metric]);
  const max = Math.max(target * 1.2, ...values, 1);
  const width = 100;
  const height = 80;
  const padX = 4;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const targetY = padY + innerH - (target / max) * innerH;

  // Build polyline points
  const points = values.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - (v / max) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  // Trailing average (last 3 days)
  const avgValues = values.map((_, i) => {
    const window = values.slice(Math.max(0, i - 2), i + 1);
    return window.reduce((s, v) => s + v, 0) / window.length;
  });
  const avgPoints = avgValues.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - (v / max) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const totalCurrent = values.reduce((s, v) => s + v, 0);
  const avgCurrent = values.length > 0 ? totalCurrent / values.length : 0;
  const delta = avgCurrent - target;
  const deltaPct = target ? (delta / target) * 100 : 0;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-bg-subtle">
      <div className="px-4 py-3 border-b border-border-subtle flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
          {metric === 'calories' ? 'Calories' : 'Protein'}
        </span>
        <span className="text-xs text-text-muted tabular-nums">
          avg {Math.round(avgCurrent)}{unit} <span className={cn(delta < 0 ? 'text-warning' : 'text-success')}>· {delta >= 0 ? '+' : ''}{Math.round(deltaPct)}%</span>
        </span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[120px]">
          {/* Target line */}
          <line
            x1={padX}
            x2={width - padX}
            y1={targetY}
            y2={targetY}
            stroke="var(--color-border)"
            strokeWidth="0.6"
            strokeDasharray="2 2"
          />
          {/* Avg line */}
          <polyline
            points={avgPoints.join(' ')}
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
          {/* Daily line */}
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Daily dots */}
          {values.map((v, i) => {
            const x = padX + i * stepX;
            const y = padY + innerH - (v / max) * innerH;
            return <circle key={i} cx={x} cy={y} r="1.4" fill={color} />;
          })}
        </svg>
      </div>
      <div className="px-4 pb-3 grid grid-cols-7 text-[9px] text-text-muted/70 tabular-nums">
        {data.map((d) => (
          <div key={d.date} className="text-center">
            <div>{shortDayLabel(d.date)}</div>
            <div className="text-text/70">{Math.round(d[metric])}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────

export function MacrosTrend() {
  const [range, setRange] = useState<RangeMode>('week');
  const macroGoals = useQuery(api.macroGoals.get);

  const { from, to } = useMemo(() => {
    if (range === 'week') {
      return { from: startOfWeekISO(), to: endOfWeekISO() };
    }
    return { from: rollingFromISO(), to: todayISO() };
  }, [range]);

  const totals = useQuery(api.foodLog.weeklyTotals, { from, to });

  if (totals === undefined || macroGoals === undefined) {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const calorieTarget = macroGoals?.calories ?? 2200;
  const proteinTarget = macroGoals?.protein ?? 150;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Weekly Macros
        </h2>
        {/* Pill toggle (Section 10T-1) */}
        <div className="inline-flex items-center bg-bg-subtle border border-border rounded-full p-0.5 text-[10px] font-medium">
          <button
            type="button"
            onClick={() => setRange('week')}
            className={cn(
              'px-3 py-1 rounded-full transition-colors',
              range === 'week' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text',
            )}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => setRange('rolling')}
            className={cn(
              'px-3 py-1 rounded-full transition-colors',
              range === 'rolling' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text',
            )}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      {/* Two charts stacked */}
      <div className="p-4 space-y-4">
        <LineChart data={totals} metric="calories" target={calorieTarget} color="var(--color-accent)" unit="" />
        <LineChart data={totals} metric="protein" target={proteinTarget} color="var(--color-success)" unit="g" />
      </div>
    </div>
  );
}
