'use client';

// Google Calendar connection card (admin-only surface in Settings →
// Integrations). Mirrors the GranolaSetup UX but with a browser-redirect
// OAuth flow instead of an API key paste:
//
//   • Click Connect → we call `googleAuth.getAuthorizeUrl` to mint a
//     fresh state token, then redirect the tab to Google's consent
//     screen.
//   • Google redirects to our Convex HTTP callback (/oauth/google/
//     callback), which exchanges the code and stashes tokens in Secret
//     Manager, then redirects back to /settings?google=connected.
//   • The `useQuery(googleAuthHelpers.getStatus)` hook re-runs on the
//     redirect and the card flips to the connected state.

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

export function GoogleCalendarSetup() {
  const status = useQuery(api.googleAuthHelpers.getStatus);
  const getAuthorizeUrl = useAction(api.googleAuth.getAuthorizeUrl);
  const disconnect = useAction(api.googleAuth.disconnect);
  const syncNow = useAction(api.googleCalendar.syncNow);

  const router = useRouter();
  const params = useSearchParams();

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // React to the redirect-back query params. We strip them from the URL
  // after reading so a page refresh doesn't re-trigger the banner.
  useEffect(() => {
    const googleResult = params.get('google');
    if (!googleResult) return;
    const detail = params.get('detail');
    if (googleResult === 'connected') {
      setBanner('Google Calendar connected. First sync running in the background.');
    } else if (googleResult === 'error') {
      setError(`Google sign-in failed${detail ? `: ${detail}` : ''}`);
    }
    const next = new URLSearchParams(params);
    next.delete('google');
    next.delete('detail');
    const qs = next.toString();
    router.replace(qs ? `/settings?${qs}` : '/settings');
    // run once per value of googleResult
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('google')]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  if (status === undefined) {
    return (
      <div className="border border-border rounded-xl p-4 animate-pulse">
        <div className="h-3 w-32 bg-surface rounded" />
      </div>
    );
  }

  async function handleConnect() {
    setError(null);
    setConnecting(true);
    try {
      const res = await getAuthorizeUrl({});
      window.location.href = res.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setError(null);
    try {
      await disconnect();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const r = await syncNow({});
      if (!r.ok) {
        setError(`Sync failed: ${r.reason ?? 'unknown'}`);
      } else {
        setBanner(
          `Synced. Pages ${r.stats?.pages ?? 0}, inserted ${r.stats?.inserted ?? 0}, updated ${r.stats?.updated ?? 0}, deleted ${r.stats?.deleted ?? 0}.`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  const connected = !!status?.connected;

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">
            {connected ? 'Connected' : 'Not connected'}
          </p>
          {connected && status?.email && (
            <p className="text-xs text-text-muted mt-0.5">
              As {status.email}
            </p>
          )}
          {connected && status?.syncedAt && (
            <p className="text-[10px] text-text-muted/70 mt-1">
              Last sync {new Date(status.syncedAt).toLocaleString()}
            </p>
          )}
          {connected && status?.syncError && (
            <p className="text-[11px] text-warning mt-1">{status.syncError}</p>
          )}
          {!connected && (
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Read-only access to your Google Calendar. Events appear in the
              Upcoming tab on /meetings and populate Meeting Preps.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {connected ? (
            <>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-text-muted hover:text-text hover:border-accent/40 transition-colors disabled:opacity-50"
              >
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-text-muted hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-50"
              >
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {connecting ? 'Redirecting…' : 'Connect'}
            </button>
          )}
        </div>
      </div>
      {banner && (
        <div className="text-[11px] text-success bg-success/10 border border-success/20 rounded px-3 py-2">
          {banner}
        </div>
      )}
      {error && (
        <div className={cn(
          'text-[11px] bg-warning/10 border border-warning/20 rounded px-3 py-2 whitespace-pre-wrap',
          'text-warning',
        )}>
          {error}
        </div>
      )}
    </div>
  );
}
