'use client';

// Marketing — admin-only placeholder. Real content lands once we agree on
// the data model (landing-page experiments, content calendar, outreach
// lists). For now the section just confirms the route exists and is
// gated correctly.

import { AdminGate } from '@/components/admin-gate';

export default function MarketingPage() {
  return (
    <AdminGate>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-text">Marketing</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Growth, distribution, and outreach work
          </p>
        </div>
        <div className="border border-dashed border-border rounded-xl px-6 py-16 text-center space-y-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent/80">
            In progress
          </div>
          <h2 className="text-xl font-semibold text-text">Marketing workspace coming soon</h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            This tab is reserved for landing-page experiments, the content
            calendar, and outreach lists. We'll wire it up once the data model
            is settled.
          </p>
        </div>
      </div>
    </AdminGate>
  );
}
