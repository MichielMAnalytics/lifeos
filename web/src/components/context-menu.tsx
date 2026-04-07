'use client';

import { useState, useEffect, useRef, useCallback, useId } from 'react';

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

// Custom event used to coordinate single-instance behavior across all
// ContextMenu components on the page. When any menu opens, it dispatches
// this event with its own id, and every other menu listens for it and
// closes itself if the id doesn't match. Notion-style behavior.
const CTX_MENU_EVENT = 'lifeos:context-menu-open';

export function ContextMenu({ items, children }: ContextMenuProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Tell every other open ContextMenu to close itself before we open.
    window.dispatchEvent(
      new CustomEvent(CTX_MENU_EVENT, { detail: { id } }),
    );

    // Smart positioning: anchor to the cursor with a small offset so the
    // first item isn't directly under the pointer. Flip horizontally if it
    // would overflow the right edge, vertically if it would overflow the
    // bottom edge. Clamp to a small viewport gutter.
    const GUTTER = 8;
    const OFFSET = 4;
    const menuWidth = 220;
    const menuHeight = items.length * 36 + 12; // approximate

    let x = e.clientX + OFFSET;
    let y = e.clientY + OFFSET;

    if (x + menuWidth > window.innerWidth - GUTTER) {
      x = e.clientX - menuWidth - OFFSET;
    }
    if (y + menuHeight > window.innerHeight - GUTTER) {
      y = e.clientY - menuHeight - OFFSET;
    }
    // Final clamp so we never escape the viewport
    x = Math.max(GUTTER, Math.min(x, window.innerWidth - menuWidth - GUTTER));
    y = Math.max(GUTTER, Math.min(y, window.innerHeight - menuHeight - GUTTER));

    setPosition({ x, y });
    setOpen(true);
  }, [items.length, id]);

  // Close on click outside, escape, scroll, OR when another context menu opens.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const handleOtherMenuOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== id) close();
    };
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('scroll', close, true);
    window.addEventListener(CTX_MENU_EVENT, handleOtherMenuOpen);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('contextmenu', close);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener(CTX_MENU_EVENT, handleOtherMenuOpen);
    };
  }, [open, id]);

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
