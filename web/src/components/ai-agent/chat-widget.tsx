'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useGatewaySubscription, useGatewayConnection } from '@/lib/gateway';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

let messageIdCounter = 0;
function nextMessageId(): string {
  return `msg_${++messageIdCounter}_${Date.now()}`;
}

function ChatIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <line x1="3" y1="3" x2="11" y2="11" />
      <line x1="11" y1="3" x2="3" y2="11" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="14"
      height="14"
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

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[bounce_1.4s_ease-in-out_0s_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
    </div>
  );
}

export function ChatWidget() {
  const connection = useGatewayConnection();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamBufferRef = useRef<string>('');
  const streamMessageIdRef = useRef<string | null>(null);

  const isConnected = connection.status === 'connected';

  // Receive streaming chat responses
  useGatewaySubscription(
    isConnected ? 'chat' : null,
    useCallback((raw: unknown) => {
      const data = raw as { content?: string; done?: boolean; chunk?: string };
      const chunk = data.chunk ?? data.content ?? '';

      if (chunk) {
        streamBufferRef.current += chunk;

        if (!streamMessageIdRef.current) {
          // Create new assistant message
          const id = nextMessageId();
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
          // Update existing streaming message
          const currentId = streamMessageIdRef.current;
          const currentContent = streamBufferRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentId ? { ...m, content: currentContent } : m,
            ),
          );
        }
      }

      if (data.done) {
        setIsStreaming(false);
        streamBufferRef.current = '';
        streamMessageIdRef.current = null;
      }
    }, []),
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !isConnected || isStreaming) return;

    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    streamBufferRef.current = '';
    streamMessageIdRef.current = null;

    try {
      const { client } = connection;
      if (client) {
        await client.call('chat.send', { message: trimmed });
      }
    } catch (e) {
      console.error('Failed to send chat message:', e);
      setIsStreaming(false);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          role: 'assistant',
          content: 'Failed to send message. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[360px] h-[400px] flex flex-col border border-border bg-bg">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  isConnected ? 'bg-success' : 'bg-text-muted/30',
                )}
              />
              <span className="text-sm font-bold text-text uppercase tracking-wide">
                AI Agent
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text transition-colors"
              title="Close chat"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Messages */}
          {!isConnected ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <span className="inline-block w-2 h-2 rounded-full bg-text-muted/40 mb-3" />
              <p className="text-sm text-text-muted">
                Connect your AI agent to chat
              </p>
              <p className="text-xs text-text-muted mt-1">
                Deploy an agent from the AI Agent page
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm text-text-muted">Start a conversation</p>
                  <p className="text-xs text-text-muted mt-1">
                    Send a message to your AI agent
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] px-3 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-surface border border-border text-text'
                        : 'border border-border text-text',
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>
                    <span className="block mt-1 text-[10px] font-mono text-text-muted/80">
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
                  </div>
                </div>
              ))}

              {isStreaming && !streamMessageIdRef.current && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          {isConnected && (
            <div className="shrink-0 border-t border-border px-3 py-2.5 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={isStreaming}
                className={cn(
                  'flex-1 bg-transparent text-sm text-text placeholder:text-text-muted/70 focus:outline-none',
                  isStreaming && 'opacity-50',
                )}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className={cn(
                  'p-1.5 transition-colors',
                  input.trim() && !isStreaming
                    ? 'text-text hover:text-accent'
                    : 'text-text-muted cursor-not-allowed',
                )}
                title="Send message"
              >
                <SendIcon />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center',
          'border border-border bg-bg text-text transition-colors',
          'hover:bg-surface-hover hover:border-text-muted',
          open && 'bg-surface border-text-muted',
        )}
        title={open ? 'Close chat' : 'Chat with AI agent'}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </>
  );
}
