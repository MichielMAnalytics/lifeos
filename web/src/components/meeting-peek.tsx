'use client';

// Meeting peek — slide-out panel showing the full meeting summary,
// transcript, and metadata. Mounted from each of the four meeting
// layouts on click. Supports manual delete (the row, not the source
// note in Granola) — the next sync would re-create the row, so this
// is "hide for now" rather than "destroy".

import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { SidePeek } from '@/components/side-peek';
import {
  type Meeting,
  formatMeetingTime,
  formatDuration,
  initialsFor,
} from '@/lib/meeting-utils';

interface MeetingPeekProps {
  meeting: Meeting;
  onClose: () => void;
  // Inspiration chooser passes mock data; it sets allowDelete={false} so
  // the delete button doesn't fire a real mutation against a fake `_id`.
  // Default true so production callers can stay terse.
  allowDelete?: boolean;
}

export function MeetingPeek({ meeting, onClose, allowDelete = true }: MeetingPeekProps) {
  const remove = useMutation(api.meetings.remove);

  const handleDelete = async () => {
    await remove({ id: meeting._id });
    onClose();
  };

  const duration = formatDuration(meeting.startedAt, meeting.endedAt);

  return (
    <SidePeek
      open
      onClose={onClose}
      onDelete={allowDelete ? handleDelete : undefined}
      title="Meeting"
    >
      <div className="px-6 py-5 space-y-6">
        <header className="space-y-2">
          <h1 className="text-xl font-bold text-text leading-tight">{meeting.title}</h1>
          <p className="text-xs text-text-muted/80 tabular-nums">
            {formatMeetingTime(meeting.startedAt)}
            {duration && <span className="ml-1.5 text-text-muted/60">· {duration}</span>}
          </p>
          {meeting.granolaUrl && (
            <a
              href={meeting.granolaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[11px] text-accent hover:underline"
            >
              Open in Granola →
            </a>
          )}
        </header>

        {meeting.attendees && meeting.attendees.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
              Attendees
            </h2>
            <div className="flex flex-wrap gap-2">
              {meeting.attendees.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-xs text-text"
                >
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface text-[9px] font-semibold text-text-muted">
                    {initialsFor(a)}
                  </span>
                  {a}
                </span>
              ))}
            </div>
          </section>
        )}

        {meeting.summary && (
          <section className="space-y-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
              Summary
            </h2>
            <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
              {meeting.summary}
            </p>
          </section>
        )}

        {meeting.transcript && (
          <section className="space-y-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
              Transcript
              {meeting.transcriptTruncated && (
                <span className="ml-2 text-warning normal-case font-normal">
                  · truncated
                </span>
              )}
            </h2>
            <pre className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap font-sans bg-bg-subtle border border-border rounded-lg px-3 py-3 max-h-[60vh] overflow-y-auto">
              {meeting.transcript}
            </pre>
          </section>
        )}

        {!meeting.summary && !meeting.transcript && (
          <p className="text-sm text-text-muted/80 italic">
            No summary or transcript yet — Granola may still be processing this note.
          </p>
        )}
      </div>
    </SidePeek>
  );
}
