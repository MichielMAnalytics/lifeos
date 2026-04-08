'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc, Id } from '@/lib/convex-api';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type FoodEntry = Doc<'foodLog'>;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

// ── Shared column widths (Section 8A spreadsheet layout) ──
// Grid: Item | Qty | kcal | P | C | F | delete
const COL_CLASSES = 'grid grid-cols-[minmax(0,1fr)_60px_60px_48px_48px_48px_20px] gap-2';

// ── Inline row (new entry) ──────────────────────────
// Each meal section ends with an inline row. Tab through cells, Enter saves
// and spawns a new empty row for rapid entry.

function InlineAddRow({ date, mealType }: { date: string; mealType: string }) {
  const createEntry = useMutation(api.foodLog.create);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [f, setF] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createEntry({
        entryDate: date,
        name: name.trim(),
        mealType,
        calories: kcal ? parseFloat(kcal) : undefined,
        protein: p ? parseFloat(p) : undefined,
        carbs: c ? parseFloat(c) : undefined,
        fat: f ? parseFloat(f) : undefined,
        quantity: qty.trim() || undefined,
      });
      setName(''); setQty(''); setKcal(''); setP(''); setC(''); setF('');
      requestAnimationFrame(() => nameRef.current?.focus());
    } catch (err) {
      console.error('Failed to add food:', err);
    } finally {
      setSaving(false);
    }
  }, [name, qty, kcal, p, c, f, date, mealType, createEntry]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    }
  }

  return (
    <div className={cn(COL_CLASSES, 'items-center px-5 py-1.5 border-b border-border-subtle/40 hover:bg-surface-hover/30 transition-colors')}>
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKey}
        placeholder="+ Add food"
        className="bg-transparent text-sm text-text placeholder:text-text-muted/50 focus:outline-none min-w-0"
      />
      <input
        type="text"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        onKeyDown={handleKey}
        placeholder="qty"
        className="bg-transparent text-xs text-text placeholder:text-text-muted/50 focus:outline-none text-right tabular-nums w-full"
      />
      <input
        type="number"
        value={kcal}
        onChange={(e) => setKcal(e.target.value)}
        onKeyDown={handleKey}
        placeholder="kcal"
        className="bg-transparent text-xs tabular-nums text-text placeholder:text-text-muted/50 focus:outline-none text-right w-full"
      />
      <input
        type="number"
        value={p}
        onChange={(e) => setP(e.target.value)}
        onKeyDown={handleKey}
        placeholder="P"
        className="bg-transparent text-xs tabular-nums text-accent placeholder:text-text-muted/50 focus:outline-none text-right w-full"
      />
      <input
        type="number"
        value={c}
        onChange={(e) => setC(e.target.value)}
        onKeyDown={handleKey}
        placeholder="C"
        className="bg-transparent text-xs tabular-nums text-success placeholder:text-text-muted/50 focus:outline-none text-right w-full"
      />
      <input
        type="number"
        value={f}
        onChange={(e) => setF(e.target.value)}
        onKeyDown={handleKey}
        placeholder="F"
        className="bg-transparent text-xs tabular-nums text-warning placeholder:text-text-muted/50 focus:outline-none text-right w-full"
      />
      <span className="text-[10px] text-text-muted/40 text-right">{saving ? '…' : ''}</span>
    </div>
  );
}

// ── Persisted row ──────────────────────────────────

