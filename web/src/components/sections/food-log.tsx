'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Skeleton } from '@/components/ui/skeleton';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

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
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-border space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          placeholder="Food name..."
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50"
        />
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          className="bg-surface border border-border rounded-lg px-2 py-2 text-sm text-text focus:outline-none focus:border-accent/50"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty (e.g. 200g)"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 w-24" />
        <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)}
          placeholder="kcal"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 w-20" />
        <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)}
          placeholder="P (g)"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 w-20" />
        <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)}
          placeholder="C (g)"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 w-20" />
        <input type="number" value={fat} onChange={(e) => setFat(e.target.value)}
          placeholder="F (g)"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 w-20" />
        <button type="submit" disabled={!name.trim()}
          className="px-4 py-2 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-40">
          Add
        </button>
      </div>
    </form>
  );
}

// ── Inline Add Row (Section 8A — Hevy-style spreadsheet) ──
// Always-visible row at the end of each meal section. Tab-through cells.
// Enter or Cmd+Enter saves and starts a new row in place.

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
      // Re-focus to keep ripping through entries
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
    <div className="flex items-center gap-3 px-5 py-2 group">
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKey}
        placeholder="+ Add food"
        className="flex-1 min-w-0 bg-transparent text-sm text-text placeholder:text-text-muted/50 focus:outline-none border-b border-transparent focus:border-accent/40"
      />
      <input
        type="text"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        onKeyDown={handleKey}
        placeholder="qty"
        className="w-12 bg-transparent text-xs text-text placeholder:text-text-muted/50 focus:outline-none text-right"
      />
      <input
        type="number"
        value={kcal}
        onChange={(e) => setKcal(e.target.value)}
        onKeyDown={handleKey}
        placeholder="kcal"
        className="w-14 bg-transparent text-xs tabular-nums text-text placeholder:text-text-muted/50 focus:outline-none text-right"
      />
      <input
        type="number"
        value={p}
        onChange={(e) => setP(e.target.value)}
        onKeyDown={handleKey}
        placeholder="P"
        className="w-10 bg-transparent text-xs tabular-nums text-accent placeholder:text-text-muted/50 focus:outline-none text-right"
      />
      <input
        type="number"
        value={c}
        onChange={(e) => setC(e.target.value)}
        onKeyDown={handleKey}
        placeholder="C"
        className="w-10 bg-transparent text-xs tabular-nums text-success placeholder:text-text-muted/50 focus:outline-none text-right"
      />
      <input
        type="number"
        value={f}
        onChange={(e) => setF(e.target.value)}
        onKeyDown={handleKey}
        placeholder="F"
        className="w-10 bg-transparent text-xs tabular-nums text-warning placeholder:text-text-muted/50 focus:outline-none text-right"
      />
      <span className="shrink-0 w-3 text-[10px] text-text-muted/40">{saving ? '…' : ''}</span>
    </div>
  );
}

// ── Food Entry Row ──────────────────────────────────

function FoodEntryRow({ entry, onDelete }: {
  entry: { _id: string; name: string; quantity?: string | null; calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null };
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-surface-hover transition-colors group">
      <span className="text-sm text-text flex-1 min-w-0 truncate">{entry.name}</span>
      {entry.quantity && (
        <span className="text-xs text-text-muted shrink-0">{entry.quantity}</span>
      )}
      <span className="text-xs tabular-nums text-text-muted shrink-0 w-14 text-right">
        {entry.calories ? `${Math.round(entry.calories)}` : '-'}
        <span className="text-text-muted/70 ml-0.5">kcal</span>
      </span>
      <span className="text-xs tabular-nums text-accent shrink-0 w-10 text-right">
        {entry.protein ? `${Math.round(entry.protein)}g` : '-'}
      </span>
      <span className="text-xs tabular-nums text-success shrink-0 w-10 text-right">
        {entry.carbs ? `${Math.round(entry.carbs)}g` : '-'}
      </span>
      <span className="text-xs tabular-nums text-warning shrink-0 w-10 text-right">
        {entry.fat ? `${Math.round(entry.fat)}g` : '-'}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-text-muted hover:text-danger transition-all shrink-0"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────

export function FoodLog() {
  const today = todayISO();
  const entries = useQuery(api.foodLog.list, { entryDate: today });
  const removeEntry = useMutation(api.foodLog.remove);
  const [showForm, setShowForm] = useState(false);

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

  // Group entries by meal type
  const grouped: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const meal = entry.mealType ?? 'snack';
    if (!grouped[meal]) grouped[meal] = [];
    grouped[meal].push(entry);
  }

  // Calculate totals
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
    <div className="border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-baseline justify-between px-5 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Food Diary
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-text-muted hover:text-accent transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Food'}
        </button>
      </div>

      {showForm && (
        <AddFoodForm date={today} onClose={() => setShowForm(false)} />
      )}

      {/* Column headers */}
      {entries.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-2 border-b border-border/30 text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted/70">
          <span className="flex-1">Food</span>
          <span className="shrink-0 w-14 text-right">Cal</span>
          <span className="shrink-0 w-10 text-right">Prot</span>
          <span className="shrink-0 w-10 text-right">Carb</span>
          <span className="shrink-0 w-10 text-right">Fat</span>
          <span className="shrink-0 w-3" />
        </div>
      )}

      {entries.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-text-muted">No food logged today</p>
          <p className="text-xs text-text-muted mt-1">Click + Add Food to start tracking</p>
        </div>
      ) : (
        <div>
          {MEAL_ORDER.map((meal) => {
            const mealEntries = grouped[meal] ?? [];
            return (
              <div key={meal}>
                <div className="px-5 py-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted/80 bg-surface/30 flex items-center justify-between">
                  <span>{MEAL_LABELS[meal] ?? meal}</span>
                  {mealEntries.length > 0 && (
                    <span className="tabular-nums">
                      {Math.round(mealEntries.reduce((s, e) => s + (e.calories ?? 0), 0))} kcal
                    </span>
                  )}
                </div>
                {mealEntries.map((entry) => (
                  <FoodEntryRow
                    key={entry._id}
                    entry={entry}
                    onDelete={() => removeEntry({ id: entry._id })}
                  />
                ))}
                {/* Section 8A — always-visible inline add row */}
                <InlineAddRow date={today} mealType={meal} />
              </div>
            );
          })}

          {/* Totals row */}
          <div className="flex items-center gap-3 px-5 py-3 border-t border-border bg-surface/50">
            <span className="text-xs font-semibold text-text flex-1">Total</span>
            <span className="text-xs font-semibold tabular-nums text-text shrink-0 w-14 text-right">
              {Math.round(totals.calories)}
            </span>
            <span className="text-xs font-semibold tabular-nums text-accent shrink-0 w-10 text-right">
              {Math.round(totals.protein)}g
            </span>
            <span className="text-xs font-semibold tabular-nums text-success shrink-0 w-10 text-right">
              {Math.round(totals.carbs)}g
            </span>
            <span className="text-xs font-semibold tabular-nums text-warning shrink-0 w-10 text-right">
              {Math.round(totals.fat)}g
            </span>
            <span className="shrink-0 w-3" />
          </div>
        </div>
      )}
    </div>
  );
}
