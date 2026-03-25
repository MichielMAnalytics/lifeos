'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { GatewayClient } from './client';
import type { GatewayConnectionState } from './types';

interface GatewayContextValue {
  client: GatewayClient | null;
  state: GatewayConnectionState;
}

const GatewayContext = createContext<GatewayContextValue>({
  client: null,
  state: 'disconnected',
});

export function GatewayProvider({ children }: { children: ReactNode }) {
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const [state, setState] = useState<GatewayConnectionState>('disconnected');
  const clientRef = useRef<GatewayClient | null>(null);

  useEffect(() => {
    // Clean up previous client
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
      setState('disconnected');
    }

    // Only connect if deployment is running
    if (!deployment || deployment.status !== 'running') return;

    const domain = process.env.NEXT_PUBLIC_LIFEOS_DOMAIN ?? 'lifeos.zone';
    const url = `https://${deployment.subdomain}.${domain}`;
    const client = new GatewayClient(url, deployment.gatewayToken);

    clientRef.current = client;

    const unsub = client.onStateChange((s) => setState(s));
    client.connect();

    return () => {
      unsub();
      client.disconnect();
      clientRef.current = null;
    };
  }, [deployment?.subdomain, deployment?.gatewayToken, deployment?.status]);

  return (
    <GatewayContext.Provider value={{ client: clientRef.current, state }}>
      {children}
    </GatewayContext.Provider>
  );
}

export function useGateway() {
  return useContext(GatewayContext);
}
