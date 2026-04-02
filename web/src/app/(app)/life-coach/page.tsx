'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useQuery, useAction } from 'convex/react';
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
  images?: string[]; // data URLs for pasted images
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _msgId = 0;
function nextId(): string {
  return `msg_${++_msgId}_${Date.now()}`;
}

/** Hide OpenClaw system heartbeat messages from the chat UI */
function isHeartbeatMessage(content: string): boolean {
  return content.includes('HEARTBEAT') || content.includes('heartbeat.md');
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
    <div className="flex items-start gap-3 max-w-3xl mx-auto px-4">
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

function LifeCoachStartingScreen({ status, startTime }: { status: 'provisioning' | 'starting'; startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  const maxSeconds = 90;
  const pinnedStart = useRef(startTime);

  useEffect(() => {
    const update = () => {
      const secs = Math.floor((Date.now() - pinnedStart.current) / 1000);
      setElapsed(Math.min(Math.max(secs, 0), maxSeconds));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const capped = elapsed >= maxSeconds;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const progress = Math.min(elapsed / maxSeconds, 1);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in">
      <div className="relative h-14 w-14 mb-8">
        <div className="absolute inset-0 rounded-full border border-border/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" style={{ animationDuration: '1.5s' }} />
        <Image src="/openclaw-icon.png" alt="" width={28} height={28} className="absolute inset-0 m-auto rounded-sm" />
      </div>

      <p className="text-sm text-text-muted">
        {status === 'provisioning' ? 'Setting up your Life Coach...' : 'Starting your Life Coach...'}
      </p>

      <div className="mt-6 w-full max-w-xs">
        {capped ? (
          <div className="space-y-2">
            <p className="text-xs text-text-muted/40">Finalizing last details...</p>
            <div className="h-1 bg-text/5 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-accent/50 rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted/40">This usually takes about a minute</p>
              <span className="font-mono text-xs tabular-nums text-text-muted/60">{display}</span>
            </div>
            <div className="h-1 bg-text/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent/50 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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
      <div className="flex justify-end max-w-3xl mx-auto px-4">
        <div className="max-w-[80%]">
          <div className="bg-accent/15 text-text rounded-2xl rounded-br-md px-4 py-3">
            {message.images && message.images.length > 0 && (
              <div className="flex gap-2 mb-2">
                {message.images.map((img, i) => (
                  <img key={i} src={img} alt="Attached" className="h-24 w-24 object-cover rounded-lg" />
                ))}
              </div>
            )}
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
    <div className="flex items-start gap-3 max-w-3xl mx-auto px-4">
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
  const transcribeAudio = useAction(api.transcribe.transcribeAudio);
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
  const [pastedImages, setPastedImages] = useState<Array<{ id: string; dataUrl: string; mimeType: string }>>([]);

  const isConnected = gatewayState === 'connected';

  // ---- Handle paste for images ----
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setPastedImages((prev) => [...prev, { id: nextId(), dataUrl, mimeType: item.type }]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

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
      .call<{ messages?: unknown[]; thinkingLevel?: string }>('chat.history', { sessionKey: 'agent:main:main', limit: 200 })
      .then((res) => {
        if (cancelled) return;
        const rawMessages = Array.isArray(res?.messages) ? res.messages : (Array.isArray(res) ? res : []);
        if (rawMessages.length > 0) {
          setMessages(
            rawMessages
              .filter((m: unknown) => {
                const msg = m as Record<string, unknown>;
                return msg.role === 'user' || msg.role === 'assistant';
              })
              .map((m: unknown) => {
                const msg = m as Record<string, unknown>;
                // Extract text from content array or string
                let content = '';
                if (typeof msg.content === 'string') {
                  content = msg.content;
                } else if (Array.isArray(msg.content)) {
                  content = (msg.content as Array<{ type?: string; text?: string }>)
                    .filter((c) => c.type === 'text')
                    .map((c) => c.text ?? '')
                    .join('');
                }
                return {
                  id: (msg.id as string) ?? nextId(),
                  role: msg.role as 'user' | 'assistant',
                  content,
                  timestamp: (msg.timestamp as number) ?? Date.now(),
                };
              })
              .filter((m) => !isHeartbeatMessage(m.content)),
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

  // Reload history on reconnect to catch cross-channel messages
  const prevConnectedRef = useRef(false);
  useEffect(() => {
    if (isConnected && !prevConnectedRef.current && historyLoaded) {
      // Reconnected — reload history
      setHistoryLoaded(false);
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected, historyLoaded]);

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

      // Handle errors first (may not have a message field)
      if (data.state === 'error') {
        setIsStreaming(false);
        streamBufferRef.current = '';
        streamMessageIdRef.current = null;
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            content: data.error ?? data.message?.content?.map((c) => c.text).join('') ?? 'Something went wrong. Please try again.',
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
    if ((!trimmed && pastedImages.length === 0) || !client || !isConnected || isStreaming) return;

    // Build display content
    const displayContent = trimmed || (pastedImages.length > 0 ? '[Image]' : '');
    const userMessage: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: displayContent,
      timestamp: Date.now(),
      images: pastedImages.map((img) => img.dataUrl),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setPastedImages([]);
    setIsStreaming(true);
    streamBufferRef.current = '';
    streamMessageIdRef.current = null;

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Build attachments for images
    const attachments = (userMessage.images ?? []).map((img) => {
      const match = /^data:([^;]+);base64,(.+)$/.exec(img);
      return match ? { type: 'image', mimeType: match[1], content: match[2] } : null;
    }).filter(Boolean);

    try {
      await client.call('chat.send', {
        sessionKey: 'agent:main:main',
        message: trimmed || '[Image]',
        idempotencyKey: crypto.randomUUID(),
        ...(attachments.length > 0 ? { attachments } : {}),
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
  }, [input, pastedImages, client, isConnected, isStreaming]);

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

  // ---- Home plan: self-managed Life Coach ----
  const isHomePlan = subscription?.planType === 'dashboard';
  if (isHomePlan) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in">
        <Image
          src="/openclaw-icon.png"
          alt="Life Coach"
          width={48}
          height={48}
          className="rounded-full mb-6 opacity-30"
        />
        <h2 className="text-lg font-semibold text-text mb-2">Self-managed Life Coach</h2>
        <p className="text-sm text-text-muted max-w-md mb-6">
          On the Home plan, you manage your own Life Coach instance. Head to Settings to configure the connection.
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
        <h2 className="text-lg font-semibold text-text mb-2">Your Life Coach is almost ready</h2>
        <p className="text-sm text-text-muted max-w-md mb-6">
          Just one more step — head to Settings to activate your personal Life Coach. It only takes a minute.
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
    const isStarting = deployment.status === 'provisioning' || deployment.status === 'starting';
    const isError = deployment.status === 'error';

    if (isStarting) {
      return <LifeCoachStartingScreen status={deployment.status as 'provisioning' | 'starting'} startTime={deployment.lastUpdatedAt} />;
    }

    const statusText = isError
      ? 'Something went wrong. Try restarting from Settings.'
      : deployment.status === 'suspended'
        ? 'Your Life Coach is paused.'
        : 'Your Life Coach is offline.';

    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in">
        <Image
          src="/openclaw-icon.png"
          alt=""
          width={40}
          height={40}
          className="rounded-full mb-6 opacity-30"
        />
        <p className="text-sm text-text-muted mb-2">
          {statusText}
        </p>
        <Link
          href="/settings"
          className="mt-3 text-xs text-text-muted/50 hover:text-text-muted transition-colors"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  // ---- Determine if we should show the empty state ----
  const hasMessages = messages.length > 0;
  const canSend = isConnected && !isStreaming;
  const isDisconnectedOrConnecting = !isConnected;

  // ---- Input component (reused in both states) ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceTranscribing, setVoiceTranscribing] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceLevels, setVoiceLevels] = useState<number[]>(new Array(32).fill(0));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);

  const transcribeToInput = useCallback(async (audioBlob: Blob) => {
    setVoiceTranscribing(true);

    try {
      // Convert audio blob to base64 for Convex action
      const buffer = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const audioBase64 = btoa(binary);

      const transcript = await transcribeAudio({
        audioBase64,
        mimeType: audioBlob.type || 'audio/webm',
      });

      if (transcript.trim()) {
        setInput((prev) => {
          const sep = prev && !prev.endsWith(' ') ? ' ' : '';
          return prev + sep + transcript.trim();
        });
        setTimeout(() => {
          inputRef.current?.focus();
          adjustTextareaHeight();
        }, 50);
      }
    } catch (err) {
      console.error('Voice transcription failed:', err);
    } finally {
      setVoiceTranscribing(false);
    }
  }, [adjustTextareaHeight, transcribeAudio]);

  const toggleVoice = useCallback(async () => {
    if (voiceRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
      cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      setVoiceRecording(false);
      setVoiceDuration(0);
      setVoiceLevels(new Array(32).fill(0));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analyser for waveform visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      // Animate waveform
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        // Sample 32 bars from the frequency data, normalized 0–1
        const bars: number[] = [];
        const step = Math.floor(dataArray.length / 32);
        for (let i = 0; i < 32; i++) {
          const val = dataArray[i * step] / 255;
          bars.push(val);
        }
        setVoiceLevels(bars);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      // Set up recorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          transcribeToInput(blob);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setVoiceRecording(true);
      setVoiceDuration(0);
      voiceTimerRef.current = setInterval(() => setVoiceDuration((d) => d + 1), 1000);
    } catch (err) {
      console.error('[Voice] Microphone access denied:', err);
    }
  }, [voiceRecording, transcribeToInput]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPastedImages((prev) => [...prev, { id: nextId(), dataUrl, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }, []);

  const handleNewSession = useCallback(async () => {
    if (!client || !isConnected) return;
    const msg: ChatMessage = { id: nextId(), role: 'user', content: '/new', timestamp: Date.now() };
    setMessages((prev) => [...prev, msg]);
    setIsStreaming(true);
    streamBufferRef.current = '';
    streamMessageIdRef.current = null;
    try {
      await client.call('chat.send', { sessionKey: 'agent:main:main', message: '/new', idempotencyKey: crypto.randomUUID() });
    } catch { setIsStreaming(false); }
  }, [client, isConnected]);

  const inputBox = (
    <div className="max-w-3xl w-full mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      {/* Image previews */}
      {pastedImages.length > 0 && (
        <div className="flex gap-2 mb-2 px-1">
          {pastedImages.map((img) => (
            <div key={img.id} className="relative group">
              <img src={img.dataUrl} alt="Pasted" className="h-16 w-16 object-cover rounded-lg border border-border/40" />
              <button
                onClick={() => setPastedImages((prev) => prev.filter((i) => i.id !== img.id))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg border border-border flex items-center justify-center text-text-muted hover:text-danger text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        className={cn(
          'flex flex-col border rounded-2xl px-4 py-3 bg-surface transition-all duration-300',
          voiceRecording
            ? 'border-accent/40 shadow-[0_0_0_1px_var(--accent-glow),0_0_20px_var(--accent-glow)]'
            : 'border-border/40 focus-within:border-border/70',
        )}
      >
        {/* Waveform visualizer — replaces textarea while recording */}
        {voiceRecording ? (
          <div className="flex items-center gap-3 min-h-[24px] py-1">
            <div className="flex items-center gap-[2px] flex-1 h-6">
              {voiceLevels.map((level, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-accent/80 transition-[height] duration-75"
                  style={{
                    height: `${Math.max(3, level * 24)}px`,
                    opacity: 0.4 + level * 0.6,
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-mono tabular-nums text-text-muted/60 shrink-0">
              {Math.floor(voiceDuration / 60)}:{String(voiceDuration % 60).padStart(2, '0')}
            </span>
          </div>
        ) : (
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isDisconnectedOrConnecting ? 'Connecting...' : 'Ask anything'}
            disabled={(isDisconnectedOrConnecting && !isStreaming) || voiceTranscribing}
            rows={1}
            className={cn(
              'w-full bg-transparent text-sm text-text placeholder:text-text-muted/40',
              'focus:outline-none resize-none leading-relaxed',
              'min-h-[24px] max-h-[160px]',
              (isDisconnectedOrConnecting && !isStreaming) && 'opacity-40',
              voiceTranscribing && 'opacity-40',
            )}
          />
        )}
        {voiceTranscribing && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-1">
              <span className="w-1 h-1 rounded-full bg-accent/60 animate-[pulse_1.4s_ease-in-out_0s_infinite]" />
              <span className="w-1 h-1 rounded-full bg-accent/60 animate-[pulse_1.4s_ease-in-out_0.2s_infinite]" />
              <span className="w-1 h-1 rounded-full bg-accent/60 animate-[pulse_1.4s_ease-in-out_0.4s_infinite]" />
            </div>
            <p className="text-xs text-text-muted/50">Transcribing...</p>
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {!voiceRecording && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!canSend}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted/40 hover:text-text-muted hover:bg-text-muted/10 transition-colors disabled:opacity-30"
                title="Attach image"
              >
                <PaperclipIcon />
              </button>
            )}
            <button
              onClick={toggleVoice}
              disabled={voiceTranscribing}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200',
                voiceRecording
                  ? 'text-danger bg-danger/10 hover:bg-danger/20'
                  : voiceTranscribing
                    ? 'text-text-muted/20 cursor-not-allowed'
                    : 'text-text-muted/40 hover:text-text-muted hover:bg-text-muted/10',
              )}
              title={voiceRecording ? 'Stop recording' : voiceTranscribing ? 'Transcribing...' : 'Voice input'}
            >
              {voiceRecording ? <StopIcon /> : <MicIcon />}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewSession}
              disabled={!canSend}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted/40 hover:text-text-muted hover:bg-text-muted/10 transition-colors disabled:opacity-30"
              title="New session"
            >
              <PlusIcon />
            </button>
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
        </div>
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
          {messages.filter((msg) => !isHeartbeatMessage(msg.content)).map((msg) => (
            <MessageRow key={msg.id} message={msg} />
          ))}
          {isStreaming && !streamMessageIdRef.current && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="shrink-0 pb-4 pt-2 px-4">
        {!messages.some((m) => m.content.includes('/lifeos-init')) && (
          <div className="max-w-3xl mx-auto mb-2">
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
