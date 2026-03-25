import type { GatewayConnectionState } from './types';

type EventHandler = (data: unknown) => void;
type StateHandler = (state: GatewayConnectionState) => void;

export class GatewayClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private requestId = 0;
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private stateHandlers = new Set<StateHandler>();
  private _state: GatewayConnectionState = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private maxReconnectDelay = 30000;
  private disposed = false;
  private authenticated = false;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  get state() {
    return this._state;
  }

  connect() {
    if (this.disposed) return;
    if (this.ws) return;
    this.setState('connecting');
    this.authenticated = false;

    // Connect to the gateway WebSocket — no path suffix, auth happens after open
    const wsUrl = this.url.replace(/^http/, 'ws');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      // Send OpenClaw connect message with token auth
      this.ws!.send(JSON.stringify({
        type: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'lifeos-dashboard',
            version: '1.0',
            platform: 'web',
            mode: 'webchat',
          },
          role: 'operator',
          scopes: ['chat', 'sessions', 'config', 'channels', 'cron', 'skills'],
          caps: ['tool-events'],
          auth: { token: this.token },
        },
      }));
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        // Handle connect response
        if (msg.type === 'connected') {
          this.authenticated = true;
          this.setState('connected');
          return;
        }

        // Handle connect error
        if (msg.type === 'error' && !this.authenticated) {
          this.setState('error');
          this.ws?.close();
          return;
        }

        // RPC response
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.ok !== false && !msg.error) resolve(msg.result ?? msg.data);
          else reject(new Error(msg.error?.message ?? msg.error ?? 'Unknown error'));
          return;
        }

        // Event push
        if (msg.event) {
          const handlers = this.eventHandlers.get(msg.event);
          if (handlers) handlers.forEach((h) => h(msg.data));
          const wildcardHandlers = this.eventHandlers.get('*');
          if (wildcardHandlers)
            wildcardHandlers.forEach((h) => h({ event: msg.event, data: msg.data }));
          return;
        }

        // Stream chunks (for chat streaming)
        if (msg.type === 'chunk' || msg.type === 'message' || msg.type === 'done' || msg.type === 'stream') {
          const handlers = this.eventHandlers.get('chat');
          if (handlers) handlers.forEach((h) => h(msg));
          return;
        }
      } catch {
        /* ignore parse errors */
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.authenticated = false;
      for (const [, { reject }] of this.pending) {
        reject(new Error('Connection closed'));
      }
      this.pending.clear();

      if (!this.disposed) {
        this.setState('disconnected');
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.setState('error');
    };
  }

  async call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.authenticated) {
      throw new Error('Not connected');
    }
    const id = String(++this.requestId);
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      this.ws!.send(JSON.stringify({ id, method, params: params ?? {} }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);
    });
  }

  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  disconnect() {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.authenticated = false;
    this.setState('disconnected');
  }

  private setState(state: GatewayConnectionState) {
    this._state = state;
    this.stateHandlers.forEach((h) => h(state));
  }

  private scheduleReconnect() {
    if (this.disposed) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), this.maxReconnectDelay);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
