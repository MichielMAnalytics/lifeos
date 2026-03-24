'use client';

import { useGatewayQuery, useGatewayConnection } from '@/lib/gateway';
import { cn } from '@/lib/utils';

interface ChannelStatus {
  id: string;
  type: string;
  accountName: string;
  status: 'connected' | 'disconnected' | 'not_configured';
}

const statusDot: Record<ChannelStatus['status'], string> = {
  connected: 'bg-success',
  disconnected: 'bg-danger',
  not_configured: 'bg-text-muted/30',
};

const statusLabel: Record<ChannelStatus['status'], string> = {
  connected: 'CONNECTED',
  disconnected: 'DISCONNECTED',
  not_configured: 'NOT CONFIGURED',
};

function SkeletonCard() {
  return <div className="animate-pulse border border-border p-4 h-20" />;
}

export function ChannelsLive() {
  const connection = useGatewayConnection();
  const { data, error, loading } = useGatewayQuery<ChannelStatus[]>(
    connection.status === 'connected' ? 'channels.status' : null,
    {},
  );

  if (connection.status !== 'connected') {
    return (
      <div className="border border-border p-6">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Channels
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
            Channels
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-border p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Channels
          </h2>
        </div>
        <p className="text-sm text-danger">Failed to load channels</p>
      </div>
    );
  }

  const channels = data ?? [];

  return (
    <div className="border border-border flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Channels
        </h2>
        <span className="text-xs text-text-muted">
          [ {channels.filter((c) => c.status === 'connected').length} active ]
        </span>
      </div>

      {channels.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-text-muted">No channels configured</p>
          <p className="text-xs text-text-muted/60 mt-1">
            Configure channels in your agent settings
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-border">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="bg-bg px-4 py-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-block px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border border-border',
                    channel.status === 'connected'
                      ? 'text-text'
                      : 'text-text-muted',
                  )}
                >
                  {channel.type}
                </span>
                <span
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    statusDot[channel.status],
                  )}
                  title={statusLabel[channel.status]}
                />
              </div>
              <span className="text-sm text-text truncate">
                {channel.accountName}
              </span>
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                {statusLabel[channel.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
