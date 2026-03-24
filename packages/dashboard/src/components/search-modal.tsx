'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────

const RECENT_SEARCHES_KEY = 'lifeos-recent-searches';
const MAX_RECENT = 5;

const SECTION_ORDER = ['tasks', 'goals', 'ideas', 'thoughts', 'journal', 'resources'] as const;

const SECTION_LABELS: Record<string, string> = {
  tasks: 'Tasks',
  goals: 'Goals',
  ideas: 'Ideas',
  thoughts: 'Thoughts',
  journal: 'Journal',
  resources: 'Resources',
};

// Custom event name so nav buttons can open the modal
export const SEARCH_OPEN_EVENT = 'lifeos:open-search';

// ── Types ─────────────────────────────────────────────

interface FlatResult {
  section: string;
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

// ── Helpers ───────────────────────────────────────────

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string').slice(0, MAX_RECENT);
    return [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const recent = getRecentSearches().filter(s => s !== trimmed);
  recent.unshift(trimmed);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

function formatResultItem(section: string, item: Record<string, unknown>): FlatResult {
  const id = String(item._id ?? '');

  switch (section) {
    case 'tasks': {
      const title = String(item.title ?? 'Untitled task');
      const status = String(item.status ?? '');
      const dueDate = item.dueDate ? String(item.dueDate) : '';
      const subtitle = [status, dueDate].filter(Boolean).join('  ');
      return { section, id, title, subtitle, path: `/tasks/${id}` };
    }
    case 'goals': {
      const title = String(item.title ?? 'Untitled goal');
      const status = String(item.status ?? '');
      const quarter = item.quarter ? String(item.quarter) : '';
      const subtitle = [status, quarter].filter(Boolean).join('  ');
      return { section, id, title, subtitle, path: `/goals/${id}` };
    }
    case 'ideas': {
      const content = String(item.content ?? '');
      const title = truncate(content, 80);
      const actionability = item.actionability ? String(item.actionability) : '';
      return { section, id, title, subtitle: actionability, path: '/ideas' };
    }
    case 'thoughts': {
      const title = item.title ? String(item.title) : truncate(String(item.content ?? ''), 80);
      return { section, id, title, subtitle: '', path: '/thoughts' };
    }
    case 'journal': {
      const entryDate = item.entryDate ? String(item.entryDate) : '';
      const mit = item.mit ? String(item.mit) : '';
      const title = mit ? truncate(mit, 60) : `Journal ${entryDate}`;
      return { section, id, title, subtitle: entryDate, path: '/journal' };
    }
    case 'resources': {
      const title = String(item.title ?? 'Untitled resource');
      const type = item.type ? String(item.type) : '';
      return { section, id, title, subtitle: type, path: '/resources' };
    }
    default:
      return { section, id, title: String(item.title ?? id), subtitle: '', path: '/' };
  }
}

// ── SVG Icons ─────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
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
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 opacity-40"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ── Keyboard shortcut: Cmd+K / Ctrl+K ──────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Custom event: nav buttons can dispatch this ─────
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(SEARCH_OPEN_EVENT, handler);
    return () => window.removeEventListener(SEARCH_OPEN_EVENT, handler);
  }, []);

  // ── Debounce query ──────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Auto-focus and reset ────────────────────────────
  useEffect(() => {
    if (open) {
      // Small delay to ensure the DOM is ready
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    if (!open) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // ── Query Convex ────────────────────────────────────
  const rawResults = useQuery(
    api.search.search,
    debouncedQuery.trim().length > 0 ? { q: debouncedQuery.trim() } : 'skip'
  );

  // ── Flatten results into ordered list ───────────────
  const { sections, flatItems } = useMemo(() => {
    if (!rawResults || typeof rawResults !== 'object') {
      return { sections: [] as { key: string; label: string; items: FlatResult[] }[], flatItems: [] as FlatResult[] };
    }

    const result = rawResults as Record<string, unknown[]>;
    const secs: { key: string; label: string; items: FlatResult[] }[] = [];
    const flat: FlatResult[] = [];

    for (const key of SECTION_ORDER) {
      const items = result[key];
      if (!items || !Array.isArray(items) || items.length === 0) continue;

      const mapped = items.map(item => formatResultItem(key, item as Record<string, unknown>));
      secs.push({ key, label: SECTION_LABELS[key] ?? key, items: mapped });
      flat.push(...mapped);
    }

    return { sections: secs, flatItems: flat };
  }, [rawResults]);

  // ── Reset selected index when results change ────────
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatItems]);

  // ── Navigate to a result ────────────────────────────
  const navigateTo = useCallback((path: string) => {
    if (debouncedQuery.trim()) {
      saveRecentSearch(debouncedQuery.trim());
    }
    setOpen(false);
    router.push(path);
  }, [router, debouncedQuery]);

  // ── Keyboard navigation ─────────────────────────────
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev + 1;
          return next >= flatItems.length ? 0 : next;
        });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev - 1;
          return next < 0 ? Math.max(flatItems.length - 1, 0) : next;
        });
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const item = flatItems[selectedIndex];
        if (item) {
          navigateTo(item.path);
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flatItems, selectedIndex, navigateTo]);

  // ── Scroll selected item into view ──────────────────
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-result-index="${selectedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // ── Recent searches ─────────────────────────────────
  const recentSearches = useMemo(() => {
    if (!open) return [];
    return getRecentSearches();
  }, [open]);

  if (!open) return null;

  const isSearching = debouncedQuery.trim().length > 0;
  const isLoading = isSearching && rawResults === undefined;
  const hasResults = sections.length > 0;
  const noResults = isSearching && !isLoading && !hasResults;
  const showRecent = !isSearching && recentSearches.length > 0;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-2xl mx-4 mt-[15vh] h-fit max-h-[60vh] flex flex-col border border-border bg-bg shadow-2xl">
        {/* ── Search input row ─────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <SearchIcon className="shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search LifeOS..."
            className="flex-1 bg-transparent text-lg text-text placeholder:text-text-muted/50 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-surface px-1.5 text-[10px] font-mono text-text-muted">
            ESC
          </kbd>
        </div>

        {/* ── Results area ─────────────────────────────── */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {/* Loading state */}
          {isLoading && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-muted animate-pulse">Searching...</p>
            </div>
          )}

          {/* No results */}
          {noResults && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-muted">
                No results for &ldquo;{debouncedQuery.trim()}&rdquo;
              </p>
            </div>
          )}

          {/* Recent searches (shown when input is empty) */}
          {showRecent && (
            <div className="px-2 py-3">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Recent searches
              </p>
              {recentSearches.map((term) => (
                <button
                  key={term}
                  className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
                  onClick={() => {
                    setQuery(term);
                    setDebouncedQuery(term);
                  }}
                >
                  <ClockIcon />
                  {term}
                </button>
              ))}
            </div>
          )}

          {/* Grouped results */}
          {hasResults && (
            <div className="py-2">
              {sections.map(({ key, label, items }) => (
                <div key={key} className="mb-1">
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {label}
                  </p>
                  {items.map((item) => {
                    flatIndex++;
                    const idx = flatIndex;
                    const isSelected = idx === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        data-result-index={idx}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors',
                          isSelected
                            ? 'bg-surface text-text'
                            : 'text-text-muted hover:bg-surface/50 hover:text-text',
                        )}
                        onClick={() => navigateTo(item.path)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <span className="flex-1 min-w-0 truncate text-sm">
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="shrink-0 text-xs text-text-muted/70">
                            {item.subtitle}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer hints ─────────────────────────────── */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2">
          <span className="flex items-center gap-1 text-[10px] text-text-muted">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-surface px-1 font-mono text-[9px]">
              &uarr;&darr;
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-text-muted">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-surface px-1 font-mono text-[9px]">
              &crarr;
            </kbd>
            open
          </span>
          <span className="flex items-center gap-1 text-[10px] text-text-muted">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-surface px-1 font-mono text-[9px]">
              esc
            </kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Trigger button (reusable in nav / header) ─────────

export function SearchTrigger({
  variant = 'icon',
  className,
}: {
  variant?: 'icon' | 'expanded';
  className?: string;
}) {
  const openSearch = useCallback(() => {
    window.dispatchEvent(new Event(SEARCH_OPEN_EVENT));
  }, []);

  if (variant === 'expanded') {
    return (
      <button
        onClick={openSearch}
        className={cn(
          'flex items-center gap-2.5 text-sm font-medium text-text-muted hover:text-text transition-colors animate-slide-in',
          className,
        )}
        title="Search (Cmd+K)"
      >
        <SearchIcon className="shrink-0 opacity-70" />
        Search
      </button>
    );
  }

  return (
    <button
      onClick={openSearch}
      className={cn(
        'flex items-center justify-center transition-colors text-text-muted hover:text-text',
        className,
      )}
      title="Search (Cmd+K)"
    >
      <SearchIcon />
    </button>
  );
}
