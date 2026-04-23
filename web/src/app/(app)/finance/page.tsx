'use client';

import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { FinanceUploads } from '@/components/sections/finance-uploads';

export default function FinancePage() {
  // The "Choose layout" link is a dev-only design tool — /finance/inspiration
  // 404s in production. Hidden in prod so end users don't see a dead link.
  const isDev = process.env.NODE_ENV !== 'production';
  return (
    <PageShell page="finance" title="Finance" subtitle="Spend, categorise, learn">
      {/* Uploads card sits below the chosen layout's sections. It's always
          available so the user can drop a CSV without switching tabs. */}
      <div className="mt-6">
        <FinanceUploads />
      </div>
      {isDev && (
        <div className="mt-6 flex justify-end">
          <Link
            href="/finance/inspiration"
            className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-text-muted hover:text-text hover:border-accent/40 transition-colors"
          >
            Choose layout
          </Link>
        </div>
      )}
    </PageShell>
  );
}
