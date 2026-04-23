// Shared formatting + bucketing helpers for the four meeting layouts.
// Each layout renders the same `Doc<'meetings'>` shape; only the bucketing
// rules differ. Centralised here so the inspiration chooser and the
// production sections stay in lockstep.

import type { Doc } from '@/lib/convex-api';

export type Meeting = Doc<'meetings'>;

const MS_PER_DAY = 86_400_000;

export interface MeetingBuckets {
  today: Meeting[];
  thisWeek: Meeting[];
  lastWeek: Meeting[];
  older: Meeting[];
}

/** Bucket meetings into the 4 kanban columns relative to `now` (Monday-based weeks). */
export function bucketByWeek(meetings: Meeting[], now = Date.now()): MeetingBuckets {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const day = today.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const thisMondayMs = today.getTime() - diffToMonday * MS_PER_DAY;
  const lastMondayMs = thisMondayMs - 7 * MS_PER_DAY;
  const todayMs = today.getTime();
  const tomorrowMs = todayMs + MS_PER_DAY;

  const buckets: MeetingBuckets = { today: [], thisWeek: [], lastWeek: [], older: [] };
  for (const m of meetings) {
    const ts = m.startedAt ?? m._creationTime;
    if (ts >= todayMs && ts < tomorrowMs) buckets.today.push(m);
    else if (ts >= thisMondayMs) buckets.thisWeek.push(m);
    else if (ts >= lastMondayMs) buckets.lastWeek.push(m);
    else buckets.older.push(m);
  }
  return buckets;
}

/** "Mar 14 · 09:30" / "Today · 14:00" / "Yesterday · 16:00" */
export function formatMeetingTime(epochMs: number | undefined, now = Date.now()): string {
  if (!epochMs) return '—';
  const d = new Date(epochMs);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dStart = new Date(d);
  dStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dStart.getTime() - today.getTime()) / MS_PER_DAY);

  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === -1) return `Yesterday · ${time}`;
  if (diffDays > -7 && diffDays < 0) {
    return `${d.toLocaleDateString('en-US', { weekday: 'long' })} · ${time}`;
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()} · ${time}`;
}

/** "32m" / "1h 12m" — undefined for missing endpoints. */
export function formatDuration(startedAt?: number, endedAt?: number): string | null {
  if (!startedAt || !endedAt || endedAt <= startedAt) return null;
  const minutes = Math.round((endedAt - startedAt) / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** First N words of a summary, with an ellipsis if truncated. */
export function summaryPreview(summary: string | undefined, maxChars = 220): string {
  if (!summary) return '';
  const cleaned = summary.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxChars) return cleaned;
  return cleaned.slice(0, maxChars).trimEnd() + '…';
}

/** Initials for an attendee badge ("Jane Smith" → "JS", "alice@x.com" → "AL"). */
export function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  // Single token / email
  const local = trimmed.split('@')[0];
  return local.slice(0, 2).toUpperCase();
}

/** Mock meetings for the inspiration chooser — same shape the real query returns. */
export function mockMeetings(now = Date.now()): Meeting[] {
  const make = (
    offsetMin: number,
    durationMin: number,
    title: string,
    attendees: string[],
    summary: string,
  ): Meeting => {
    const startedAt = now - offsetMin * 60_000;
    const endedAt = startedAt + durationMin * 60_000;
    return {
      _id: `mock_${offsetMin}` as Meeting['_id'],
      _creationTime: startedAt,
      userId: 'mock_user' as Meeting['userId'],
      granolaId: `not_${offsetMin}`,
      title,
      summary,
      attendees,
      startedAt,
      endedAt,
      syncedAt: now,
    };
  };
  return [
    make(
      45,
      30,
      'Granola integration kickoff',
      ['Kemp Z.', 'Michiel B.'],
      'Walked Michiel through the meetings page concept. Agreed to ship Phase 1 today and pick up Granola sync next week. Open question: how to surface action items inline.',
    ),
    make(
      4 * 60,
      45,
      '1:1 with Sarah on Q2 planning',
      ['Sarah L.', 'Kemp Z.'],
      'Quarterly priorities: ship paid plan, finish onboarding rewrite, double down on Telegram delivery. Sarah pushed back on scope — agreed to drop the Discord lane.',
    ),
    make(
      26 * 60,
      60,
      'Investor sync — Series Seed update',
      ['Kemp Z.', 'Investor A', 'Investor B'],
      'Walked through the dashboard demo, Telegram reminder loop, and the Granola pitch. Strong reception. Asked for a follow-up doc on retention curves before next month.',
    ),
    make(
      3 * 24 * 60,
      30,
      'Design review — meetings page',
      ['Kemp Z.'],
      'Self-led: explored 4 layout candidates before locking in the inspiration page. Timeline still feels best as the default.',
    ),
    make(
      9 * 24 * 60,
      40,
      'Customer interview — solo founder',
      ['Kemp Z.', 'Customer C'],
      'Wants journaling tied directly to weekly review. Telegram delivery was the killer feature for them. Quoted: "I never want to open the dashboard, I just want my bot to nag me." (paraphrased)',
    ),
    make(
      14 * 24 * 60,
      25,
      'Bug bash — onboarding regression',
      ['Kemp Z.', 'Michiel B.'],
      'Found and shipped two fixes for the onboarding loop. Tracked next-step in linear ENG-412.',
    ),
  ];
}
