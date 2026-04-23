'use client';

// Per-route error boundary. Surfaces the actual error to the user (and to
// us when they screenshot it) instead of the generic Next.js global fallback
// that just says "Application error". The default export is required by
// Next.js's app-router error convention.

import { useEffect } from 'react';

export default function MeetingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[meetings] section error:', error);
  }, [error]);

  return (
    <div className="px-6 py-8">
      <div className="border border-danger/40 bg-danger/5 rounded-xl p-6 max-w-2xl">
        <h2 className="text-lg font-bold text-text mb-2">Meetings failed to load</h2>
        <p className="text-sm text-text-muted mb-4">
          Something threw on the client. Send Claude this message and the stack:
        </p>
        <pre className="text-xs bg-bg-subtle border border-border rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap break-all">
          <strong>{error.name}: {error.message}</strong>
          {error.digest && `\n\ndigest: ${error.digest}`}
          {error.stack && `\n\n${error.stack}`}
        </pre>
        <button
          type="button"
          onClick={reset}
          className="mt-4 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
