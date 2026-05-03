'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'info' | 'error';
type Toast = { id: number; message: string; tone: Tone; ttlMs: number };

type ToastContextValue = {
  show: (message: string, tone?: Tone, ttlMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue['show']>((message, tone = 'info', ttlMs = 2500) => {
    const id = ++idRef.current;
    setToasts((curr) => [...curr, { id, message, tone, ttlMs }]);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.ttlMs);
    return () => clearTimeout(timer);
  }, [toast.ttlMs, onDismiss]);

  const tone = toast.tone;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto rounded-xl border bg-surface px-4 py-2.5 text-xs font-medium shadow-lg animate-fade-in',
        tone === 'success' && 'border-success/40 text-success',
        tone === 'info' && 'border-border text-text',
        tone === 'error' && 'border-danger/40 text-danger',
      )}
    >
      {toast.message}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Outside the provider — render-safe no-op so non-app pages don't crash.
    return { show: () => {} };
  }
  return ctx;
}