function FoodRow({
  entry,
  onDelete,
}: {
  entry: FoodEntry;
  onDelete: () => void;
}) {
  return (
    <div className={cn(COL_CLASSES, 'items-center px-5 py-1.5 border-b border-border-subtle/40 hover:bg-surface-hover/30 group transition-colors text-sm')}>
      <span className="text-text min-w-0 truncate">{entry.name}</span>
      <span className="text-xs text-text-muted text-right tabular-nums">
        {entry.quantity ?? '—'}
      </span>
      <span className="text-xs text-text text-right tabular-nums">
        {entry.calories != null ? Math.round(entry.calories) : '—'}
      </span>
      <span className="text-xs text-accent text-right tabular-nums">
        {entry.protein != null ? Math.round(entry.protein) : '—'}
      </span>
      <span className="text-xs text-success text-right tabular-nums">
        {entry.carbs != null ? Math.round(entry.carbs) : '—'}
      </span>
      <span className="text-xs text-warning text-right tabular-nums">
        {entry.fat != null ? Math.round(entry.fat) : '—'}
      </span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-text-muted hover:text-danger transition-all text-right"
        aria-label="Remove entry"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ── Main Component — Hevy spreadsheet layout ───────

export function FoodLog() {
  const today = todayISO();
  const entries = useQuery(api.foodLog.list, { entryDate: today });
  const removeEntry = useMutation(api.foodLog.remove);

  if (entries === undefined) {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="p-5 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  // Group entries by meal
  const grouped: Record<string, FoodEntry[]> = {};
  for (const entry of entries) {
    const meal = entry.mealType ?? 'snack';
    if (!grouped[meal]) grouped[meal] = [];
    grouped[meal].push(entry);
  }

  // Totals
  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein: acc.protein + (e.protein ?? 0),
      carbs: acc.carbs + (e.carbs ?? 0),
      fat: acc.fat + (e.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden flex flex-col bg-surface">
      {/* Section header */}
      <div className="flex items-baseline justify-between px-5 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Food Diary
        </h2>
        <span className="text-xs text-text-muted tabular-nums">
          {Math.round(totals.calories)} kcal · {Math.round(totals.protein)}g P
        </span>
      </div>

      {/* Column headers — always visible */}
      <div className={cn(COL_CLASSES, 'items-center px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted/80 border-b border-border bg-bg-subtle/40')}>
        <span>Food</span>
        <span className="text-right">Qty</span>
        <span className="text-right">kcal</span>
        <span className="text-right text-accent/70">P</span>
        <span className="text-right text-success/70">C</span>
        <span className="text-right text-warning/70">F</span>
        <span />
      </div>

      {/* Body — one table, meal separators as sticky-ish rows */}
      <div>
        {MEAL_ORDER.map((meal) => {
          const mealEntries = grouped[meal] ?? [];
          const mealTotals = mealEntries.reduce(
            (acc, e) => ({
              kcal: acc.kcal + (e.calories ?? 0),
              p: acc.p + (e.protein ?? 0),
              c: acc.c + (e.carbs ?? 0),
              f: acc.f + (e.fat ?? 0),
            }),
            { kcal: 0, p: 0, c: 0, f: 0 },
          );
          return (
            <div key={meal}>
              {/* Meal separator row — acts like <thead> inside the body */}
              <div className={cn(COL_CLASSES, 'items-center px-5 py-2 bg-bg-subtle/60 border-b border-border-subtle text-[10px] font-bold uppercase tracking-wider text-text-muted')}>
                <span>{MEAL_LABELS[meal] ?? meal}</span>
                <span />
                <span className="text-right tabular-nums text-text/80">
                  {mealEntries.length > 0 ? Math.round(mealTotals.kcal) : ''}
                </span>
                <span className="text-right tabular-nums text-accent/60">
                  {mealEntries.length > 0 ? `${Math.round(mealTotals.p)}` : ''}
                </span>
                <span className="text-right tabular-nums text-success/60">
                  {mealEntries.length > 0 ? `${Math.round(mealTotals.c)}` : ''}
                </span>
                <span className="text-right tabular-nums text-warning/60">
                  {mealEntries.length > 0 ? `${Math.round(mealTotals.f)}` : ''}
                </span>
                <span />
              </div>
              {/* Rows for this meal */}
              {mealEntries.map((entry) => (
                <FoodRow
                  key={entry._id}
                  entry={entry}
                  onDelete={() => removeEntry({ id: entry._id as Id<'foodLog'> })}
                />
              ))}
              {/* Inline-add row */}
              <InlineAddRow date={today} mealType={meal} />
            </div>
          );
        })}
      </div>

      {/* Totals row */}
      <div className={cn(COL_CLASSES, 'items-center px-5 py-3 border-t border-border bg-bg-subtle/40 text-[11px] font-bold uppercase tracking-wider')}>
        <span className="text-text">Total</span>
        <span />
        <span className="text-right tabular-nums text-text">{Math.round(totals.calories)}</span>
        <span className="text-right tabular-nums text-accent">{Math.round(totals.protein)}g</span>
        <span className="text-right tabular-nums text-success">{Math.round(totals.carbs)}g</span>
        <span className="text-right tabular-nums text-warning">{Math.round(totals.fat)}g</span>
        <span />
      </div>
    </div>
  );
}
