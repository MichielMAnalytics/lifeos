'use client';

/**
 * Route-based step container. Unlike the original crossfade version,
 * each step page is its own route so we always render (no `active` toggle).
 * Mount animation handled by `animate-fade-in`.
 */
export function StepContainer({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) {
  return (
    <>
      {onBack && (
        <div className="fixed top-6 left-6 z-50">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-xs text-text-muted hover:text-text transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
        </div>
      )}
      <div className="min-h-screen w-full animate-fade-in">
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
          {children}
        </div>
      </div>
    </>
  );
}
