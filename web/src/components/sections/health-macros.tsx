'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';

// ── Helpers ─────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(dateStr: string): string {
  const today = todayISO();
  if (dateStr === today) return 'Today';
  if (dateStr === shiftDate(today, -1)) return 'Yesterday';
  if (dateStr === shiftDate(today, 1)) return 'Tomorrow';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Macro Ring ──────────────────────────────────────

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
  const radius = 28;
  const stroke = 4.5;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(current / target, 1);
  const dashOffset = circumference * (1 - pct);
  const remaining = Math.max(0, target - current);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[66px] h-[66px]">
        <svg width="66" height="66" viewBox="0 0 66 66" className="-rotate-90">
          <circle cx="33" cy="33" r={radius} fill="none" stroke="currentColor"
            strokeWidth={stroke} className="text-border" />
          <circle cx="33" cy="33" r={radius} fill="none" stroke={color}
            strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-text tabular-nums leading-tight">{Math.round(current)}</span>
          <span className="text-[8px] text-text-muted/50">/{target}{unit}</span>
        </div>
      </div>
      <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
      <span className="text-[9px] text-text-muted/40">{Math.round(remaining)}{unit} left</span>
    </div>
  );
}

// ── Meal Group Header ───────────────────────────────

const MEAL_GROUPS: { key: string; label: string; icon: string }[] = [
  { key: 'morning', label: 'Morning', icon: '🌅' },
  { key: 'day', label: 'Day', icon: '☀️' },
  { key: 'night', label: 'Night', icon: '🌙' },
  { key: 'snacks', label: 'Snacks', icon: '🍎' },
];

const MEAL_TYPE_TO_GROUP: Record<string, string> = {
  breakfast: 'morning',
  lunch: 'day',
  dinner: 'night',
  snack: 'snacks',
};

// ── Food Entry Row ──────────────────────────────────

function FoodEntry({ entry, onDelete }: {
  entry: { _id: string; name: string; quantity?: string | null; calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null };
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 px-4 hover:bg-surface-hover/50 transition-colors group">
      <span className="text-sm text-text flex-1 min-w-0 truncate">{entry.name}</span>
      {entry.quantity && (
        <span className="text-[10px] text-text-muted/50 shrink-0">{entry.quantity}</span>
      )}
      <div className="flex items-center gap-2 shrink-0 tabular-nums text-[11px]">
        <span className="text-text-muted w-12 text-right">{entry.calories ? `${Math.round(entry.calories)}` : '-'}</span>
        <span className="text-accent/70 w-8 text-right">{entry.protein ? `${Math.round(entry.protein)}` : '-'}</span>
        <span className="text-success/70 w-8 text-right">{entry.carbs ? `${Math.round(entry.carbs)}` : '-'}</span>
        <span className="text-warning/70 w-8 text-right">{entry.fat ? `${Math.round(entry.fat)}` : '-'}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-text-muted hover:text-danger transition-all shrink-0 ml-1"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ── Meal Group Section ──────────────────────────────

function MealGroup({ label, entries, groupTotals, onDeleteEntry }: {
  label: string;
  entries: Array<{ _id: string; name: string; quantity?: string | null; calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null }>;
  groupTotals: { calories: number; protein: number; carbs: number; fat: number };
  onDeleteEntry: (id: string) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="border-b border-border/30 last:border-b-0">
      {/* Group header with totals */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface/30">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted/60">
          {label}
        </span>
        <div className="flex items-center gap-2 tabular-nums text-[10px] font-medium text-text-muted/50">
          <span className="w-12 text-right">{Math.round(groupTotals.calories)} kcal</span>
          <span className="w-8 text-right">{Math.round(groupTotals.protein)}p</span>
          <span className="w-8 text-right">{Math.round(groupTotals.carbs)}c</span>
          <span className="w-8 text-right">{Math.round(groupTotals.fat)}f</span>
          <span className="w-[18px]" />
        </div>
      </div>
      {/* Entries */}
      {entries.map((entry) => (
        <FoodEntry key={entry._id} entry={entry} onDelete={() => onDeleteEntry(entry._id)} />
      ))}
    </div>
  );
}

// ── Add Food Form ───────────────────────────────────

function AddFoodForm({ date, onClose }: { date: string; onClose: () => void }) {
  const createEntry = useMutation(api.foodLog.create);
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [quantity, setQuantity] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createEntry({
      entryDate: date,
      name: name.trim(),
      mealType,
      calories: calories ? parseFloat(calories) : undefined,
      protein: protein ? parseFloat(protein) : undefined,
      carbs: carbs ? parseFloat(carbs) : undefined,
      fat: fat ? parseFloat(fat) : undefined,
      quantity: quantity.trim() || undefined,
    });
    setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setQuantity('');
    // Keep form open for quick multiple entries
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-border space-y-2">
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          placeholder="Food name..."
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50" />
        <select value={mealType} onChange={(e) => setMealType(e.target.value)}
          className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent/50">
          <option value="breakfast">Morning</option>
          <option value="lunch">Day</option>
          <option value="dinner">Night</option>
          <option value="snack">Snack</option>
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty"
          className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50 w-16" />
        <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)}
          placeholder="kcal"
          className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50 w-16" />
        <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)}
          placeholder="P"
          className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50 w-14" />
        <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)}
          placeholder="C"
          className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50 w-14" />
        <input type="number" value={fat} onChange={(e) => setFat(e.target.value)}
          placeholder="F"
          className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50 w-14" />
        <button type="submit" disabled={!name.trim()}
          className="px-3 py-1.5 bg-accent text-bg rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-40">
          Add
        </button>
      </div>
    </form>
  );
}

