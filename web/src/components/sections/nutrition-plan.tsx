'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function MacroRing({
  label,
  current,
  target,
  unit,
  color,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}) {
  const radius = 32;
  const stroke = 5;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(current / target, 1);
  const dashOffset = circumference * (1 - pct);
  const remaining = Math.max(0, target - current);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[76px] h-[76px]">
        <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
          <circle cx="38" cy="38" r={radius} fill="none" stroke="currentColor"
            strokeWidth={stroke} className="text-border" />
          <circle cx="38" cy="38" r={radius} fill="none" stroke={color}
            strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-text tabular-nums">{Math.round(current)}</span>
          <span className="text-[9px] text-text-muted">/{target}{unit}</span>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color }}>
        {label}
      </span>
      <span className="text-[10px] text-text-muted/80">
        {Math.round(remaining)}{unit} left
      </span>
    </div>
  );
}

export function NutritionPlan() {
  const today = todayISO();
  const totals = useQuery(api.foodLog.dailyTotals, { entryDate: today });
  const macroGoals = useQuery(api.macroGoals.get);

  const targets = macroGoals ?? { calories: 2200, carbs: 200, fat: 65, protein: 150 };

  const current = {
    calories: totals?.calories ?? 0,
    carbs: totals?.carbs ?? 0,
    fat: totals?.fat ?? 0,
    protein: totals?.protein ?? 0,
  };

  if (totals === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-xl" />;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Macros
        </h2>
        <span className="text-xs text-text-muted/80 tabular-nums">
          {Math.round(current.calories)} / {targets.calories} kcal
        </span>
      </div>

      <div className="px-6 py-6">
        <div className="flex justify-around">
          <MacroRing
            label="Protein"
            current={current.protein}
            target={targets.protein}
            unit="g"
            color="var(--color-accent, #8b5cf6)"
          />
          <MacroRing
            label="Fat"
            current={current.fat}
            target={targets.fat}
            unit="g"
            color="var(--color-warning, #f59e0b)"
          />
          <MacroRing
            label="Carbs"
            current={current.carbs}
            target={targets.carbs}
            unit="g"
            color="var(--color-success, #10b981)"
          />
        </div>
      </div>
    </div>
  );
}
