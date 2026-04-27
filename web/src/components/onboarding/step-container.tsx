'use client';

import { useState, useEffect } from 'react';

/**
 * Route-based step container. Each step page is its own route.
 * Mount animation handled by `animate-fade-in`.
 *
 * `backHref` is the base path (without ?dev). The component appends ?dev
 * on the client if needed, avoiding SSR/client hydration mismatch.
 */
export function StepContainer({ children, onBack, backHref }: { children: React.ReactNode; onBack?: () => void; backHref?: string }) {
  const showBack = onBack || backHref;

  // Resolve ?dev on client only to avoid hydration mismatch
  const [resolvedHref, setResolvedHref] = useState(backHref ?? '');
  useEffect(() => {
    if (!backHref) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('dev')) {
      setResolvedHref(backHref.includes('?') ? `${backHref}&dev` : `${backHref}?dev`);
    } else {
      setResolvedHref(backHref);
    }
  }, [backHref]);

  const backIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
  );

  return (
    <>
      {showBack && (
        <div className="fixed top-6 left-6 z-50">
          {backHref ? (
            <a
              href={resolvedHref}
              className="group flex items-center gap-2 text-xs text-text-muted hover:text-text transition-all duration-200"
            >
              {backIcon}
              <span>Back</span>
            </a>
          ) : (
            <button
              onClick={onBack}
              className="group flex items-center gap-2 text-xs text-text-muted hover:text-text transition-all duration-200"
            >
              {backIcon}
              <span>Back</span>
            </button>
          )}
        </div>
      )}
      {/* LifeAI logo — top center */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-40">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" width="28" height="39" className="opacity-30">
          <rect x="22" y="20" width="56" height="70" fill="none" stroke="var(--color-text)" strokeWidth="5" strokeLinejoin="miter" />
          <line x1="50" y1="115" x2="50" y2="25" stroke="var(--color-text)" strokeWidth="5" strokeLinecap="round" />
          <line x1="50" y1="85" x2="26" y2="65" stroke="var(--color-text)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="50" y1="85" x2="74" y2="65" stroke="var(--color-text)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="50" y1="62" x2="30" y2="42" stroke="var(--color-text)" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="62" x2="70" y2="42" stroke="var(--color-text)" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="45" x2="38" y2="28" stroke="var(--color-text)" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="50" y1="45" x2="62" y2="28" stroke="var(--color-text)" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="min-h-screen w-full animate-fade-in">
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
          {children}
        </div>
      </div>
    </>
  );
}
