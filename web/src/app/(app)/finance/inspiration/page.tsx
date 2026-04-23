'use client';

// Finance — layout chooser. Same shape as /meetings/inspiration: render
// each of the four candidates side-by-side with mock data so the user can
// audition before committing. Selecting a layout writes
// `dashboardConfig.pagePresets.finance` and routes back to /finance.
//
// **Dev-only.** This page is a designer's tool for choosing the production
// layout — it 404s in production builds. Once a layout is committed via
// `presets.ts`, end users get that as the default; they never see the
// chooser UI.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { FinanceInbox } from '@/components/sections/finance-inbox';
import { FinanceMonthlySummary } from '@/components/sections/finance-monthly-summary';
import { FinanceTransactions } from '@/components/sections/finance-transactions';
import { FinanceUploads } from '@/components/sections/finance-uploads';
import { mockFinanceData } from '@/lib/finance-mock';
import { cn } from '@/lib/utils';

interface Candidate {
  presetKey: string;
  name: string;
  tagline: string;
  when: string;
  render: (mock: ReturnType<typeof mockFinanceData>) => React.ReactNode;
}

const CANDIDATES: Candidate[] = [
  {
    presetKey: 'default',
    name: 'Inbox first',
    tagline: 'Triage queue at the top, monthly summary below.',
    when: 'Best when there\'s a backlog of uncategorised rows after each upload.',
    render: (m) => (
      <div className="space-y-4">
        <FinanceInbox transactions={m.uncategorized} categories={m.categories} />
        <FinanceMonthlySummary summary={m.summary} categories={m.categories} />
      </div>
    ),
  },
  {
    presetKey: 'executive',
    name: 'Reports first',
    tagline: 'Monthly summary in the hero slot, transactions below.',
    when: 'Best when the backlog is small and you mostly want to see "where did the money go?".',
    render: (m) => (
      <div className="space-y-4">
        <FinanceMonthlySummary summary={m.summary} categories={m.categories} />
        <FinanceTransactions transactions={m.allTransactions} categories={m.categories} />
      </div>
    ),
  },
  {
    presetKey: 'developer',
    name: 'Ledger',
    tagline: 'Dense transactions table with filters, no chrome.',
    when: 'Best when you want raw scrolling speed across hundreds of rows.',
    render: (m) => (
      <FinanceTransactions transactions={m.allTransactions} categories={m.categories} />
    ),
  },
  {
    presetKey: 'minimalist',
    name: 'Summary only',
    tagline: 'Just this month\'s numbers — nothing else.',
    when: 'Best when you only want to know "am I overspending this month?".',
    render: (m) => (
      <FinanceMonthlySummary summary={m.summary} categories={m.categories} />
    ),
  },
];

export default function FinanceInspirationPage() {
  // Dev-only — production users get a 404 instead of seeing the chooser.
  // The chosen layout is hard-coded into `presets.ts`; end users get that
  // as the default and don't need (or want) the picker UI.
  if (process.env.NODE_ENV === 'production') notFound();

  const router = useRouter();
  const { config, setPagePreset } = useDashboardConfig();
  const [pending, setPending] = useState<string | null>(null);

  const mock = useMemo(() => mockFinanceData(), []);
  const activePreset = config.pagePresets.finance ?? 'default';

  const handleUse = async (presetKey: string) => {
    setPending(presetKey);
    try {
      await setPagePreset('finance', presetKey);
      router.push('/finance');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Choose a finance layout</h1>
          <p className="text-sm text-text-muted mt-1">
            Each preview uses mock data so you can audition layouts before
            uploading a CSV. Pick one — you can always change later from this
            page. Uploads happen on the main /finance page no matter which
            layout you pick.
          </p>
        </div>
        <Link
          href="/finance"
          className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-text-muted hover:text-text hover:border-accent/40 transition-colors shrink-0"
        >
          Back to /finance
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {CANDIDATES.map((c) => {
          const isActive = activePreset === c.presetKey;
          const isPending = pending === c.presetKey;
          return (
            <section
              key={c.presetKey}
              className={cn(
                'rounded-xl border bg-bg-subtle/30 transition-colors',
                isActive ? 'border-accent/50' : 'border-border',
              )}
            >
              <header className="px-5 py-4 flex items-start justify-between gap-3 border-b border-border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-text">{c.name}</h2>
                    {isActive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1">{c.tagline}</p>
                  <p className="text-[11px] text-text-muted/70 italic mt-1">{c.when}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUse(c.presetKey)}
                  disabled={isPending || isActive}
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md transition-colors shrink-0',
                    isActive
                      ? 'border border-border text-text-muted cursor-default'
                      : 'bg-accent text-white hover:bg-accent-hover disabled:opacity-50',
                  )}
                >
                  {isActive ? 'In use' : isPending ? 'Saving…' : 'Use this layout'}
                </button>
              </header>
              <div className="p-4 bg-bg">{c.render(mock)}</div>
            </section>
          );
        })}
      </div>

      {/* The uploads section isn't part of the layout choice — it's always
          on /finance. Show a small preview here for completeness. */}
      <section className="mt-8">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 mb-3">
          Always-on: uploads
        </h2>
        <FinanceUploads statements={mock.statements} />
      </section>
    </div>
  );
}
