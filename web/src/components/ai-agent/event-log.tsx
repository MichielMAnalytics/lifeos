'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useGatewaySubscription, useGatewayConnection } from '@/lib/gateway';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: number;
  timestamp: number;
  event: string;
  payload: unknown;
}

const MAX_ENTRIES = 200;
let entryCounter = 0;

const EVENT_COLORS: Record<string, string> = {
  'chat': 'text-accent',
  'error': 'text-danger',
  'warning': 'text-warning',
  'sessions': 'text-success',
  'cron': 'text-text-muted',
};

function getEventColor(event: string): string {
  for (const [prefix, color] of Object.entries(EVENT_COLORS)) {
    if (event.startsWith(prefix) || event.includes(prefix)) return color;
  }
  return 'text-text-muted';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return [
    d.getHours().toString().padStart(2, '0'),
    d.getMinutes().toString().padStart(2, '0'),
    d.getSeconds().toString().padStart(2, '0'),
  ].join(':');
}

function truncatePayload(payload: unknown, maxLen = 80): string {
  if (payload === undefined || payload === null) return '';
  const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

export function EventLog() {
  const connection = useGatewayConnection();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [eventFilters, setEventFilters] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Collect unique event types for filter checkboxes
  const knownEvents = useRef<Set<string>>(new Set());

  useGatewaySubscription(
    connection.status === 'connected' ? '*' : null,
    useCallback(
      (raw: unknown) => {
        const data = raw as { event?: string; type?: string; [key: string]: unknown };
        const eventName = data.event ?? data.type ?? 'unknown';

        knownEvents.current.add(eventName);

        const entry: LogEntry = {
          id: ++entryCounter,
          timestamp: Date.now(),
          event: eventName,
          payload: data,
        };

        setEntries((prev) => {
          const next = [...prev, entry];
          // Ring buffer: drop oldest when exceeding max
          if (next.length > MAX_ENTRIES) {
            return next.slice(next.length - MAX_ENTRIES);
          }
          return next;
        });
      },
      [],
    ),
  );

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused && shouldAutoScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, paused]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Consider "at bottom" if within 40px
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  const toggleFilter = (event: string) => {
    setEventFilters((prev) => {
      const next = new Set(prev);
      if (next.has(event)) {
        next.delete(event);
      } else {
        next.add(event);
      }
      return next;
    });
  };

  const filteredEntries =
    eventFilters.size === 0
      ? entries
      : entries.filter((e) => eventFilters.has(e.event));

  const uniqueEvents = Array.from(knownEvents.current).sort();

  if (connection.status !== 'connected') {
    return (
      <div className="border border-border p-6">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Event Log
          </h2>
        </div>
        <div className="flex flex-col items-center py-8 text-center">
          <span className="inline-block w-2 h-2 rounded-full bg-text-muted/40 mb-3" />
          <p className="text-sm text-text-muted">Gateway not connected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Event Log
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted">
            {entries.length}
          </span>
          <button
            onClick={() => setPaused(!paused)}
            className={cn(
              'px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider border transition-colors',
              paused
                ? 'border-warning text-warning'
                : 'border-border text-text-muted hover:text-text hover:border-text-muted',
            )}
          >
            {paused ? 'Paused' : 'Pause'}
          </button>
          <button
            onClick={() => {
              setEntries([]);
              knownEvents.current.clear();
              setEventFilters(new Set());
            }}
            className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider border border-border text-text-muted hover:text-text hover:border-text-muted transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Event type filters */}
      {uniqueEvents.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-6 py-2.5 border-b border-border">
          {uniqueEvents.map((evt) => (
            <button
              key={evt}
              onClick={() => toggleFilter(evt)}
              className={cn(
                'px-2 py-0.5 text-[10px] font-mono border transition-colors',
                eventFilters.size === 0 || eventFilters.has(evt)
                  ? 'border-text-muted/40 text-text'
                  : 'border-border text-text-muted/70',
              )}
            >
              {evt}
            </button>
          ))}
        </div>
      )}

      {/* Log entries */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-96 overflow-y-auto"
      >
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm text-text-muted">
              {entries.length === 0
                ? 'Listening for events...'
                : 'No events match the current filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-6 py-2 text-xs hover:bg-surface-hover transition-colors"
              >
                <span className="font-mono text-text-muted shrink-0 w-16">
                  {formatTime(entry.timestamp)}
                </span>
                <span
                  className={cn(
                    'font-mono font-medium shrink-0 w-28 truncate',
                    getEventColor(entry.event),
                  )}
                >
                  {entry.event}
                </span>
                <span className="font-mono text-text-muted truncate flex-1 min-w-0">
                  {truncatePayload(entry.payload)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pause indicator */}
      {paused && entries.length > 0 && (
        <div className="px-6 py-2 border-t border-warning/30 bg-warning/5">
          <span className="text-[10px] font-medium text-warning uppercase tracking-wider">
            Auto-scroll paused
          </span>
        </div>
      )}
    </div>
  );
}
