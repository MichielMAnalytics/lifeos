'use client';

import { useState, useCallback } from 'react';
import { useGatewayQuery, useGatewaySubscription, useGatewayConnection } from '@/lib/gateway';
import { cn } from '@/lib/utils';

interface Session {
  key: string;
  agentName: string;
  channel: string;
  messageCount: number;
  lastActiveAt: number;
}

function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-3">
      <div className="animate-pulse bg-surface h-4 w-20 rounded" />
      <div className="animate-pulse bg-surface h-4 w-24 rounded" />
      <div className="animate-pulse bg-surface h-4 w-16 rounded" />
      <div className="animate-pulse bg-surface h-4 w-8 rounded ml-auto" />
    </div>
  );
}

export function SessionsList() {
  const connection = useGatewayConnection();
  const { data, error, loading, refetch } = useGatewayQuery<Session[]>(
    connection.status === 'connected' ? 'sessions.list' : null,
    {},
  );

  const [, setTick] = useState(0);

  // Auto-refresh when sessions change
  useGatewaySubscription(
    connection.status === 'connected' ? 'sessions.changed' : null,
    useCallback(() => {
      refetch();
      setTick((t) => t + 1);
    }, [refetch]),
  );

  if (connection.status !== 'connected') {
    return (
      <div className="border border-border p-6">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Active Sessions
          </h2>
        </div>
        <div className="flex flex-col items-center py-8 text-center">
          <span className="inline-block w-2 h-2 rounded-full bg-text-muted/40 mb-3" />
          <p className="text-sm text-text-muted">Gateway not connected</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-border flex flex-col">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Active Sessions
          </h2>
        </div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-border p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Active Sessions
          </h2>
        </div>
        <p className="text-sm text-danger">Failed to load sessions</p>
      </div>
    );
  }

  const sessions = data ?? [];

  return (
    <div className="border border-border flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Active Sessions
        </h2>
        <span className="text-xs text-text-muted">[ {sessions.length} ]</span>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-text-muted">No active sessions</p>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="flex items-center gap-4 px-6 py-2 border-b border-border text-[10px] font-medium text-text-muted uppercase tracking-wider">
            <span className="w-28 shrink-0">Session</span>
            <span className="w-24 shrink-0">Agent</span>
            <span className="w-20 shrink-0">Channel</span>
            <span className="w-12 shrink-0 text-right">Msgs</span>
            <span className="flex-1 text-right">Last Active</span>
          </div>

          {/* Session rows */}
          <div className="divide-y divide-border">
            {sessions.map((session) => (
              <div
                key={session.key}
                className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-surface-hover"
              >
                <span className="w-28 shrink-0 text-xs font-mono text-text truncate">
                  {session.key.length > 12
                    ? session.key.slice(0, 12) + '...'
                    : session.key}
                </span>
                <span className="w-24 shrink-0 text-sm text-text truncate">
                  {session.agentName}
                </span>
                <span
                  className={cn(
                    'w-20 shrink-0 inline-block px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border border-border text-text-muted text-center',
                  )}
                >
                  {session.channel}
                </span>
                <span className="w-12 shrink-0 text-xs font-mono text-text-muted text-right">
                  {session.messageCount}
                </span>
                <span className="flex-1 text-xs font-mono text-text-muted text-right">
                  {relativeTime(session.lastActiveAt)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
