'use client';

// Granola integration setup card.
//
// Mirrors the TelegramSetup pattern: the API key is verified before we
// stash it in GCP Secret Manager (via `connectGranola` action), and only
// the connection / sync timestamps live in the user row so the dashboard
// can render status without a Secret Manager round-trip on every render.
//
// Connection flow:
//   1. User pastes a `grn_…` Personal API key from
//      https://app.granola.ai/settings/api-keys
//   2. We probe the Granola API with the key (validates it before we
//      cache it).
//   3. On success we write to Secret Manager + stamp the user row.
//   4. The hourly cron starts pulling the user's notes; the user can
//      also tap "Sync now" to force an immediate pull.

import { useEffect, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

type ConnectState =
  | { state: 'idle' }
  | { state: 'connecting' }
  | { state: 'connected' }
  | { state: 'error'; reason: string };

type SyncState =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'done'; created: number; updated: number }
  | { state: 'error'; reason: string };

export function GranolaSetup() {
  const status = useQuery(api.granola.getStatus);
  const connect = useAction(api.granolaSync.connectGranola);
  const disconnect = useAction(api.granolaSync.disconnectGranola);
  const triggerSync = useAction(api.granolaSync.triggerSync);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [connectState, setConnectState] = useState<ConnectState>({ state: 'idle' });
  const [syncState, setSyncState] = useState<SyncState>({ state: 'idle' });

  useEffect(() => {
    if (syncState.state !== 'done') return;
    const t = setTimeout(() => setSyncState({ state: 'idle' }), 4000);
    return () => clearTimeout(t);
  }, [syncState.state]);

  if (status === undefined) {
    return (
      <div className="border border-border rounded-xl p-4 animate-pulse">
        <div className="h-3 w-32 bg-surface rounded" />
      </div>
    );
  }

  const isConnected = status?.connected ?? false;

  async function handleConnect() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setConnectState({ state: 'connecting' });
    try {
      const res = await connect({ apiKey: trimmed });
      if (res.ok) {
        setConnectState({ state: 'connected' });
        setEditing(false);
        setDraft('');
        // Trigger an immediate sync so the user sees meetings show up
        // without waiting an hour for the cron.
        await handleSync();
      } else {
        setConnectState({ state: 'error', reason: res.reason });
      }
    } catch (err) {
      setConnectState({
        state: 'error',
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleDisconnect() {
    setConnectState({ state: 'connecting' });
    try {
      await disconnect();
      setConnectState({ state: 'idle' });
    } catch (err) {
      setConnectState({
        state: 'error',
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleSync() {
    setSyncState({ state: 'syncing' });
    try {
      const res = await triggerSync();
      if (res.ok) {
        setSyncState({ state: 'done', created: res.created, updated: res.updated });
      } else {
        setSyncState({ state: 'error', reason: res.reason });
      }
    } catch (err) {
      setSyncState({
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
          <h3 className="text-sm font-semibold text-text">Granola</h3>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80">
            {isConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        {isConnected && !editing && (
          <button
            type="button"
            onClick={handleSync}
            disabled={syncState.state === 'syncing'}
            className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-md border border-accent/30 text-accent hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
          >
            {syncState.state === 'syncing' ? 'Syncing…' : 'Sync now'}
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {!isConnected && !editing && (
          <>
            <p className="text-xs text-text-muted leading-relaxed">
              Pull your meeting notes from Granola so the dashboard and your
              Telegram bot can answer questions about them. We poll every hour
              — meetings show up shortly after Granola finishes processing.
            </p>
            <ol className="text-xs text-text-muted leading-relaxed list-decimal list-inside space-y-1 ml-1">
              <li>
                In Granola, open{' '}
                <a
                  href="https://app.granola.ai/settings/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  Settings → API keys
                </a>{' '}
                and create a Personal API key (requires Business or Enterprise).
              </li>
              <li>
                Copy the key — it starts with <code className="text-text bg-bg-subtle px-1 rounded">grn_</code>.
              </li>
              <li>Paste it below. We&apos;ll verify it before storing.</li>
            </ol>
            <button
              type="button"
              onClick={() => {
                setDraft('');
                setConnectState({ state: 'idle' });
                setEditing(true);
              }}
              className="text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Connect Granola
            </button>
          </>
        )}

        {editing && (
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80 block">
              Granola API key
            </label>
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="grn_…"
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-bg-subtle border border-border rounded-lg px-3 py-2 text-sm font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={connectState.state === 'connecting' || !draft.trim()}
                className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {connectState.state === 'connecting' ? 'Verifying…' : 'Connect'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setConnectState({ state: 'idle' });
                }}
                className="text-[11px] font-medium text-text-muted hover:text-text transition-colors px-2 py-1.5"
              >
                Cancel
              </button>
            </div>
            <p className="text-[11px] text-text-muted/80">
              The key never leaves Convex secrets. We verify it against /v1/notes
              before storing — bad keys never get cached.
            </p>
          </div>
        )}

        {isConnected && !editing && (
          <div className="space-y-2 text-xs text-text-muted">
            <p>
              Connected{' '}
              {status?.connectedAt
                ? `${formatRelative(status.connectedAt)}`
                : 'just now'}
              {' · '}
              Last sync{' '}
              {status?.syncedAt ? formatRelative(status.syncedAt) : 'pending'}
              {syncState.state === 'done' && (
                <span className="ml-2 text-success">
                  +{syncState.created} new, {syncState.updated} updated
                </span>
              )}
            </p>
            {status?.lastError && (
              <p className="text-danger">
                Last sync error:{' '}
                <code className="bg-danger/10 px-1 rounded">{status.lastError}</code>
              </p>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={connectState.state === 'connecting'}
              className="text-text-muted hover:text-danger transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}

        {connectState.state === 'error' && (
          <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
            <strong>Connection failed:</strong>{' '}
            {connectErrorLabel(connectState.reason)}
          </div>
        )}

        {syncState.state === 'error' && (
          <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
            <strong>Sync failed:</strong> {syncErrorLabel(syncState.reason)}
          </div>
        )}
      </div>
    </div>
  );
}

function connectErrorLabel(reason: string): string {
  switch (reason) {
    case 'empty-key':
      return 'paste your Granola API key first';
    case 'bad-prefix':
      return 'API key must start with `grn_`';
    case 'auth-401':
    case 'auth-403':
      return 'Granola rejected this key — double-check it';
    case 'rate-limited':
      return 'Granola rate-limited the verification request — try again in a minute';
    default:
      return reason;
  }
}

function syncErrorLabel(reason: string): string {
  switch (reason) {
    case 'no-key':
      return 'no API key on file — reconnect Granola';
    case 'auth-401':
    case 'auth-403':
      return 'Granola rejected the stored key — reconnect with a fresh one';
    case 'rate-limited':
      return 'rate-limited by Granola — the cron will retry within the hour';
    default:
      return reason;
  }
}

function formatRelative(epochMs: number): string {
  const diff = Date.now() - epochMs;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}
