'use client';

// Wraps a page so non-admin users see a "Not authorised" placeholder
// instead of the page contents. Pairs with the nav-side filtering in
// nav.tsx / header-nav.tsx and the ADMIN_ONLY_PAGES list in presets.ts.
//
// Server-side: derived from the `ADMIN_EMAILS` Convex env var via
// `api.roles.getMyRole`. The role check happens client-side here, but
// the data lives on the server — there's no way to forge admin status
// by editing local state. Convex queries that call out admin-only data
// (none yet) should also call `_isAdmin` directly.

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const role = useQuery(api.roles.getMyRole, {});

  // Show a faint skeleton until the role lands — keeps the layout from
  // flashing the "Not authorised" message before we know the answer.
  // `role === undefined` → query still in-flight on the client.
  // `role === null` → auth token not attached yet (re-runs when it lands).
  if (role === undefined || role === null) {
    return (
      <div className="animate-fade-in opacity-60">
        <div className="h-7 w-48 bg-bg-subtle rounded mb-3" />
        <div className="h-3 w-64 bg-bg-subtle rounded" />
      </div>
    );
  }
  if (!role.isAdmin) {
    return (
      <div className="animate-fade-in max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/70">
          Restricted
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Admin only</h1>
        <p className="text-sm text-text-muted">
          This page is in private testing. We'll roll it out to everyone once
          it's stable. If you think you should have access, let us know.
        </p>
        <Link
          href="/today"
          className="inline-block text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-text-muted hover:text-text hover:border-accent/40 transition-colors"
        >
          ← Back to home
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
