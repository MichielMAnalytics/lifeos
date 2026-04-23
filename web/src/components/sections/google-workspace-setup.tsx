'use client';

// Google Workspace setup card.
//
// The OAuth scopes (Calendar, Gmail, Drive, Tasks, Docs, Sheets, Contacts)
// are requested up-front during Google sign-in. This card surfaces the
// connection status and gives existing users — who signed in before the
// Workspace scopes were added — a one-click "Reconnect" path that
// re-triggers the consent screen so they can grant the missing scopes.

import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

type Status = {
  connected: boolean;
  connectedAt?: number;
  scopes?: string[];
  googleEmail?: string;
  accessExpiresAt?: number;
};

type ActionState =
  | { state: 'idle' }
  | { state: 'pending' }
  | { state: 'error'; reason: string };

const EXPECTED_SCOPE_COUNT = 8;

const SERVICE_LIST: Array<{ name: string; access: string }> = [
  { name: 'Calendar', access: 'read + write' },
  { name: 'Gmail', access: 'read, label, send drafts' },
  { name: 'Drive', access: 'file create + edit' },
  { name: 'Tasks', access: 'read + write' },
  { name: 'Docs', access: 'read + write' },
  { name: 'Sheets', access: 'read + write' },
  { name: 'Contacts', access: 'read-only' },
];

export function GoogleWorkspaceSetup() {
  const getStatus = useAction(api.googleAuth.getStatus);
  const disconnect = useAction(api.googleAuth.disconnect);
  const { signIn } = useAuthActions();

  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [connectState, setConnectState] = useState<ActionState>({ state: 'idle' });
  const [disconnectState, setDisconnectState] = useState<ActionState>({ state: 'idle' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getStatus();
        if (!cancelled) setStatus(res);
      } catch {
        if (!cancelled) setStatus({ connected: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getStatus]);

  if (status === undefined) {
    return (
      <div className="border border-border rounded-xl p-4 animate-pulse">
        <div className="h-3 w-32 bg-surface rounded" />
      </div>
    );
  }

  const isConnected = status.connected;
  const grantedScopes = status.scopes ?? [];
  const needsMoreScopes =
    isConnected && (!status.scopes || status.scopes.length < EXPECTED_SCOPE_COUNT);

  async function handleReconnect() {
    setConnectState({ state: 'pending' });
    try {
      await signIn('google');
      const refreshed = await getStatus();
      setStatus(refreshed);
      setConnectState({ state: 'idle' });
    } catch (err) {
      setConnectState({
        state: 'error',
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleDisconnect() {
    const ok = window.confirm(
      'Disconnect Google Workspace? Calendar/Gmail/Drive features will stop working until you reconnect.',
    );
    if (!ok) return;
    setDisconnectState({ state: 'pending' });
    try {
      await disconnect();
      const refreshed = await getStatus();
      setStatus(refreshed);
      setDisconnectState({ state: 'idle' });
    } catch (err) {
      setDisconnectState({
        state: 'error',
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <div className="border border-border rounded-xl">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'h-2 w-2 rounded-full shrink-0',
              isConnected ? 'bg-success' : 'bg-warning',
            )}
            aria-hidden
          />
          <h3 className="text-sm font-semibold text-text">Google Workspace</h3>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80">
            {isConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        {isConnected && (
          <button
            type="button"
            onClick={handleReconnect}
            disabled={connectState.state === 'pending'}
            className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-md border border-accent/30 text-accent hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
          >
            {connectState.state === 'pending' ? 'Reconnecting…' : 'Reconnect'}
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {!isConnected && (
          <>
            <p className="text-xs text-text-muted leading-relaxed">
              Connect your Google account to read + write calendar events, send
              Gmail drafts, save to Drive, and more. We request all scopes
              up-front so you only consent once.
            </p>
            <ul className="text-xs text-text-muted leading-relaxed space-y-1 ml-1">
              {SERVICE_LIST.map((svc) => (
                <li key={svc.name} className="flex items-baseline gap-2">
                  <span className="text-text-muted/60">·</span>
                  <span>
                    <strong className="text-text font-medium">{svc.name}</strong>{' '}
                    <span className="text-text-muted/80">({svc.access})</span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleReconnect}
              disabled={connectState.state === 'pending'}
              className="text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {connectState.state === 'pending'
                ? 'Connecting…'
                : 'Connect Google Workspace'}
            </button>
          </>
        )}

        {isConnected && (
          <div className="space-y-2 text-xs text-text-muted">
            {status.googleEmail && (
              <p>
                Linked to{' '}
                <code className="text-text bg-bg-subtle px-1 rounded">
                  {status.googleEmail}
                </code>
                .
              </p>
            )}
            <details className="group">
              <summary className="cursor-pointer text-xs text-text-muted hover:text-text transition-colors list-none flex items-center gap-1.5">
                <span className="text-text-muted/60 group-open:rotate-90 transition-transform inline-block">
                  ›
                </span>
                Granted {grantedScopes.length} scope
                {grantedScopes.length === 1 ? '' : 's'}
              </summary>
              {grantedScopes.length > 0 && (
                <ul className="mt-2 ml-4 space-y-1 font-mono text-[11px] text-text-muted/90">
                  {grantedScopes.map((scope) => (
                    <li key={scope}>{shortScope(scope)}</li>
                  ))}
                </ul>
              )}
            </details>
            <p className="text-[11px] text-text-muted/80">
              Access token refreshes automatically.
            </p>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnectState.state === 'pending'}
              className="text-text-muted hover:text-danger transition-colors"
            >
              {disconnectState.state === 'pending' ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        )}

        {needsMoreScopes && (
          <div className="text-xs text-warning bg-warning/5 border border-warning/30 rounded-md px-3 py-2">
            Need extra scopes? Click <strong>Reconnect</strong> to re-grant access.
          </div>
        )}

        {connectState.state === 'error' && (
          <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
            <strong>Connection failed:</strong> {connectState.reason}
          </div>
        )}

        {disconnectState.state === 'error' && (
          <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
            <strong>Disconnect failed:</strong> {disconnectState.reason}
          </div>
        )}
      </div>
    </div>
  );
}

function shortScope(scope: string): string {
  const idx = scope.lastIndexOf('/');
  return idx >= 0 ? scope.slice(idx + 1) : scope;
}
