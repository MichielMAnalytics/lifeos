'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc, Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatShortDate(yyyyMmDd: string): string {
  const parts = yyyyMmDd.split('-');
  if (parts.length < 3) return yyyyMmDd;
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (Number.isNaN(month) || Number.isNaN(day) || month < 0 || month > 11) return yyyyMmDd;
  return `${MONTHS[month]} ${day}`;
}

function formatAmount(t: Doc<'financeTransactions'>): string {
  if (typeof t.amountUsd === 'number') return usdFmt.format(t.amountUsd);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: t.currency }).format(t.amount);
  } catch {
    return `${t.amount.toFixed(2)} ${t.currency}`;
  }
}

interface Props {
  transactions?: Doc<'financeTransactions'>[];
  categories?: Doc<'financeCategories'>[];
}

export function FinanceInbox({ transactions, categories }: Props = {}) {
  const queriedTxns = useQuery(
    api.financeTransactions.uncategorized,
    transactions ? 'skip' : {},
  );
  const queriedCats = useQuery(api.financeCategories.list, categories ? 'skip' : {});
  const seedDefaults = useMutation(api.financeCategories.seedDefaults);
  const categorize = useMutation(api.financeTransactions.categorize);
  const applySuggestions = useMutation(api.financeTransactions.applySuggestions);
  const setExcluded = useMutation(api.financeTransactions.setExcluded);
  const suggestNow = useAction(api.financeAi.suggestNow);

  const [suggesting, setSuggesting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<Id<'financeTransactions'> | null>(null);
  const [needsOpenAi, setNeedsOpenAi] = useState(false);
  const seededRef = useRef(false);

  const txns = transactions ?? queriedTxns;
  const cats = categories ?? queriedCats;

  // New users land on the finance page with an empty taxonomy. Idempotent
  // server-side, so a single mount-scoped guard is enough.
  useEffect(() => {
    if (transactions || categories) return;
    if (seededRef.current) return;
    if (cats === undefined) return;
    if (cats.length > 0) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    void seedDefaults({});
  }, [cats, seedDefaults, transactions, categories]);

  const catsById = useMemo(() => {
    const map = new Map<Id<'financeCategories'>, Doc<'financeCategories'>>();
    for (const c of cats ?? []) map.set(c._id, c);
    return map;
  }, [cats]);

  if (txns === undefined || cats === undefined) return <SkeletonList />;

  const suggestedIds = txns
    .filter((t) => t.suggestedCategoryId)
    .map((t) => t._id);

  const handleSuggestNow = async () => {
    if (suggesting) return;
    setSuggesting(true);
    try {
      const res = await suggestNow({});
      // The action returns ok:true with `missingApiKey: true` when the
      // user hasn't connected an OpenAI key — surface that explicitly so
      // they aren't left wondering why nothing changed.
      if (res.ok && 'missingApiKey' in res && res.missingApiKey) {
        setNeedsOpenAi(true);
      } else {
        setNeedsOpenAi(false);
      }
    } finally {
      setSuggesting(false);
    }
  };

  const handleAcceptAll = async () => {
    if (accepting || suggestedIds.length === 0) return;
    setAccepting(true);
    try {
      await applySuggestions({ ids: suggestedIds });
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-5 py-3 border-b border-border">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
            Inbox
          </h3>
          <span className="text-[10px] text-text-muted/70 tabular-nums">
            {txns.length} uncategorised
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSuggestNow}
            disabled={suggesting || txns.length === 0}
            className="text-[10px] uppercase tracking-[0.08em] text-text-muted hover:text-text disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {suggesting && (
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
            )}
            {suggesting ? 'Suggesting' : 'Suggest now'}
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            disabled={accepting || suggestedIds.length === 0}
            className="text-[10px] uppercase tracking-[0.08em] px-2 py-1 rounded border border-border text-text hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Accept all{suggestedIds.length > 0 ? ` (${suggestedIds.length})` : ''}
          </button>
        </div>
      </div>

      {needsOpenAi && (
        <div className="px-5 py-2 border-b border-border bg-warning/5 text-[11px] text-text-muted">
          AI suggestions skipped — no OpenAI key on file. Connect it in
          Settings → AI Agent → BYOK to enable LLM categorisation. Merchant
          memory still works without it.
        </div>
      )}

      {txns.length === 0 ? (
        <div className="px-5 py-10 text-center space-y-1">
          <p className="text-sm text-text-muted">Inbox zero.</p>
          <p className="text-xs text-text-muted/70">
            All caught up — upload a CSV in the Uploads tab to add more.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {txns.map((t) => {
            const suggested = t.suggestedCategoryId ? catsById.get(t.suggestedCategoryId) : undefined;
            const isPositive = t.amount > 0;
            const menuOpen = openMenuId === t._id;
            return (
              <div
                key={t._id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-surface-hover transition-colors"
              >
                <span className="text-[11px] font-mono text-text-muted/80 w-10 shrink-0 tabular-nums">
                  {formatShortDate(t.date)}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text truncate">{t.description}</p>
                  {t.merchantRaw && t.merchantRaw !== t.description && (
                    <p className="text-[11px] text-text-muted/70 truncate mt-0.5">
                      {t.merchantRaw}
                    </p>
                  )}
                </div>

                {suggested && (
                  <button
                    type="button"
                    onClick={() => void categorize({ id: t._id, categoryId: suggested._id })}
                    className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-bg-subtle hover:bg-surface-hover hover:border-accent/40 transition-colors text-[11px] text-text"
                    title="Accept suggestion"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: suggested.color }}
                    />
                    <span className="truncate max-w-[120px]">{suggested.name}</span>
                    {typeof t.suggestionConfidence === 'number' && (
                      <span className="text-text-muted/60 tabular-nums">
                        · {Math.round(t.suggestionConfidence * 100)}%
                      </span>
                    )}
                    <span className="text-text-muted/70 ml-0.5">
                      {t.suggestionSource === 'llm' ? '✨' : 'memory'}
                    </span>
                  </button>
                )}

                <span
                  className={cn(
                    'shrink-0 text-sm font-mono tabular-nums w-24 text-right',
                    isPositive ? 'text-success' : 'text-danger',
                  )}
                >
                  {formatAmount(t)}
                </span>

                <RowMenu
                  txn={t}
                  categories={cats}
                  open={menuOpen}
                  onOpenChange={(open) => setOpenMenuId(open ? t._id : null)}
                  onPick={(catId) => {
                    setOpenMenuId(null);
                    void categorize({ id: t._id, categoryId: catId });
                  }}
                  onExclude={() => {
                    setOpenMenuId(null);
                    void setExcluded({ id: t._id, excluded: true });
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RowMenu({
  txn,
  categories,
  open,
  onOpenChange,
  onPick,
  onExclude,
}: {
  txn: Doc<'financeTransactions'>;
  categories: Doc<'financeCategories'>[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (id: Id<'financeCategories'>) => void;
  onExclude: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-7 w-7 items-center justify-center rounded border border-border text-text-muted hover:text-text hover:border-text-muted/40 transition-colors"
        title="More"
        aria-label="More actions"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 max-h-72 overflow-y-auto rounded-lg border border-border bg-bg shadow-lg z-20 py-1">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-text-muted/70 border-b border-border">
            Pick category
          </div>
          {categories.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => onPick(c._id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-surface-hover transition-colors',
                txn.suggestedCategoryId === c._id && 'bg-bg-subtle',
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="flex-1 truncate text-text">{c.name}</span>
              {c.isIncome && (
                <span className="text-[9px] uppercase tracking-wider text-success/80">in</span>
              )}
            </button>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <button
              type="button"
              onClick={onExclude}
              className="w-full text-left px-3 py-1.5 text-xs text-text-muted hover:text-danger hover:bg-surface-hover transition-colors"
            >
              Exclude from totals
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full text-left px-3 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-3 border-b border-border">
        <div className="h-3 w-24 bg-bg-subtle rounded" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="h-3 w-10 bg-bg-subtle rounded" />
            <div className="h-3 flex-1 bg-bg-subtle rounded" />
            <div className="h-5 w-20 bg-bg-subtle rounded-md" />
            <div className="h-3 w-16 bg-bg-subtle rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
