'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DropdownOption {
  id: string;
  label: string;
}

interface PropertyDropdownProps {
  options: DropdownOption[];
  value: string | null;
  onSelect: (id: string | null) => void;
  placeholder?: string;
  loading?: boolean;
}

export function PropertyDropdown({
  options,
  value,
  onSelect,
  placeholder = 'None',
  loading = false,
}: PropertyDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.id === value)?.label;

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  if (loading) {
    return <span className="text-sm text-text-muted">Loading...</span>;
  }

  return (
    <div className="relative flex-1" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'text-left hover:bg-surface-hover px-2 py-0.5 -mx-2 rounded transition-colors text-sm',
          value ? 'text-text' : 'text-text-muted',
        )}
      >
        {selectedLabel ?? placeholder}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-bg border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-scale-in">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50"
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {/* Clear option */}
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
                setSearch('');
              }}
              className={cn(
                'w-full text-left px-4 py-2 text-sm transition-colors hover:bg-surface-hover',
                !value ? 'text-accent' : 'text-text-muted',
              )}
            >
              {placeholder}
            </button>

            {filtered.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSelect(option.id);
                  setOpen(false);
                  setSearch('');
                }}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors hover:bg-surface-hover',
                  option.id === value ? 'text-accent' : 'text-text',
                )}
              >
                {option.label}
              </button>
            ))}

            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-text-muted/60 text-center">
                No results
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
