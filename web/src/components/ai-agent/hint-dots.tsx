'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "lifeos_hints_dismissed";

interface HintsContextValue {
  dismissed: boolean;
  dismiss: () => void;
  restore: () => void;
}

const HintsContext = createContext<HintsContextValue>({
  dismissed: false,
  dismiss: () => {},
  restore: () => {},
});

export function HintsProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  }, []);

  const restore = useCallback(() => {
    setDismissed(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return (
    <HintsContext.Provider value={{ dismissed, dismiss, restore }}>
      {children}
    </HintsContext.Provider>
  );
}

export function useHints() {
  return useContext(HintsContext);
}

export function HintedSection({ hint, children, dotTop = 24 }: {
  hint: string;
  children: ReactNode;
  dotTop?: number;
}) {
  const { dismissed } = useHints();

  return (
    <div className="relative">
      {!dismissed && (
        <div
          className="absolute -left-7 hidden md:block group/hint"
          style={{ top: dotTop }}
        >
          {/* Enlarged hover target */}
          <span className="absolute -inset-2.5 cursor-help" />
          {/* Soft glow pulse */}
          <span className="absolute inset-[-3px] rounded-full bg-accent/15 animate-pulse" />
          {/* Core dot */}
          <span className="relative block size-[5px] rounded-full bg-accent/60" />
          {/* Tooltip — appears to the right */}
          <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 w-48 px-3 py-2 text-[10px] leading-relaxed text-text bg-surface border border-border rounded-lg shadow-xl shadow-black/50 opacity-0 scale-[0.98] group-hover/hint:opacity-100 group-hover/hint:scale-100 transition-all duration-150 ease-out whitespace-normal">
            {hint}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
