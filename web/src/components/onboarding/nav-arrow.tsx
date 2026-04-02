'use client';

export function NavArrow({ direction, onClick, label }: { direction: 'back' | 'forward'; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 text-xs text-text-muted hover:text-text transition-all duration-200"
    >
      {direction === 'back' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
          <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
        </svg>
      )}
      <span>{label}</span>
      {direction === 'forward' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
          <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}
