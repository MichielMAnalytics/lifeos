'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useGateway } from '@/lib/gateway';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tool_calls?: Array<{ name: string; args?: unknown }>;
}

interface ChatEventData {
  type: 'chunk' | 'message' | 'done' | 'error';
  chunk?: string;
  content?: string;
  message?: ChatMessage;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _msgId = 0;
function nextId(): string {
  return `msg_${++_msgId}_${Date.now()}`;
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Minimal inline formatting: **bold** and line breaks. */
function renderContent(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const nodes: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>,
      );
    } else {
      const lines = part.split('\n');
      lines.forEach((line, j) => {
        nodes.push(
          <span key={`${i}-${j}`}>
            {line}
            {j < lines.length - 1 && <br />}
          </span>,
        );
      });
    }
  });
  return nodes;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[bounce_1.4s_ease-in-out_0s_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
    </div>
  );
}

function ConnectionDot({ state }: { state: string }) {
  const colors: Record<string, string> = {
    connected: 'bg-success',
    connecting: 'bg-warning animate-pulse',
    disconnected: 'bg-text-muted/30',
    error: 'bg-danger',
  };
  const labels: Record<string, string> = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    error: 'Connection error',
  };
  return (
    <div className="flex items-center gap-2">
      <span className={cn('w-2 h-2 rounded-full shrink-0', colors[state] ?? 'bg-text-muted/30')} />
      <span className="text-[11px] text-text-muted font-mono">
        {labels[state] ?? state}
      </span>
    </div>
  );
}

