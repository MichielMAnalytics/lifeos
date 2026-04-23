'use client';

import Link from 'next/link';
import { PageShell } from '@/components/page-shell';

export default function MeetingsPage() {
  // The "Choose layout" link is a dev-only design tool — it routes to
  // /meetings/inspiration which 404s in production. Hidden in prod so end
  // users don't see a dead link.
  const isDev = process.env.NODE_ENV !== 'production';
  return (
    <PageShell page="meetings" title="Meetings" subtitle="Synced from Granola">
      {isDev && (
        <div className="mt-6 flex justify-end">
          <Link
            href="/meetings/inspiration"
            className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-text-muted hover:text-text hover:border-accent/40 transition-colors"
          >
            Choose layout
          </Link>
        </div>
      )}
    </PageShell>
  );
}
