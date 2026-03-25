'use client';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-bg flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-8">
        <div className="animate-[breathe_6s_ease-in-out_infinite]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 140"
            width="32"
            height="45"
            className="opacity-40"
          >
            <rect x="22" y="20" width="56" height="70" fill="none" stroke="var(--color-text)" strokeWidth="4.5" strokeLinejoin="miter" />
            <line x1="50" y1="115" x2="50" y2="25" stroke="var(--color-text)" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="50" y1="85" x2="26" y2="65" stroke="var(--color-text)" strokeWidth="4" strokeLinecap="round" />
            <line x1="50" y1="85" x2="74" y2="65" stroke="var(--color-text)" strokeWidth="4" strokeLinecap="round" />
            <line x1="50" y1="62" x2="30" y2="42" stroke="var(--color-text)" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="50" y1="62" x2="70" y2="42" stroke="var(--color-text)" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="50" y1="45" x2="38" y2="28" stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" />
            <line x1="50" y1="45" x2="62" y2="28" stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <style jsx>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.04); opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}
