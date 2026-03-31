'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { useDashboardConfig } from '@/lib/dashboard-config';

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

interface Command {
  id: string;
  label: string;
  category: 'create' | 'navigate' | 'action';
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
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

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const COMMAND_CATEGORY_LABELS: Record<string, string> = {
  create: 'Quick Actions',
  navigate: 'Navigate',
  action: 'Actions',
};

const COMMAND_CATEGORY_ORDER = ['create', 'navigate', 'action'] as const;

// ── Component ─────────────────────────────────────────

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toggleConfigMode } = useDashboardConfig();

  // ── Build commands list ─────────────────────────────
  const commands: Command[] = useMemo(() => {
    const close = () => setOpen(false);

    const nav = (path: string) => () => {
      close();
      router.push(path);
    };

    return [
      // Create actions
      { id: 'new-task', label: 'New Task', category: 'create' as const, icon: <PlusIcon />, action: nav('/tasks'), keywords: ['create', 'add', 'task', 'todo'] },
      { id: 'new-idea', label: 'New Idea', category: 'create' as const, icon: <PlusIcon />, action: nav('/ideas'), keywords: ['create', 'add', 'idea', 'capture'] },
      { id: 'new-thought', label: 'New Thought', category: 'create' as const, icon: <PlusIcon />, action: nav('/thoughts'), keywords: ['create', 'add', 'thought', 'note'] },
      { id: 'new-project', label: 'New Project', category: 'create' as const, icon: <PlusIcon />, action: nav('/projects'), keywords: ['create', 'add', 'project'] },
      { id: 'new-goal', label: 'New Goal', category: 'create' as const, icon: <PlusIcon />, action: nav('/goals'), keywords: ['create', 'add', 'goal', 'objective'] },
      { id: 'new-win', label: 'New Win', category: 'create' as const, icon: <PlusIcon />, action: nav('/journal'), keywords: ['create', 'add', 'win', 'celebrate'] },
      { id: 'new-reminder', label: 'New Reminder', category: 'create' as const, icon: <PlusIcon />, action: nav('/today'), keywords: ['create', 'add', 'reminder', 'alert'] },

      // Navigate actions
      { id: 'go-today', label: 'Go to Today', category: 'navigate' as const, icon: <ArrowRightIcon />, action: nav('/today'), keywords: ['home', 'today', 'now'] },
      { id: 'go-tasks', label: 'Go to Tasks', category: 'navigate' as const, icon: <ArrowRightIcon />, action: nav('/tasks'), keywords: ['tasks', 'todos'] },
      { id: 'go-projects', label: 'Go to Projects', category: 'navigate' as const, icon: <ArrowRightIcon />, action: nav('/projects'), keywords: ['projects'] },
      { id: 'go-compass', label: 'Go to Compass', category: 'navigate' as const, icon: <ArrowRightIcon />, action: nav('/goals'), keywords: ['goals', 'compass', 'objectives'] },
      { id: 'go-journal', label: 'Go to Journal', category: 'navigate' as const, icon: <ArrowRightIcon />, action: nav('/journal'), keywords: ['journal', 'diary', 'log'] },
      { id: 'go-ideas', label: 'Go to Ideas', category: 'navigate' as const, icon: <ArrowRightIcon />, action: nav('/ideas'), keywords: ['ideas', 'brainstorm'] },
      { id: 'go-thoughts', label: 'Go to Thoughts', category: 'navigate' as const, icon: <ArrowRightIcon />, action: nav('/thoughts'), keywords: ['thoughts', 'notes'] },
      { id: 'go-reviews', label: 'Go to Reviews', category: 'navigate' as const, icon: <ArrowRightIcon />, action: nav('/reviews'), keywords: ['reviews', 'reflect'] },
      { id: 'go-resources', label: 'Go to Resources', category: 'navigate' as const, icon: <ArrowRightIcon />, action: nav('/resources'), keywords: ['resources', 'links', 'bookmarks'] },
      { id: 'go-schedules', label: 'Go to Schedules', category: 'navigate' as const, icon: <ArrowRightIcon />, action: nav('/calendar'), keywords: ['calendar', 'schedules', 'plan'] },
      { id: 'go-settings', label: 'Go to Settings', category: 'navigate' as const, icon: <ArrowRightIcon />, action: nav('/settings'), keywords: ['settings', 'preferences', 'config'] },

      // Actions
      { id: 'start-weekly-review', label: 'Start Weekly Review', category: 'action' as const, icon: <PlayIcon />, action: nav('/reviews'), keywords: ['weekly', 'review', 'start'] },
      { id: 'start-daily-review', label: 'Start Daily Review', category: 'action' as const, icon: <PlayIcon />, action: nav('/reviews'), keywords: ['daily', 'review', 'start'] },
      {
        id: 'configure-layout',
        label: 'Configure Layout',
        category: 'action' as const,
        icon: <SettingsIcon />,
        action: () => {
          close();
          toggleConfigMode();
        },
        keywords: ['configure', 'layout', 'customize', 'theme', 'design'],
      },
    ];
  }, [router, toggleConfigMode]);

  // ── Filter commands by query ────────────────────────
  const filteredCommands = useMemo(() => {
    const raw = query.trim();
    if (raw === '' || raw === '>') return commands;

    const search = (raw.startsWith('>') ? raw.slice(1) : raw).trim().toLowerCase();
    if (search === '') return commands;

    return commands.filter(cmd => {
      const haystack = [cmd.label, ...cmd.keywords].join(' ').toLowerCase();
      return search.split(/\s+/).every(term => haystack.includes(term));
    });
  }, [query, commands]);

  // ── Group filtered commands by category ─────────────
  const commandGroups = useMemo(() => {
    const groups: { category: string; label: string; items: Command[] }[] = [];
    for (const cat of COMMAND_CATEGORY_ORDER) {
      const items = filteredCommands.filter(c => c.category === cat);
      if (items.length > 0) {
        groups.push({ category: cat, label: COMMAND_CATEGORY_LABELS[cat] ?? cat, items });
      }
    }
    return groups;
  }, [filteredCommands]);

  // ── Determine if we're in command-only mode ─────────
  const isCommandMode = query.trim().startsWith('>');

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

  // ── Determine search query (strip > prefix) ────────
  const effectiveSearchQuery = useMemo(() => {
    const raw = debouncedQuery.trim();
    if (raw.startsWith('>')) return '';
    return raw;
  }, [debouncedQuery]);

  // ── Query Convex ────────────────────────────────────
  const rawResults = useQuery(
    api.search.search,
    effectiveSearchQuery.length > 0 ? { q: effectiveSearchQuery } : 'skip'
  );

  // ── Flatten results into ordered list ───────────────
  const { sections, flatItems: searchFlatItems } = useMemo(() => {
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

  // ── Build unified selectable items list ─────────────
  // Commands come first, then search results
  const totalSelectableCount = filteredCommands.length + searchFlatItems.length;

  // Determine which commands and results to show
  const isSearching = effectiveSearchQuery.length > 0;
  const isLoading = isSearching && rawResults === undefined;
  const hasSearchResults = sections.length > 0;
  const noSearchResults = isSearching && !isLoading && !hasSearchResults;
  const showCommands = filteredCommands.length > 0;
  const showRecent = !isSearching && !isCommandMode && !query.trim();

  // ── Reset selected index when items change ──────────
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length, searchFlatItems.length, query]);

  // ── Execute action for current selection ────────────
  const executeSelected = useCallback(() => {
    if (selectedIndex < filteredCommands.length) {
      // Selected item is a command
      filteredCommands[selectedIndex].action();
    } else {
      // Selected item is a search result
      const resultIndex = selectedIndex - filteredCommands.length;
      const item = searchFlatItems[resultIndex];
      if (item) {
        if (effectiveSearchQuery) {
          saveRecentSearch(effectiveSearchQuery);
        }
        setOpen(false);
        router.push(item.path);
      }
    }
  }, [selectedIndex, filteredCommands, searchFlatItems, effectiveSearchQuery, router]);

  // ── Navigate to a result ────────────────────────────
  const navigateTo = useCallback((path: string) => {
    if (effectiveSearchQuery) {
      saveRecentSearch(effectiveSearchQuery);
    }
    setOpen(false);
    router.push(path);
  }, [router, effectiveSearchQuery]);

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
          const max = totalSelectableCount;
          const next = prev + 1;
          return next >= max ? 0 : next;
        });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const max = totalSelectableCount;
          const next = prev - 1;
          return next < 0 ? Math.max(max - 1, 0) : next;
        });
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        executeSelected();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, totalSelectableCount, executeSelected]);

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

  // Track the global flat index for keyboard navigation across commands + results
  let globalIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full h-full md:h-fit max-h-full md:max-h-[60vh] md:max-w-2xl md:mx-4 md:mt-[15vh] flex flex-col md:rounded-xl border-0 md:border border-border bg-bg shadow-2xl overflow-hidden">
        {/* ── Search input row ─────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <SearchIcon className="shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type > for commands..."
            className="flex-1 bg-transparent text-lg text-text placeholder:text-text-muted/50 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-surface px-1.5 text-[10px] font-mono text-text-muted">
            ESC
          </kbd>
        </div>

        {/* ── Results area ─────────────────────────────── */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {/* Commands section */}
          {showCommands && (
            <div className="py-2">
              {commandGroups.map(({ category, label, items }) => (
                <div key={category} className="mb-1">
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {label}
                  </p>
                  {items.map((cmd) => {
                    globalIndex++;
                    const idx = globalIndex;
                    const isSelected = idx === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        data-result-index={idx}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors rounded-lg mx-0',
                          isSelected
                            ? 'bg-surface text-text'
                            : 'text-text-muted hover:bg-surface/50 hover:text-text',
                        )}
                        onClick={() => cmd.action()}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <span className={cn(
                          'flex items-center justify-center w-7 h-7 rounded-lg border',
                          isSelected ? 'border-accent/30 bg-accent/10 text-accent' : 'border-border bg-surface text-text-muted',
                        )}>
                          {cmd.icon}
                        </span>
                        <span className="flex-1 min-w-0 truncate text-sm">
                          {cmd.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Separator between commands and search results */}
          {showCommands && hasSearchResults && (
            <div className="mx-4 border-t border-border" />
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-muted animate-pulse">Searching...</p>
            </div>
          )}

          {/* No results */}
          {noSearchResults && !showCommands && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-muted">
                No results for &ldquo;{effectiveSearchQuery}&rdquo;
              </p>
            </div>
          )}

          {/* Recent searches (shown when input is empty and no command mode) */}
          {showRecent && recentSearches.length > 0 && (
            <div className="px-2 py-3">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Recent searches
              </p>
              {recentSearches.map((term) => (
                <button
                  key={term}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
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

          {/* Grouped search results */}
          {hasSearchResults && !isCommandMode && (
            <div className="py-2">
              {sections.map(({ key, label, items }) => (
                <div key={key} className="mb-1">
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {label}
                  </p>
                  {items.map((item) => {
                    globalIndex++;
                    const idx = globalIndex;
                    const isSelected = idx === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        data-result-index={idx}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors rounded-lg',
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
          <span className="ml-auto flex items-center gap-1 text-[10px] text-text-muted">
            Type
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-surface px-1 font-mono text-[9px]">
              &gt;
            </kbd>
            for commands
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
