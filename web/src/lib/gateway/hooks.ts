'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGateway } from './context';
import type { GatewayConnectionState } from './types';

/** Execute a gateway RPC call. Returns { data, error, loading, refetch }. */
export function useGatewayQuery<T = unknown>(
  method: string | null,
  params?: Record<string, unknown>,
) {
  const { client, state } = useGateway();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetch = useCallback(async () => {
    if (!method || !client || state !== 'connected') return;
    setLoading(true);
    setError(null);
    try {
      const result = await client.call<T>(method, paramsRef.current);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [method, client, state]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, error, loading, refetch: fetch };
}

/** Subscribe to gateway events. Handler is called for each event. */
export function useGatewaySubscription(
  event: string | null,
  handler: (data: unknown) => void,
) {
  const { client } = useGateway();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!event || !client) return;
    return client.subscribe(event, (data) => handlerRef.current(data));
  }, [event, client]);
}

/** Get the current gateway connection state. */
export function useGatewayConnection(): GatewayConnectionState {
  const { state } = useGateway();
  return state;
}
