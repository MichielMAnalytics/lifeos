'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface HoverAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface HoverActionsMenuProps {
  actions: HoverAction[];
}

export function HoverActionsMenu({ actions }: HoverActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, close]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`h-6 w-6 flex items-center justify-center rounded-md transition-all duration-100 ${
          open
            ? 'opacity-100 bg-surface-hover text-text'
            : 'opacity-0 group-hover:opacity-100 text-text-muted hover:bg-surface-hover hover:text-text'
        }`}
        aria-label="Actions"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-border bg-surface shadow-xl overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                action.onClick();
                close();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                action.variant === 'danger'
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-text hover:bg-surface-hover'
              }`}
            >
              {action.icon && (
                <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center opacity-60">
                  {action.icon}
                </span>
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
