'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface SidePeekProps {
  open: boolean;
  onClose: () => void;
  onOpenFullPage?: () => void;
  onMoveToTrash?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

function showSidePeek() {
  document.documentElement.classList.add('sidePeekOpen');
}
function hideSidePeek() {
  document.documentElement.classList.remove('sidePeekOpen');
}

export function SidePeek({ open, onClose, onOpenFullPage, onMoveToTrash, onDelete, children, title, className }: SidePeekProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Mount: hide scrollbar
  useEffect(() => {
    showSidePeek();
    return () => { hideSidePeek(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const handleClose = useCallback(() => {
    setMenuOpen(false);
    onClose();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    if (!mounted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuOpen) setMenuOpen(false);
        else handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mounted, menuOpen, handleClose]);

  // Block scroll on panel from reaching main page
  useEffect(() => {
    if (!panelRef.current) return;
    const panel = panelRef.current;

    const handler = (e: WheelEvent) => {
      const scrollable = scrollRef.current;
      if (!scrollable) { e.preventDefault(); e.stopPropagation(); return; }

      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const canScroll = scrollHeight > clientHeight;

      if (canScroll) {
        const atTop = scrollTop <= 0 && e.deltaY < 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
        if (atTop || atBottom) e.preventDefault();
      } else {
        e.preventDefault();
      }
      e.stopPropagation();
    };

    panel.addEventListener('wheel', handler, { passive: false });
    return () => panel.removeEventListener('wheel', handler);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      className={cn(
        'flex flex-col bg-bg border-l border-border',
        'shadow-[-8px_0_30px_rgba(0,0,0,0.15)]',
        'animate-slide-in-right',
        className,
      )}
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        width: '528px',
        maxWidth: '92vw',
        zIndex: 9999,
        right: 0,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            title="Close (Esc)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          </button>
          {onOpenFullPage && (
            <button
              onClick={onOpenFullPage}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
              title="Open as full page"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <line x1="14" y1="10" x2="21" y2="3" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {title && (
            <span className="text-xs text-text-muted/50 truncate max-w-[160px] mr-2">{title}</span>
          )}
          {(onMoveToTrash || onDelete) && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                title="More options"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border bg-surface shadow-xl py-1 animate-scale-in z-10">
                  {onMoveToTrash && (
                    <button
                      onClick={() => { setMenuOpen(false); onMoveToTrash(); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Move to Trash
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-muted hover:text-danger hover:bg-danger/5 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                      Delete permanently
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ overscrollBehavior: 'contain' }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
