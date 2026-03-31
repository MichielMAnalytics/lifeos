'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SidePeekProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function SidePeek({ open, onClose, children, title, className }: SidePeekProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop - click to close */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-[1px] animate-fade-in"
        onClick={onClose}
      />

      {/* Side panel */}
      <div
        className={cn(
          'w-[520px] max-w-[90vw] h-full bg-bg border-l border-border flex flex-col',
          'animate-slide-in-right shadow-[-8px_0_30px_rgba(0,0,0,0.2)]',
          className,
        )}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            {/* Close button */}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-text px-2 py-1 rounded-md hover:bg-surface-hover transition-colors"
            >
              Close
              <span className="text-[10px] text-text-muted/50">Esc</span>
            </button>
          </div>

          {title && (
            <span className="text-[11px] text-text-muted/50 truncate max-w-[200px]">
              {title}
            </span>
          )}
        </div>

        {/* Content area - scrollable */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
