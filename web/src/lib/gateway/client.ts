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

  get state() { return this._state; }

  connect() {
    if (this.disposed) return;
    if (this.ws) return;
    this.setState('connecting');
    this.authenticated = false;

    const wsUrl = this.url.replace(/^http/, 'ws');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      // Wait for connect.challenge event before sending connect
    };

    this.ws.onmessage = (evt) => {
      try {
        const frame = JSON.parse(evt.data) as Record<string, unknown>;

        // Gateway event frame: { type: "event", event: string, payload: unknown }
        if (frame.type === 'event') {
          const eventName = frame.event as string;

          // connect.challenge — gateway wants us to authenticate
          if (eventName === 'connect.challenge') {
            this.sendConnect();
            return;
          }

          // Forward to event handlers
          const handlers = this.eventHandlers.get(eventName);
          if (handlers) handlers.forEach((h) => h(frame.payload));
          const wildcardHandlers = this.eventHandlers.get('*');
          if (wildcardHandlers) wildcardHandlers.forEach((h) => h(frame));
          return;
        }

        // Gateway response frame: { type: "res", id: string, ok: boolean, payload: unknown }
        if (frame.type === 'res') {
          const id = String(frame.id);
          const pending = this.pending.get(id);
          if (!pending) return;
          this.pending.delete(id);

          if (frame.ok) {
            pending.resolve(frame.payload);
          } else {
            const err = frame.error as Record<string, unknown> | undefined;
            const errPayload = frame.payload as Record<string, unknown> | undefined;
            const message = (err?.message as string) ?? (errPayload?.message as string) ?? (err?.code as string) ?? 'Request failed';
            console.warn('[gateway] request failed:', frame.id, message);
            pending.reject(new Error(message));
          }
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
      if (!this.authenticated) this.setState('error');
    };
  }

  /** Send the connect request after receiving the challenge */
  private sendConnect() {
    const id = String(++this.requestId);
    const connectMsg = {
      type: 'req',
      id,
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'openclaw-control-ui',
          version: '1.0',
          platform: navigator?.platform ?? 'web',
          mode: 'webchat',
        },
        role: 'operator',
        scopes: ['operator.admin', 'operator.read', 'operator.write', 'operator.approvals', 'operator.pairing'],
        caps: ['tool-events'],
        auth: { token: this.token },
      },
    };

    // Register a pending handler for the connect response
    this.pending.set(id, {
      resolve: () => {
        this.authenticated = true;
        this.setState('connected');
      },
      reject: (err) => {
        console.error('[gateway] connect failed:', err.message);
        this.setState('error');
        this.ws?.close();
      },
    });

    this.ws!.send(JSON.stringify(connectMsg));
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
      // OpenClaw protocol: { type: "req", id, method, params }
      this.ws!.send(JSON.stringify({ type: 'req', id, method, params: params ?? {} }));
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
    return () => { this.eventHandlers.get(event)?.delete(handler); };
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => { this.stateHandlers.delete(handler); };
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
