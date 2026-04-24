'use client';

// Meetings — style inspiration. Dev-only picker showing 4 row styles and
// 4 summary-formatting variants side-by-side. Pick the ones you want
// and tell Claude; production layouts aren't changed by this page.
//
// Separate from /meetings/inspiration (which picks overall layout family
// — timeline vs kanban vs list vs cards). This one is for visual polish
// within the chosen family.

import { useMemo } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  type MeetingPreview,
  formatTimeOfDay,
  formatAttendees,
  formatDateHeader,
  summaryPreview,
} from '@/lib/meeting-utils';
import { mockMeetings } from '@/lib/meeting-utils';
import {
  MeetingSummary,
  type SummaryVariant,
} from '@/components/meeting-summary-md';
import { cn } from '@/lib/utils';

const SAMPLE_MARKDOWN = `## Event Strategy Discussion

Faye raised concerns about continuing events without a clear business case.

- Last event felt like "just a party" — no lasting impact on pipeline
- Events drain energy without capturing qualified leads
- Agreed to pause until we define a measurable goal

## Next Steps

- **Faye** — draft one-pager on event ROI expectations by Friday
- **Kemp** — line up 3 potential partners for Q3 co-hosted event
- **Jiefei** — pull attendance + NPS data from last 4 events

## Open Questions

1. Should we differentiate "community" events from "growth" events?
2. What's the minimum lead-gen bar to justify another in-person?
3. Is there a digital-only format that captures the "Within" ethos?
`;

const SAMPLE_PLAIN = `Event Strategy Discussion
Faye expressed concerns about continuing events without clear business value
Last event felt like "just a party" with no lasting impact
Events drain energy without capturing qualified leads
Next Steps
Faye to draft a one-pager on event ROI expectations by Friday
Kemp to line up 3 potential partners for a Q3 co-hosted event
Jiefei to pull attendance and NPS data from the last 4 events`;

const ROW_VARIANTS = [
  {
    key: 'row-A',
    name: 'A · Current (refined)',
    note: 'Accent bar on the left, folder tucked next to the time, attendees only when not solo, tags as accent pills.',
    Render: RowA,
  },
  {
    key: 'row-B',
    name: 'B · Card-per-row',
    note: 'Subtle surface background per row with rounded edges. Folder becomes a label chip up top. More air, fewer rows fit on screen.',
    Render: RowB,
  },
  {
    key: 'row-C',
    name: 'C · Sparse',
    note: 'Title + time only on the main line. Everything else hidden until hover. Fastest scanning, best if you know what you\'re looking for.',
    Render: RowC,
  },
  {
    key: 'row-D',
    name: 'D · Granola-mirror',
    note: 'Matches Granola\'s native UI: large title, small attendees subline, folder glyph on far right. Feels familiar coming from Granola.',
    Render: RowD,
  },
] as const;

const SUMMARY_VARIANTS: Array<{ key: SummaryVariant; name: string; note: string }> = [
  {
    key: 'prose',
    name: 'Prose (default)',
    note: 'Paragraph headings + comfortable spacing + proper bullets. The Notion-editorial look.',
  },
  {
    key: 'sections',
    name: 'Sections',
    note: 'Each heading gets a colored left-border. Chunks feel visually distinct.',
  },
  {
    key: 'outline',
    name: 'Outline',
    note: 'Everything nested as bullets, like a collapsible note. Scans fast for action items.',
  },
  {
    key: 'compact',
    name: 'Compact',
    note: 'Tighter font and spacing. Good when the peek panel is narrow or summaries run long.',
  },
];

export default function MeetingsStyleInspirationPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  const meetings = useMemo(() => mockMeetings().slice(0, 5) as unknown as MeetingPreview[], []);
  const groupLabel = formatDateHeader(meetings[0]?.startedAt ?? Date.now());

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Meetings — style picker</h1>
          <p className="text-sm text-text-muted mt-1">
            Preview row + summary treatments with mock data. Tell Claude which
            row letter and summary letter you want baked into production.
          </p>
        </div>
        <Link
          href="/meetings"
          className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-text-muted hover:text-text hover:border-accent/40 transition-colors shrink-0"
        >
          Back to /meetings
        </Link>
      </div>

      <section className="mb-10 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted/80">
          Row styles
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {ROW_VARIANTS.map((v) => (
            <div key={v.key} className="rounded-xl border border-border bg-bg-subtle/30 overflow-hidden">
              <header className="px-5 py-3 border-b border-border flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-text">{v.name}</h3>
                <span className="text-[10px] text-text-muted/70 text-right">{v.note}</span>
              </header>
              <div className="bg-bg">
                <div className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted/70 bg-bg-subtle/30">
                  {groupLabel}
                </div>
                <ul className="divide-y divide-border/60">
                  {meetings.map((m) => (
                    <li key={m._id}>
                      <v.Render m={m} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted/80">
          Summary formatting
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {SUMMARY_VARIANTS.map((v) => (
            <div key={v.key} className="rounded-xl border border-border bg-bg-subtle/30 overflow-hidden">
              <header className="px-5 py-3 border-b border-border flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-text">{v.name}</h3>
                <span className="text-[10px] text-text-muted/70 text-right">{v.note}</span>
              </header>
              <div className="bg-bg px-5 py-5">
                <MeetingSummary markdown={SAMPLE_MARKDOWN} variant={v.key} />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-bg-subtle/30 overflow-hidden max-w-3xl">
          <header className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text">Fallback — plain text only (no markdown)</h3>
            <p className="text-[10px] text-text-muted/70 mt-1">
              When Granola only ships <code>summary_text</code>, the renderer
              infers headings + bullets from line shape. Shown here in the
              Prose variant.
            </p>
          </header>
          <div className="bg-bg px-5 py-5">
            <MeetingSummary plain={SAMPLE_PLAIN} variant="prose" />
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Row variants ────────────────────────────────────
// All four render the same meeting preview — just different visual
// treatments. Shared helper for the folder glyph so they look consistent.

function FolderGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M2 4 L7 4 L8.5 5.5 L14 5.5 L14 12 L2 12 Z" />
    </svg>
  );
}

// A · Current (with fixes already shipped to meetings-timeline.tsx)
function RowA({ m }: { m: MeetingPreview }) {
  const hasOthers = (m.attendees?.length ?? 0) > 1;
  const attendees = hasOthers ? formatAttendees(m.attendees, 3) : '';
  const preview = summaryPreview(m.summary, 140);
  const folderBadge = m.folders?.[0];
  const time = formatTimeOfDay(m.startedAt);
  return (
    <div className="px-5 py-3 flex items-start gap-3">
      <div className="w-1 self-stretch rounded-full bg-accent/40 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-sm font-semibold text-text truncate">{m.title}</h4>
          <div className="flex items-baseline gap-2 shrink-0">
            {folderBadge && (
              <span className="inline-flex items-center gap-1 text-[10px] text-text-muted/70 font-medium">
                <FolderGlyph />
                {folderBadge}
              </span>
            )}
            <span className="text-[10px] text-text-muted/80 tabular-nums">{time}</span>
          </div>
        </div>
        {attendees && (
          <div className="mt-1 text-[11px] text-text-muted/80 truncate">{attendees}</div>
        )}
        {preview && (
          <p className="text-xs text-text-muted/70 leading-relaxed mt-1.5 line-clamp-2">{preview}</p>
        )}
      </div>
    </div>
  );
}

// B · Card-per-row — each row a subtle card
function RowB({ m }: { m: MeetingPreview }) {
  const hasOthers = (m.attendees?.length ?? 0) > 1;
  const attendees = hasOthers ? formatAttendees(m.attendees, 3) : '';
  const folderBadge = m.folders?.[0];
  const time = formatTimeOfDay(m.startedAt);
  return (
    <div className="px-4 py-3">
      <div className="rounded-lg border border-border/60 bg-surface/50 px-4 py-3">
        {folderBadge && (
          <div className="mb-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent/80">
              <FolderGlyph />
              {folderBadge}
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-sm font-semibold text-text truncate">{m.title}</h4>
          <span className="text-[10px] text-text-muted/80 tabular-nums shrink-0">{time}</span>
        </div>
        {attendees && (
          <div className="mt-1 text-[11px] text-text-muted/70">{attendees}</div>
        )}
      </div>
    </div>
  );
}

// C · Sparse — title + time only, rest revealed on hover
function RowC({ m }: { m: MeetingPreview }) {
  const hasOthers = (m.attendees?.length ?? 0) > 1;
  const attendees = hasOthers ? formatAttendees(m.attendees, 3) : '';
  const folderBadge = m.folders?.[0];
  const time = formatTimeOfDay(m.startedAt);
  return (
    <div className="group px-5 py-2 flex items-baseline gap-3 hover:bg-surface-hover transition-colors">
      <span className="text-[11px] text-text-muted/70 tabular-nums w-12 shrink-0">{time}</span>
      <h4 className="text-sm text-text truncate flex-1">{m.title}</h4>
      <div className="hidden group-hover:flex items-baseline gap-2 shrink-0 text-[10px] text-text-muted/70">
        {attendees && <span className="truncate max-w-[140px]">{attendees}</span>}
        {folderBadge && (
          <span className="inline-flex items-center gap-1">
            <FolderGlyph />
            {folderBadge}
          </span>
        )}
      </div>
    </div>
  );
}

// D · Granola-mirror — large title, attendees subline, folder far right
function RowD({ m }: { m: MeetingPreview }) {
  const hasOthers = (m.attendees?.length ?? 0) > 1;
  const attendees = hasOthers ? formatAttendees(m.attendees, 3) : '';
  const folderBadge = m.folders?.[0];
  const time = formatTimeOfDay(m.startedAt);
  return (
    <div className="px-5 py-3.5 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-text truncate leading-tight">{m.title}</h4>
        {attendees && (
          <div className="text-[11px] text-text-muted/80 mt-0.5 truncate">{attendees}</div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {folderBadge && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-bg-subtle border border-border text-text-muted/70" title={folderBadge}>
            <FolderGlyph />
          </span>
        )}
        <span className="text-[11px] text-text-muted/80 tabular-nums">{time}</span>
      </div>
    </div>
  );
}