// ── Main Component ──────────────────────────────────

export function HealthMacros() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [showAddForm, setShowAddForm] = useState(false);

  const entries = useQuery(api.foodLog.list, { entryDate: selectedDate });
  const totals = useQuery(api.foodLog.dailyTotals, { entryDate: selectedDate });
  const removeEntry = useMutation(api.foodLog.remove);

  // Targets (configurable later)
  const targets = { calories: 2200, carbs: 165, fat: 65, protein: 85 };

  const current = {
    calories: totals?.calories ?? 0,
    carbs: totals?.carbs ?? 0,
    fat: totals?.fat ?? 0,
    protein: totals?.protein ?? 0,
  };

  // Group entries by meal group
  const grouped: Record<string, typeof entries> = {};
  for (const group of MEAL_GROUPS) {
    grouped[group.key] = [];
  }
  if (entries) {
    for (const entry of entries) {
      const group = MEAL_TYPE_TO_GROUP[entry.mealType ?? 'snack'] ?? 'snacks';
      if (!grouped[group]) grouped[group] = [];
      grouped[group]!.push(entry);
    }
  }

  // Compute per-group totals
  function groupTotals(items: typeof entries) {
    return (items ?? []).reduce(
      (acc, e) => ({
        calories: acc.calories + (e.calories ?? 0),
        protein: acc.protein + (e.protein ?? 0),
        carbs: acc.carbs + (e.carbs ?? 0),
        fat: acc.fat + (e.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }

  const loading = entries === undefined || totals === undefined;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Day navigation */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <button
          onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
          className="p-1 text-text-muted hover:text-text transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          onClick={() => setSelectedDate(todayISO())}
          className="text-sm font-semibold text-text hover:text-accent transition-colors"
        >
          {formatDayLabel(selectedDate)}
        </button>
        <button
          onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
          className="p-1 text-text-muted hover:text-text transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Macro rings */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">Macros</span>
          <span className="text-xs text-text-muted/50 tabular-nums">
            {Math.round(current.calories)} / {targets.calories} kcal
          </span>
        </div>
        {loading ? (
          <div className="animate-pulse h-24 bg-surface rounded-lg" />
        ) : (
          <div className="flex justify-around">
            <MacroRing label="Carbs" current={current.carbs} target={targets.carbs} unit="g"
              color="var(--color-success, #10b981)" />
            <MacroRing label="Fat" current={current.fat} target={targets.fat} unit="g"
              color="var(--color-warning, #f59e0b)" />
            <MacroRing label="Protein" current={current.protein} target={targets.protein} unit="g"
              color="var(--color-accent, #8b5cf6)" />
          </div>
        )}
      </div>

      {/* Food diary header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
          Food Diary
        </span>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs text-text-muted hover:text-accent transition-colors"
        >
          {showAddForm ? 'Done' : '+ Log Food'}
        </button>
      </div>

      {/* Add food form */}
      {showAddForm && (
        <AddFoodForm date={selectedDate} onClose={() => setShowAddForm(false)} />
      )}

      {/* Column headers */}
      {(entries?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-[9px] font-medium uppercase tracking-wider text-text-muted/30 border-b border-border/20">
          <span className="flex-1">Item</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-12 text-right">kcal</span>
            <span className="w-8 text-right">P</span>
            <span className="w-8 text-right">C</span>
            <span className="w-8 text-right">F</span>
            <span className="w-[18px]" />
          </div>
        </div>
      )}

      {/* Meal groups */}
      {loading ? (
        <div className="animate-pulse h-20 m-4 bg-surface rounded-lg" />
      ) : (entries?.length ?? 0) === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-text-muted">No food logged</p>
          <p className="text-xs text-text-muted/50 mt-1">Click + Log Food to start tracking</p>
        </div>
      ) : (
        <div>
          {MEAL_GROUPS.map((group) => (
            <MealGroup
              key={group.key}
              label={group.label}
              entries={grouped[group.key] ?? []}
              groupTotals={groupTotals(grouped[group.key])}
              onDeleteEntry={(id) => removeEntry({ id: id as any })}
            />
          ))}

          {/* Daily total */}
          {(entries?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-surface/50 border-t border-border">
              <span className="text-xs font-semibold text-text flex-1">Daily Total</span>
              <div className="flex items-center gap-2 shrink-0 tabular-nums text-[11px] font-semibold">
                <span className="text-text w-12 text-right">{Math.round(current.calories)}</span>
                <span className="text-accent w-8 text-right">{Math.round(current.protein)}</span>
                <span className="text-success w-8 text-right">{Math.round(current.carbs)}</span>
                <span className="text-warning w-8 text-right">{Math.round(current.fat)}</span>
                <span className="w-[18px]" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
