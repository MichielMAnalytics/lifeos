'use client';

import { useGatewayConnection } from '@/lib/gateway';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

const STATE_CONFIG: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: 'bg-success', label: 'Connected' },
  connecting: { color: 'bg-warning animate-pulse', label: 'Connecting' },
  disconnected: { color: 'bg-text-muted/30', label: 'Disconnected' },
  error: { color: 'bg-danger', label: 'Error' },
};

export function GatewayStatusIndicator() {
  const connection = useGatewayConnection();
  const status: ConnectionStatus = connection.status ?? 'disconnected';
  const { color, label } = STATE_CONFIG[status];

  return (
    <span className="relative inline-flex items-center" title={`AI Agent: ${label}`}>
      <span className={cn('block w-2 h-2 rounded-full shrink-0', color)} />
    </span>
  );
}
