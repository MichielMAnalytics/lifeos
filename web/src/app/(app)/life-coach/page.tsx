'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useGateway } from '@/lib/gateway';
import { cn } from '@/lib/utils';
import Image from 'next/image';
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
    <div className="flex items-start gap-3 max-w-[650px] mx-auto px-4">
      <div className="shrink-0 mt-1">
        <Image
          src="/openclaw-icon.png"
          alt="OpenClaw"
          width={28}
          height={28}
          className="rounded-full"
        />
      </div>
      <div className="flex items-center gap-1.5 pt-3">
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[bounce_1.4s_ease-in-out_0s_infinite]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  );
}

function ToolCallCard({ call }: { call: { name: string; args?: unknown } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 border border-border/30 rounded-lg overflow-hidden">
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
        <div className="px-3 py-2 border-t border-border/30 bg-bg">
          <pre className="text-[10px] font-mono text-text-muted whitespace-pre-wrap break-all">
            {JSON.stringify(call.args, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Send / Stop icons
// ---------------------------------------------------------------------------

function SendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
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
// Message row
// ---------------------------------------------------------------------------

function MessageRow({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end max-w-[650px] mx-auto px-4">
        <div className="max-w-[80%]">
          <div className="bg-accent/15 text-text rounded-2xl rounded-br-md px-4 py-3">
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {renderContent(message.content)}
            </div>
          </div>
          <span className="block mt-1 text-[10px] text-text-muted/40 text-right pr-1">
            {relativeTime(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 max-w-[650px] mx-auto px-4">
      <div className="shrink-0 mt-1">
        <Image
          src="/openclaw-icon.png"
          alt="OpenClaw"
          width={28}
          height={28}
          className="rounded-full"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-relaxed text-text whitespace-pre-wrap break-words">
          {renderContent(message.content)}
        </div>

        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.tool_calls.map((call, i) => (
              <ToolCallCard key={i} call={call} />
            ))}
          </div>
        )}

        <span className="block mt-1 text-[10px] text-text-muted/40">
          {relativeTime(message.timestamp)}
        </span>
      </div>
    </div>
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
      .call<ChatMessage[]>('chat.history', { sessionKey: 'agent:main:main' })
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
      const data = raw as { state?: string; message?: { role: string; content: Array<{ type: string; text?: string }>; timestamp?: number }; error?: string };
      if (!data.message) return;

      const text = data.message.content
        ?.filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('') ?? '';

      if (data.state === 'delta') {
        if (!streamMessageIdRef.current) {
          const id = nextId();
          streamMessageIdRef.current = id;
          streamBufferRef.current = text;
          setMessages((prev) => [
            ...prev,
            {
              id,
              role: 'assistant',
              content: text,
              timestamp: data.message?.timestamp ?? Date.now(),
            },
          ]);
        } else {
          const currentId = streamMessageIdRef.current;
          streamBufferRef.current = text;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentId ? { ...m, content: text } : m,
            ),
          );
        }
      }

      if (data.state === 'final') {
        if (streamMessageIdRef.current) {
          const currentId = streamMessageIdRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentId ? { ...m, content: text } : m,
            ),
          );
        }
        setIsStreaming(false);
        streamBufferRef.current = '';
        streamMessageIdRef.current = null;
      }

      if (data.state === 'error') {
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

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      await client.call('chat.send', { sessionKey: 'agent:main:main', message: trimmed, idempotencyKey: crypto.randomUUID() });
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
      await client.call('chat.abort', { sessionKey: 'agent:main:main' });
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
        <Image
          src="/openclaw-icon.png"
          alt="OpenClaw"
          width={48}
          height={48}
          className="rounded-full mb-6 opacity-30"
        />
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

  // ---- Determine if we should show the empty state ----
  const hasMessages = messages.length > 0;
  const canSend = isConnected && !isStreaming;
  const isDisconnectedOrConnecting = !isConnected;

  // ---- Input component (reused in both states) ----
  const inputBox = (
    <div className="max-w-[650px] w-full mx-auto">
      <div
        className={cn(
          'flex items-end gap-2 border border-border/40 rounded-2xl px-4 py-3 bg-surface transition-colors',
          'focus-within:border-border/70',
        )}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={isDisconnectedOrConnecting ? 'Connecting...' : 'Ask anything'}
          disabled={isDisconnectedOrConnecting && !isStreaming}
          rows={1}
          className={cn(
            'flex-1 bg-transparent text-sm text-text placeholder:text-text-muted/40',
            'focus:outline-none resize-none leading-relaxed',
            'min-h-[24px] max-h-[160px]',
            (isDisconnectedOrConnecting && !isStreaming) && 'opacity-40',
          )}
        />
        {isStreaming ? (
          <button
            onClick={handleAbort}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-text-muted/10 text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            title="Stop generating"
          >
            <StopIcon />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim() || !canSend}
            className={cn(
              'shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors',
              input.trim() && canSend
                ? 'bg-accent text-bg hover:bg-accent-hover'
                : 'bg-text-muted/10 text-text-muted/30 cursor-not-allowed',
            )}
            title="Send message"
          >
            <SendIcon />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-[10px] text-text-muted/30">
        Shift + Enter for new line
      </p>
    </div>
  );

  // ---- Main chat interface ----
  const quickPrompts = [
    'Hi there!',
    'Hey coach!',
    'Good morning',
    'Let\u2019s get started',
  ];

  if (!hasMessages) {
    // Empty state: everything centered on screen
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 animate-fade-in">
        <Image
          src="/openclaw-icon.png"
          alt="OpenClaw"
          width={40}
          height={40}
          className="rounded-full mb-5"
        />
        <h1 className="text-2xl font-bold text-text tracking-tight mb-3">
          Ready when you are
        </h1>
        <p className="text-xs text-text-muted/50 mb-6">
          Powered by{' '}
          <a
            href="https://openclaw.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-text-muted transition-colors"
          >
            OpenClaw
          </a>
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={async () => {
                if (!client || !isConnected) return;
                const msg: ChatMessage = { id: nextId(), role: 'user', content: prompt, timestamp: Date.now() };
                setMessages((prev) => [...prev, msg]);
                setIsStreaming(true);
                streamBufferRef.current = '';
                streamMessageIdRef.current = null;
                try { await client.call('chat.send', { sessionKey: 'agent:main:main', message: prompt, idempotencyKey: crypto.randomUUID() }); } catch { setIsStreaming(false); }
              }}
              disabled={!canSend}
              className="px-3 py-1.5 text-xs text-text-muted border border-border/40 rounded-full hover:border-border hover:text-text transition-colors disabled:opacity-30"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="w-full px-4">
          {inputBox}
        </div>
      </div>
    );
  }

  // With messages: messages fill space, input bar at bottom
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex-1 overflow-y-auto">
        <div className="py-6 space-y-5">
          {messages.map((msg) => (
            <MessageRow key={msg.id} message={msg} />
          ))}
          {isStreaming && !streamMessageIdRef.current && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="shrink-0 pb-4 pt-2 px-4">
        {messages.length <= 2 && (
          <div className="max-w-[650px] mx-auto mb-2">
            <button
              onClick={async () => {
                if (!client || !isConnected) return;
                const prompt = '/lifeos-init';
                const msg: ChatMessage = { id: nextId(), role: 'user', content: prompt, timestamp: Date.now() };
                setMessages((prev) => [...prev, msg]);
                setIsStreaming(true);
                streamBufferRef.current = '';
                streamMessageIdRef.current = null;
                try { await client.call('chat.send', { sessionKey: 'agent:main:main', message: prompt, idempotencyKey: crypto.randomUUID() }); } catch { setIsStreaming(false); }
              }}
              disabled={!canSend}
              className="w-full text-left px-4 py-2.5 text-xs text-text-muted/60 bg-surface/50 border border-border/30 rounded-xl hover:border-border/50 hover:text-text-muted transition-colors disabled:opacity-30"
            >
              Try <span className="font-mono text-text/70 bg-surface px-1.5 py-0.5 rounded">/lifeos-init</span> to begin your journey with your coach
            </button>
          </div>
        )}
        {inputBox}
      </div>
    </div>
  );
}
