/**
 * Custom minimalistic marks for each nav item.
 * Abstract geometric forms — not standard icons.
 * Each is a unique single-stroke or few-stroke SVG.
 */

const S = 16; // viewBox size

function M({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      width={S}
      height={S}
      viewBox={`0 0 ${S} ${S}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

// Today — horizon: rising arc over a ground line
export function MarkToday({ className }: { className?: string }) {
  return (
    <M className={className}>
      <path d="M2 11 A6 6 0 0 1 14 11" />
      <line x1="1" y1="11" x2="15" y2="11" />
      <line x1="8" y1="11" x2="8" y2="14" />
    </M>
  );
}

// Tasks — three stacked horizontal lines with a dot on the first
export function MarkTasks({ className }: { className?: string }) {
  return (
    <M className={className}>
      <circle cx="3" cy="4" r="1.5" fill="currentColor" stroke="none" />
      <line x1="7" y1="4" x2="14" y2="4" />
      <line x1="3" y1="8" x2="14" y2="8" />
      <line x1="3" y1="12" x2="14" y2="12" />
    </M>
  );
}

// Projects — nested squares (layered)
export function MarkProjects({ className }: { className?: string }) {
  return (
    <M className={className}>
      <rect x="1" y="4" width="10" height="10" rx="1" />
      <rect x="5" y="1" width="10" height="10" rx="1" />
    </M>
  );
}

// Compass — compass rose
export function MarkCompass({ className }: { className?: string }) {
  return (
    <M className={className}>
      <circle cx="8" cy="8" r="6" />
      <polygon points="8,3 9.5,7 8,6 6.5,7" fill="currentColor" stroke="none" />
      <polygon points="8,13 6.5,9 8,10 9.5,9" fill="currentColor" stroke="none" opacity="0.4" />
    </M>
  );
}

// Journal — open book: two curved pages meeting at spine
export function MarkJournal({ className }: { className?: string }) {
  return (
    <M className={className}>
      <path d="M8 3 C5 3 2 4 2 5 L2 13 C2 12 5 11 8 12" />
      <path d="M8 3 C11 3 14 4 14 5 L14 13 C14 12 11 11 8 12" />
      <line x1="8" y1="3" x2="8" y2="12" />
    </M>
  );
}

// Ideas — starburst: lines radiating from center
export function MarkIdeas({ className }: { className?: string }) {
  return (
    <M className={className}>
      <line x1="8" y1="1" x2="8" y2="4" />
      <line x1="8" y1="12" x2="8" y2="15" />
      <line x1="1" y1="8" x2="4" y2="8" />
      <line x1="12" y1="8" x2="15" y2="8" />
      <line x1="3" y1="3" x2="5.5" y2="5.5" />
      <line x1="10.5" y1="10.5" x2="13" y2="13" />
      <line x1="13" y1="3" x2="10.5" y2="5.5" />
      <line x1="5.5" y1="10.5" x2="3" y2="13" />
    </M>
  );
}

// Plan — small calendar grid
export function MarkPlan({ className }: { className?: string }) {
  return (
    <M className={className}>
      <rect x="2" y="3" width="12" height="11" rx="1" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="6" y1="3" x2="6" y2="7" />
      <line x1="10" y1="3" x2="10" y2="7" />
      <circle cx="5" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
    </M>
  );
}

// Reviews — ascending steps/bars
export function MarkReviews({ className }: { className?: string }) {
  return (
    <M className={className}>
      <line x1="2" y1="14" x2="14" y2="14" />
      <rect x="2" y="10" width="3" height="4" rx="0.5" fill="currentColor" stroke="none" opacity="0.4" />
      <rect x="6.5" y="6" width="3" height="8" rx="0.5" fill="currentColor" stroke="none" opacity="0.6" />
      <rect x="11" y="2" width="3" height="12" rx="0.5" fill="currentColor" stroke="none" opacity="0.9" />
    </M>
  );
}

// Thoughts — a brain/cloud: curved shape
export function MarkThoughts({ className }: { className?: string }) {
  return (
    <M className={className}>
      <path d="M4 11 C4 7 7 4 10 4 C12 4 14 5 14 7 C14 5 16 5 16 7 C16 9 14 11 12 11 L4 11Z" />
      <line x1="6" y1="11" x2="6" y2="14" />
      <line x1="10" y1="11" x2="10" y2="14" />
    </M>
  );
}

// Resources — stacked file/document shape
export function MarkResources({ className }: { className?: string }) {
  return (
    <M className={className}>
      <rect x="3" y="2" width="10" height="12" rx="1" />
      <line x1="6" y1="5" x2="10" y2="5" />
      <line x1="6" y1="8" x2="10" y2="8" />
      <line x1="6" y1="11" x2="9" y2="11" />
    </M>
  );
}

// Calendar — calendar outline with date pins
export function MarkCalendar({ className }: { className?: string }) {
  return (
    <M className={className}>
      <rect x="2" y="3" width="12" height="11" rx="1" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="5" y1="1" x2="5" y2="4" />
      <line x1="11" y1="1" x2="11" y2="4" />
    </M>
  );
}

// AI Agent — neural network / brain node pattern
export function MarkAiAgent({ className }: { className?: string }) {
  return (
    <M className={className}>
      <circle cx="8" cy="4" r="2" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <line x1="8" y1="6" x2="4" y2="10" />
      <line x1="8" y1="6" x2="12" y2="10" />
      <line x1="4" y1="12" x2="12" y2="12" />
    </M>
  );
}

// Health — heartbeat pulse line
export function MarkHealth({ className }: { className?: string }) {
  return (
    <M className={className}>
      <polyline points="1 8 4 8 6 3 8 13 10 6 12 8 15 8" />
    </M>
  );
}

// Settings — single diagonal line through a dot
export function MarkSettings({ className }: { className?: string }) {
  return (
    <M className={className}>
      <line x1="3" y1="13" x2="13" y2="3" />
      <circle cx="8" cy="8" r="2.5" />
    </M>
  );
}

export const NAV_MARKS: Record<string, React.ComponentType<{ className?: string }>> = {
  today: MarkToday,
  tasks: MarkTasks,
  projects: MarkProjects,
  goals: MarkCompass,
  journal: MarkJournal,
  ideas: MarkIdeas,
  thoughts: MarkThoughts,
  plan: MarkPlan,
  reviews: MarkReviews,
  resources: MarkResources,
  calendar: MarkCalendar,
  'life-coach': MarkAiAgent,
  health: MarkHealth,
  settings: MarkSettings,
};
