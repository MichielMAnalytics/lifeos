'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
}

export type { ContextMenuItem };

export function ContextMenu({ items, children }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate position, adjusting for viewport overflow
    const menuWidth = 200;
    const menuHeight = items.length * 36 + 8; // approximate
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = e.clientX - menuWidth;
    }
    if (y + menuHeight > window.innerHeight) {
      y = e.clientY - menuHeight;
    }

    setPosition({ x, y });
    setOpen(true);
  }, [items.length]);

  // Close on click outside, escape, scroll
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', close);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>
      {open && (
        <div
          ref={menuRef}
          className="fixed z-[60] min-w-[180px] rounded-xl border border-border bg-surface shadow-2xl py-1 animate-scale-in"
          style={{ left: position.x, top: position.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <div key={i}>
              {item.divider && <div className="my-1 border-t border-border/40" />}
              <button
                onClick={() => { item.onClick(); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  item.variant === 'danger'
                    ? 'text-text-muted hover:text-danger hover:bg-danger/5'
                    : 'text-text-muted hover:text-text hover:bg-surface-hover'
                }`}
              >
                {item.icon && <span className="opacity-60">{item.icon}</span>}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
