'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useGateway } from '@/lib/gateway';
import { cn } from '@/lib/utils';

/**
 * Phase 2 / Section 17C — floating Life Coach orb.
 *
 * A small circular FAB anchored to the bottom-right of every page. Click to
 * expand a mini chat panel that talks directly to the Life Coach via the
 * gateway. Messages are sent and responses streamed inline. An "Expand"
 * button opens the full /life-coach page.
 *
 * Hidden on /life-coach itself (no point doubling up).
 */

const SEED_KEY = 'lifeos-coach-seed-prompt';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

let _msgId = 0;
function nextId() { return ++_msgId; }

export function LifeCoachOrb() {
  const router = useRouter();
  const pathname = usePathname();
  const { client, state } = useGateway();
  const isConnected = state === 'connected';

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamBufferRef = useRef('');
  const streamMessageIdRef = useRef<number | null>(null);

  // Hide the orb on /life-coach (no point doubling up) and on auth/onboarding routes
  const hidden = pathname?.startsWith('/life-coach') || pathname?.startsWith('/onboarding') || pathname?.startsWith('/login');

  // Auto-focus the input when the panel opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Close on click outside or Esc
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Subscribe to chat events for streaming
  useEffect(() => {
    if (!client || !isConnected) return;

    return client.subscribe('chat', (raw: unknown) => {
      const data = raw as {
        state?: string;
        message?: { role: string; content: Array<{ type: string; text?: string }>; timestamp?: number };
        error?: string;
      };

      if (data.state === 'error') {
        setIsStreaming(false);
        streamBufferRef.current = '';
        streamMessageIdRef.current = null;
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            content: data.error ?? 'Something went wrong. Please try again.',
            timestamp: Date.now(),
          },
        ]);
        return;
      }

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
            { id, role: 'assistant', content: text, timestamp: Date.now() },
          ]);
        } else {
          const currentId = streamMessageIdRef.current;
          streamBufferRef.current = text;
          setMessages((prev) =>
            prev.map((m) => (m.id === currentId ? { ...m, content: text } : m)),
          );
        }
      }

      if (data.state === 'final') {
        if (streamMessageIdRef.current) {
          const currentId = streamMessageIdRef.current;
          setMessages((prev) =>
            prev.map((m) => (m.id === currentId ? { ...m, content: text } : m)),
          );
        }
        setIsStreaming(false);
        streamBufferRef.current = '';
        streamMessageIdRef.current = null;
      }
    });
  }, [client, isConnected]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

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
      await client.call('chat.send', {
        sessionKey: 'agent:main:main',
        message: trimmed,
        idempotencyKey: crypto.randomUUID(),
      });
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

  if (hidden) return null;

  return (
    <>
      {/* The FAB orb itself — bottom-right of viewport */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Open Life Coach"
        aria-label="Open Life Coach"
        className={cn(
          'fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-all duration-200',
          'bg-gradient-to-br from-accent to-accent-hover text-white',
          'hover:scale-105 active:scale-95',
          open && 'opacity-0 pointer-events-none scale-90',
        )}
        style={{
          boxShadow: '0 12px 32px var(--color-accent-glow), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* Sparkle / chat hybrid icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        </svg>
      </button>

      {/* The expanded chat panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-5 right-5 z-50 w-[min(400px,calc(100vw-32px))] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-scale-in flex flex-col"
          style={{
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px var(--color-border)',
            maxHeight: 'min(520px, calc(100vh - 80px))',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-subtle shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-white">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-text">Life Coach</span>
              {isConnected && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" title="Connected" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push('/life-coach');
                }}
                className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                title="Open full chat"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 mb-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
                  </svg>
                </div>
                <p className="text-xs text-text-muted leading-relaxed max-w-[220px]">
                  Ask anything about your week, plans, goals, or wins.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'ml-auto bg-accent text-white rounded-br-sm'
                    : 'mr-auto bg-bg-subtle text-text border border-border-subtle rounded-bl-sm',
                )}
              >
                {msg.content}
                {isStreaming && streamMessageIdRef.current === msg.id && (
                  <span className="inline-block w-1.5 h-3.5 bg-current opacity-60 ml-0.5 animate-pulse rounded-sm" />
                )}
              </div>
            ))}
            {/* Typing bubble while waiting for the first delta. Once a stream
                message is created above, the inline cursor takes over. */}
            {isStreaming && streamMessageIdRef.current === null && (
              <div className="mr-auto bg-bg-subtle text-text border border-border-subtle rounded-xl rounded-bl-sm px-3 py-2.5 inline-flex items-center gap-1">
                <span className="block h-1.5 w-1.5 rounded-full bg-text-muted/70 animate-[bounce_1.4s_ease-in-out_0s_infinite]" />
                <span className="block h-1.5 w-1.5 rounded-full bg-text-muted/70 animate-[bounce_1.4s_ease-in-out_0.15s_infinite]" />
                <span className="block h-1.5 w-1.5 rounded-full bg-text-muted/70 animate-[bounce_1.4s_ease-in-out_0.3s_infinite]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border px-3 py-2.5 shrink-0 bg-bg-subtle">
            {!isConnected ? (
              <p className="text-xs text-text-muted text-center py-1">Connecting to Life Coach...</p>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Auto-resize
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Message Life Coach..."
                  rows={1}
                  className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent resize-none leading-snug"
                  style={{ minHeight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all',
                    input.trim() && !isStreaming
                      ? 'bg-accent text-white hover:bg-accent-hover'
                      : 'bg-surface text-text-muted cursor-not-allowed',
                  )}
                  aria-label="Send"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export const LIFE_COACH_SEED_KEY = SEED_KEY;
