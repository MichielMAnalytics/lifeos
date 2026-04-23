'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc, Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

type Transaction = Doc<'financeTransactions'>;
type Category = Doc<'financeCategories'>;
type Filter = 'all' | 'categorized' | 'uncategorized' | 'excluded';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'categorized', label: 'Categorised' },
  { key: 'uncategorized', label: 'Uncategorised' },
  { key: 'excluded', label: 'Excluded' },
];

const RENDER_CAP = 200;

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function FinanceTransactions({
  transactions,
  categories,
}: {
  transactions?: Transaction[];
  categories?: Category[];
} = {}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<Id<'financeTransactions'> | null>(null);
  const [pendingId, setPendingId] = useState<Id<'financeTransactions'> | null>(null);

  const queriedTx = useQuery(
    api.financeTransactions.list,
    transactions ? 'skip' : { limit: RENDER_CAP },
  );
  const queriedCats = useQuery(
    api.financeCategories.list,
    categories ? 'skip' : {},
  );

  const categorize = useMutation(api.financeTransactions.categorize);
  const setExcluded = useMutation(api.financeTransactions.setExcluded);
  const remove = useMutation(api.financeTransactions.remove);

  const tx = transactions ?? queriedTx;
  const cats = categories ?? queriedCats;

  const categoryMap = useMemo(() => {
    const map = new Map<Id<'financeCategories'>, Category>();
    for (const c of cats ?? []) map.set(c._id, c);
    return map;
  }, [cats]);

  const filtered = useMemo(() => {
    if (!tx) return [];
    if (filter === 'all') return tx;
    return tx.filter((t) => t.status === filter);
  }, [tx, filter]);

  const visible = filtered.slice(0, RENDER_CAP);

  if (tx === undefined || cats === undefined) return <SkeletonRows />;

  const runMutation = async (
    id: Id<'financeTransactions'>,
    fn: () => Promise<unknown>,
  ) => {
    setPendingId(id);
    try {
      await fn();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-5 py-3 border-b border-border">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
            Transactions
          </h3>
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-md transition-colors',
                  filter === f.key
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted/70 hover:bg-surface-hover hover:text-text',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-[10px] text-text-muted/70 tabular-nums">
          {visible.length} {visible.length === 1 ? 'row' : 'rows'}
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="divide-y divide-border">
          {visible.map((t) => {
            const isOpen = expandedId === t._id;
            const isPending = pendingId === t._id;
            const isExcluded = t.status === 'excluded';
            const cat = t.categoryId ? categoryMap.get(t.categoryId) : undefined;
            const display = t.amountUsd ?? t.amount;
            const amountText = usdFormatter.format(Math.abs(display));
            const isPositive = display > 0 || t.isIncome;

            return (
              <div key={t._id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : t._id)}
                  className={cn(
                    'group w-full text-left grid grid-cols-[60px_12px_1fr_60px_100px] gap-3 items-center px-5 py-2.5 transition-colors',
                    isOpen ? 'bg-surface-hover' : 'hover:bg-surface-hover',
                    isExcluded && 'opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'text-[10px] text-text-muted/80 tabular-nums truncate',
                      isExcluded && 'line-through',
                    )}
                  >
                    {formatDate(t.date)}
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: cat?.color ?? 'transparent',
                      border: cat ? 'none' : '1px dashed var(--border)',
                    }}
                    title={cat?.name ?? 'Uncategorised'}
                  />
                  <span
                    className={cn(
                      'text-sm truncate',
                      isExcluded ? 'text-text-muted line-through' : 'text-text',
                    )}
                  >
                    {t.description || t.merchantRaw || 'Untitled'}
                  </span>
                  <span className="flex justify-start">
                    <span className="inline-flex text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-bg-subtle text-text-muted/80">
                      {t.source}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'text-sm tabular-nums text-right',
                      isExcluded
                        ? 'text-text-muted line-through'
                        : isPositive
                          ? 'text-success'
                          : 'text-text',
                    )}
                  >
                    {isPositive ? '+' : '−'}
                    {amountText}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 py-4 bg-bg-subtle/40 border-t border-border space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] uppercase tracking-wider text-text-muted/80 w-20">
                        Category
                      </label>
                      <select
                        value={t.categoryId ?? ''}
                        disabled={isPending}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!value) return;
                          void runMutation(t._id, () =>
                            categorize({
                              id: t._id,
                              categoryId: value as Id<'financeCategories'>,
                            }),
                          );
                        }}
                        className="text-xs bg-surface border border-border rounded-md px-2 py-1 text-text focus:outline-none focus:border-accent disabled:opacity-50"
                      >
                        <option value="" disabled>
                          Select category…
                        </option>
                        {(cats ?? []).map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {cat && (
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      )}
                    </div>

                    {t.currency && t.currency.toUpperCase() !== 'USD' && t.amountUsd !== undefined && (
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase tracking-wider text-text-muted/80 w-20">
                          Original
                        </span>
                        <span className="text-xs text-text-muted tabular-nums">
                          {formatAmount(Math.abs(t.amount), t.currency)} → {usdFormatter.format(Math.abs(t.amountUsd))}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <label className="text-[10px] uppercase tracking-wider text-text-muted/80 w-20">
                        Exclude
                      </label>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          void runMutation(t._id, () =>
                            setExcluded({ id: t._id, excluded: !isExcluded }),
                          )
                        }
                        className={cn(
                          'text-[10px] px-2 py-1 rounded-md transition-colors disabled:opacity-50',
                          isExcluded
                            ? 'bg-accent/15 text-accent'
                            : 'bg-surface border border-border text-text-muted hover:text-text',
                        )}
                      >
                        {isExcluded ? 'Excluded from reports' : 'Exclude from reports'}
                      </button>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (!confirm('Delete this transaction?')) return;
                          void runMutation(t._id, async () => {
                            await remove({ id: t._id });
                            setExpandedId(null);
                          });
                        }}
                        className="text-[10px] text-danger hover:underline disabled:opacity-50"
                      >
                        Delete row
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-3 border-b border-border">
        <div className="h-3 w-32 bg-bg-subtle rounded" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-5 py-2.5 h-7 bg-bg-subtle/40" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const message =
    filter === 'categorized'
      ? 'No categorised transactions yet'
      : filter === 'uncategorized'
        ? 'Inbox zero — nothing uncategorised'
        : filter === 'excluded'
          ? 'No excluded rows'
          : 'No transactions to show. Upload a CSV in the Uploads tab to get started.';

  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}