function ToolCallCard({ call }: { call: { name: string; args?: unknown } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-text-muted hover:bg-surface-hover transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <span className="font-mono">{call.name}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn('ml-auto transition-transform', open && 'rotate-180')}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && call.args != null && (
        <div className="px-3 py-2 border-t border-border bg-bg">
          <pre className="text-[10px] font-mono text-text-muted whitespace-pre-wrap break-all">
            {JSON.stringify(call.args, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function GetStartedBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('lifeos-coach-introduced') !== 'true') {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem('lifeos-coach-introduced', 'true');
    setVisible(false);
  }

  return (
    <div className="mx-auto max-w-lg mb-6 relative border border-border rounded-lg bg-surface p-5">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-text-muted hover:text-text transition-colors"
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <p className="text-sm font-medium text-text">Get started</p>
      <p className="mt-1 text-xs text-text-muted leading-relaxed">
        Try sending <code className="px-1.5 py-0.5 rounded bg-bg text-text font-mono text-[11px]">/lifeos-init</code> to
        set up your goals, routines, and daily rhythm.
      </p>
    </div>
  );
}

function WelcomeState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted/30 mx-auto">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-text tracking-tight">
        What would you like to work on?
      </h2>
      <p className="mt-2 text-sm text-text-muted max-w-sm">
        Your Life Coach is ready. Start a conversation to plan your day, reflect on progress, or brainstorm ideas.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Send button icon
// ---------------------------------------------------------------------------

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function LifeCoachPage() {
  const subscription = useQuery(api.stripe.getMySubscription);
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const { client, state: gatewayState } = useGateway();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamBufferRef = useRef<string>('');
  const streamMessageIdRef = useRef<string | null>(null);
  const prevGatewayState = useRef<string | null>(null);

  const isConnected = gatewayState === 'connected';

  // ---- Auto-resize textarea ----
  const adjustTextareaHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  // ---- Load chat history ----
  useEffect(() => {
    if (!client || !isConnected || historyLoaded) return;

    let cancelled = false;
    client
      .call<ChatMessage[]>('chat.history', {})
      .then((history) => {
        if (cancelled) return;
        if (history && history.length > 0) {
          setMessages(
            history.map((m) => ({
              ...m,
              id: m.id ?? nextId(),
              timestamp: m.timestamp ?? Date.now(),
            })),
          );
        }
        setHistoryLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load chat history:', err);
        if (!cancelled) setHistoryLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [client, isConnected, historyLoaded]);

  // ---- Reset history loaded flag when reconnecting ----
  useEffect(() => {
    if (prevGatewayState.current === 'disconnected' && gatewayState === 'connected') {
      setHistoryLoaded(false);
    }
    prevGatewayState.current = gatewayState;
  }, [gatewayState]);

  // ---- Subscribe to chat events ----
  useEffect(() => {
    if (!client || !isConnected) return;

    return client.subscribe('chat', (raw: unknown) => {
      const data = raw as ChatEventData;

      if (data.type === 'chunk') {
        const chunk = data.chunk ?? data.content ?? '';
        if (!chunk) return;

        streamBufferRef.current += chunk;

        if (!streamMessageIdRef.current) {
          const id = nextId();
          streamMessageIdRef.current = id;
          setMessages((prev) => [
            ...prev,
            {
              id,
              role: 'assistant',
              content: streamBufferRef.current,
              timestamp: Date.now(),
            },
          ]);
        } else {
          const currentId = streamMessageIdRef.current;
          const currentContent = streamBufferRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentId ? { ...m, content: currentContent } : m,
            ),
          );
        }
      }

      if (data.type === 'message' && data.message) {
        const msg = data.message;
        if (streamMessageIdRef.current) {
          // Replace the streaming message with the final one
          const currentId = streamMessageIdRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentId
                ? {
                    ...msg,
                    id: currentId,
                    timestamp: msg.timestamp ?? Date.now(),
                  }
                : m,
            ),
          );
        } else {
          setMessages((prev) => [
            ...prev,
            {
              ...msg,
              id: msg.id ?? nextId(),
              timestamp: msg.timestamp ?? Date.now(),
            },
          ]);
        }
      }

      if (data.type === 'done') {
        setIsStreaming(false);
        streamBufferRef.current = '';
        streamMessageIdRef.current = null;
      }

      if (data.type === 'error') {
        setIsStreaming(false);
        streamBufferRef.current = '';
        streamMessageIdRef.current = null;
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            content: data.error ?? 'An error occurred.',
            timestamp: Date.now(),
          },
        ]);
      }
    });
  }, [client, isConnected]);

  // ---- Scroll to bottom ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // ---- Focus input when connected ----
  useEffect(() => {
    if (isConnected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isConnected]);

  // ---- Update relative timestamps ----
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // ---- Send message ----
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || !client || !isConnected || isStreaming) return;

    const userMessage: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    streamBufferRef.current = '';
    streamMessageIdRef.current = null;

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      await client.call('chat.send', { message: trimmed });
    } catch (err) {
      console.error('Failed to send message:', err);
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: 'Failed to send message. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    }
  }, [input, client, isConnected, isStreaming]);

  // ---- Abort streaming ----
  const handleAbort = useCallback(async () => {
    if (!client || !isConnected) return;
    try {
      await client.call('chat.abort', {});
    } catch {
      // Ignore abort errors
    }
    setIsStreaming(false);
    streamBufferRef.current = '';
    streamMessageIdRef.current = null;
  }, [client, isConnected]);

  // ---- Keyboard handling ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ---- Loading state ----
  if (subscription === undefined || deployment === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse h-5 w-5 rounded-full bg-text-muted" />
      </div>
    );
  }

  // ---- No deployment: prompt to set up ----
  const hasDeployment = deployment && deployment.status !== 'deactivated';
  if (!hasDeployment) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted/30 mb-6">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h2 className="text-lg font-semibold text-text mb-2">Set up your Life Coach to start chatting</h2>
        <p className="text-sm text-text-muted max-w-md mb-6">
          Deploy your personal AI assistant to plan your days, reflect on progress, and keep you accountable.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center h-9 px-6 bg-accent text-bg text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  // ---- Deployment not running ----
  if (deployment.status !== 'running') {
    const statusLabels: Record<string, string> = {
      provisioning: 'Your Life Coach is being set up...',
      starting: 'Your Life Coach is starting up...',
      error: 'Your Life Coach encountered an error.',
      deactivating: 'Your Life Coach is shutting down...',
      suspended: 'Your Life Coach is suspended.',
    };
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in">
        {(deployment.status === 'provisioning' || deployment.status === 'starting') && (
          <div className="mb-6">
            <div className="h-8 w-8 rounded-full border-2 border-text-muted/20 border-t-accent animate-spin" />
          </div>
        )}
        <p className="text-sm text-text-muted">
          {statusLabels[deployment.status] ?? `Status: ${deployment.status}`}
        </p>
        <Link
          href="/settings"
          className="mt-4 text-xs font-mono text-text-muted underline underline-offset-2 hover:text-text transition-colors"
        >
          Manage in Settings
        </Link>
      </div>
    );
  }

  // ---- Reconnecting overlay ----
  const showReconnecting = !isConnected && gatewayState !== 'connecting';

  // ---- Connected: full chat interface ----
  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* -- Status bar -- */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border">
        <ConnectionDot state={gatewayState} />
        {isStreaming && (
          <span className="text-[11px] text-text-muted font-mono animate-pulse">
            Thinking...
          </span>
        )}
      </div>

      {/* -- Reconnecting banner -- */}
      {showReconnecting && (
        <div className="shrink-0 px-5 py-2 bg-warning/10 border-b border-warning/20">
          <p className="text-xs text-warning">
            Connection lost. Reconnecting...
          </p>
        </div>
      )}

      {/* -- Connecting state -- */}
      {gatewayState === 'connecting' && messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-text-muted/20 border-t-accent animate-spin mb-3" />
          <p className="text-sm text-text-muted">Connecting...</p>
        </div>
      )}

      {/* -- Message area -- */}
      {(isConnected || messages.length > 0) && (
        <>
          {messages.length === 0 && !isStreaming ? (
            <div className="flex-1 flex flex-col">
              <GetStartedBanner />
              <WelcomeState />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-5 py-6 space-y-1">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isStreaming && !streamMessageIdRef.current && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* -- Input bar -- */}
          <div className="shrink-0 border-t border-border bg-bg">
            <div className="max-w-3xl mx-auto px-5 py-3">
              <div className="flex items-end gap-3 bg-surface border border-border rounded-xl px-4 py-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustTextareaHeight();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isConnected
                      ? 'Message your Life Coach...'
                      : 'Connecting...'
                  }
                  disabled={!isConnected && !isStreaming}
                  rows={1}
                  className={cn(
                    'flex-1 bg-transparent text-sm text-text placeholder:text-text-muted/40',
                    'focus:outline-none resize-none leading-relaxed',
                    'min-h-[24px] max-h-[160px]',
                    (!isConnected && !isStreaming) && 'opacity-40',
                  )}
                />
                {isStreaming ? (
                  <button
                    onClick={handleAbort}
                    className="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-danger transition-colors"
                    title="Stop generating"
                  >
                    <StopIcon />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || !isConnected}
                    className={cn(
                      'shrink-0 p-1.5 rounded-lg transition-colors',
                      input.trim() && isConnected
                        ? 'text-accent hover:text-accent-hover'
                        : 'text-text-muted/20 cursor-not-allowed',
                    )}
                    title="Send message"
                  >
                    <SendIcon />
                  </button>
                )}
              </div>
              <p className="mt-2 text-center text-[10px] text-text-muted/40">
                Shift + Enter for new line
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full py-2',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-accent text-bg rounded-br-md'
            : 'bg-surface text-text rounded-bl-md',
        )}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {renderContent(message.content)}
        </div>

        {/* Tool calls */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.tool_calls.map((call, i) => (
              <ToolCallCard key={i} call={call} />
            ))}
          </div>
        )}

        <span
          className={cn(
            'block mt-1.5 text-[10px] font-mono',
            isUser ? 'text-bg/50' : 'text-text-muted/50',
          )}
        >
          {relativeTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
