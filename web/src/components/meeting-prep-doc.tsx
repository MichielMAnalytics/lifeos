'use client';

// Meeting prep — Notion-style document layout (default).
//
// Header (title, date, attendees) → AI talking points → editable agenda
// → editable notes → context rail (related past meetings, open tasks,
// active goals). Picked over the card-grid and sidebar variants because
// the document feel matches how the user already takes meeting notes.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc, Id } from '@/lib/convex-api';
import { MeetingSummary } from '@/components/meeting-summary-md';
import { cn } from '@/lib/utils';

type PrepView = NonNullable<ReturnType<typeof useViewWithContext>>;

function useViewWithContext(id: Id<'meetingPreps'>) {
  return useQuery(api.meetingPreps.viewWithContext, { id });
}

interface Props {
  id: Id<'meetingPreps'>;
  variant?: 'doc' | 'cards' | 'sidebar';
}

export function MeetingPrepDoc({ id, variant = 'doc' }: Props) {
  const view = useViewWithContext(id);
  if (view === undefined) return <SkeletonDoc />;
  if (view === null) return <NotFound />;

  if (variant === 'cards') return <CardsLayout view={view} />;
  if (variant === 'sidebar') return <SidebarLayout view={view} />;
  return <DocLayout view={view} />;
}

// ── Doc layout (default) ─────────────────────────────

function DocLayout({ view }: { view: PrepView }) {
  return (
    <div className="max-w-3xl mx-auto px-1">
      <Header view={view} />
      <ActionBar view={view} />
      <TalkingPoints view={view} />
      <EditableField
        view={view}
        field="agenda"
        label="Agenda"
        placeholder="What do you want to discuss? Write the questions, decisions, and asks you're walking in with."
      />
      <EditableField
        view={view}
        field="notes"
        label="Notes"
        placeholder="Scratch space — anything you want close at hand during the meeting."
      />
      <ContextRail view={view} />
    </div>
  );
}

// ── Cards layout ─────────────────────────────────────

function CardsLayout({ view }: { view: PrepView }) {
  return (
    <div className="max-w-5xl mx-auto px-1 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-3">
        <Header view={view} />
        <ActionBar view={view} />
      </div>
      <div className="md:col-span-2 space-y-4">
        <Card title="Talking points">
          <TalkingPoints view={view} embedded />
        </Card>
        <Card title="Agenda">
          <EditableField
            view={view}
            field="agenda"
            label=""
            placeholder="What do you want to discuss?"
            embedded
          />
        </Card>
        <Card title="Notes">
          <EditableField
            view={view}
            field="notes"
            label=""
            placeholder="Scratch space."
            embedded
          />
        </Card>
      </div>
      <div className="space-y-4">
        <Card title="Past meetings">
          <PastList view={view} />
        </Card>
        <Card title="Open tasks">
          <TaskList view={view} />
        </Card>
        {view.relatedGoals && view.relatedGoals.length > 0 && (
          <Card title="Active goals">
            <GoalList view={view} />
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Sidebar layout ───────────────────────────────────

function SidebarLayout({ view }: { view: PrepView }) {
  return (
    <div className="max-w-6xl mx-auto px-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div>
        <Header view={view} />
        <ActionBar view={view} />
        <TalkingPoints view={view} />
        <EditableField
          view={view}
          field="agenda"
          label="Agenda"
          placeholder="What do you want to discuss?"
        />
        <EditableField
          view={view}
          field="notes"
          label="Notes"
          placeholder="Scratch space."
        />
      </div>
      <aside className="space-y-4 lg:sticky lg:top-6 self-start">
        <SidebarBlock title="Past meetings">
          <PastList view={view} compact />
        </SidebarBlock>
        <SidebarBlock title="Open tasks">
          <TaskList view={view} compact />
        </SidebarBlock>
        {view.relatedGoals && view.relatedGoals.length > 0 && (
          <SidebarBlock title="Active goals">
            <GoalList view={view} compact />
          </SidebarBlock>
        )}
      </aside>
    </div>
  );
}

// ── Shared blocks ────────────────────────────────────

function Header({ view }: { view: PrepView }) {
  const u = view.upcoming;
  return (
    <header className="mb-6 pb-4 border-b border-border">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 mb-2">
        Meeting prep
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-text">{view.prep.title}</h1>
      {u && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span>{formatWhen(u.startedAt, u.endedAt)}</span>
          {u.attendees.length > 0 && (
            <>
              <span className="text-text-muted/40">·</span>
              <span>{u.attendees.join(', ')}</span>
            </>
          )}
          {u.location && (
            <>
              <span className="text-text-muted/40">·</span>
              <span>{u.location}</span>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function ActionBar({ view }: { view: PrepView }) {
  const refresh = useMutation(api.meetingPreps.refreshContext);
  const generate = useAction(api.meetingPrepGenerator.generate);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await refresh({ id: view.prep._id });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generate({ id: view.prep._id });
      if (!result.ok) {
        if (result.reason === 'missing-api-key') {
          setError('No OpenAI key. Add one in Settings → BYOK.');
        } else if (result.reason === 'no-context') {
          setError('No related context yet. Add agenda/notes or refresh context first.');
        } else {
          setError(`Couldn't generate: ${result.reason}.`);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generate failed');
    } finally {
      setGenerating(false);
    }
  };

  const refreshedAt = view.prep.contextRefreshedAt
    ? new Date(view.prep.contextRefreshedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-text-muted hover:text-text hover:border-accent/40 transition-colors disabled:opacity-50"
        >
          {refreshing ? 'Refreshing…' : 'Refresh context'}
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {generating ? 'Generating…' : view.prep.talkingPoints ? 'Regenerate brief' : 'Generate brief'}
        </button>
        {refreshedAt && (
          <span className="text-[10px] text-text-muted/60 ml-1">
            Context refreshed {refreshedAt}
          </span>
        )}
      </div>
      {error && (
        <p className="text-[11px] text-warning whitespace-pre-line">{error}</p>
      )}
    </div>
  );
}

function TalkingPoints({ view, embedded = false }: { view: PrepView; embedded?: boolean }) {
  const tp = view.prep.talkingPoints;
  if (!tp) {
    if (embedded) {
      return (
        <p className="text-xs text-text-muted/70 italic">
          No brief yet — click Generate brief above.
        </p>
      );
    }
    return (
      <section className="mb-8 border border-dashed border-border rounded-xl px-5 py-6 text-center">
        <p className="text-sm text-text-muted">No AI brief yet</p>
        <p className="text-xs text-text-muted/70 mt-1">
          Click "Generate brief" once you've added agenda or refreshed context.
        </p>
      </section>
    );
  }
  return (
    <section className={cn(!embedded && 'mb-8')}>
      {!embedded && (
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted/80 mb-3">
          AI brief
        </h2>
      )}
      <div className="bg-bg-subtle/40 border border-border rounded-xl px-5 py-4">
        <MeetingSummary markdown={tp} variant="prose" />
      </div>
    </section>
  );
}

function EditableField({
  view,
  field,
  label,
  placeholder,
  embedded = false,
}: {
  view: PrepView;
  field: 'agenda' | 'notes';
  label: string;
  placeholder: string;
  embedded?: boolean;
}) {
  const updateAgenda = useMutation(api.meetingPreps.updateAgenda);
  const updateNotes = useMutation(api.meetingPreps.updateNotes);
  const initial = view.prep[field] ?? '';
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(initial);

  // If the upstream record changes (e.g., another tab edited), reflect it
  // here — but only when it's not just our own pending write echoing back.
  useEffect(() => {
    if (initial !== lastSaved.current && initial !== value) {
      setValue(initial);
      lastSaved.current = initial;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const handleChange = (next: string) => {
    setValue(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      if (next === lastSaved.current) return;
      setSaving(true);
      try {
        if (field === 'agenda') await updateAgenda({ id: view.prep._id, agenda: next });
        else await updateNotes({ id: view.prep._id, notes: next });
        lastSaved.current = next;
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  return (
    <section className={cn(!embedded && 'mb-8')}>
      {!embedded && label && (
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted/80">
            {label}
          </h2>
          {saving && <span className="text-[10px] text-text-muted/60">Saving…</span>}
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        rows={embedded ? 3 : 5}
        className="w-full bg-transparent border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent/60 resize-y leading-relaxed"
      />
    </section>
  );
}

function ContextRail({ view }: { view: PrepView }) {
  const hasAny =
    view.relatedMeetings.length > 0 ||
    view.relatedTasks.length > 0 ||
    (view.relatedGoals?.length ?? 0) > 0;
  if (!hasAny) {
    return (
      <section className="mt-10 mb-6 border border-dashed border-border rounded-xl px-5 py-6 text-center">
        <p className="text-sm text-text-muted">No related context yet</p>
        <p className="text-xs text-text-muted/70 mt-1">
          Click "Refresh context" to scan past meetings, open tasks, and goals.
        </p>
      </section>
    );
  }
  return (
    <section className="mt-10 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <Block title="Past meetings">
        <PastList view={view} />
      </Block>
      <Block title="Open tasks">
        <TaskList view={view} />
      </Block>
      {view.relatedGoals && view.relatedGoals.length > 0 && (
        <Block title="Active goals">
          <GoalList view={view} />
        </Block>
      )}
    </section>
  );
}

function PastList({ view, compact = false }: { view: PrepView; compact?: boolean }) {
  if (view.relatedMeetings.length === 0) {
    return <p className="text-xs text-text-muted/60 italic">No related meetings.</p>;
  }
  return (
    <ul className="space-y-2">
      {view.relatedMeetings.map((m) => (
        <li key={m._id}>
          <div className={cn('font-medium text-text truncate', compact ? 'text-xs' : 'text-sm')}>
            {m.title}
          </div>
          <div className="text-[10px] text-text-muted/70">
            {m.startedAt
              ? new Date(m.startedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : ''}
            {m.attendees && m.attendees.length > 0 && ` · ${m.attendees.slice(0, 3).join(', ')}`}
          </div>
          {!compact && m.summary && (
            <p className="text-xs text-text-muted/80 mt-1 line-clamp-2">{m.summary}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function TaskList({ view, compact = false }: { view: PrepView; compact?: boolean }) {
  if (view.relatedTasks.length === 0) {
    return <p className="text-xs text-text-muted/60 italic">No open tasks mention these people.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {view.relatedTasks.map((t) => (
        <li
          key={t._id}
          className={cn(
            'flex items-start gap-2 text-text',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          <span
            className={cn(
              'mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0',
              t.status === 'todo' ? 'bg-warning/70' : 'bg-text-muted/30',
            )}
          />
          <span className={cn(t.status !== 'todo' && 'line-through text-text-muted/60')}>
            {t.title}
          </span>
        </li>
      ))}
    </ul>
  );
}

function GoalList({ view, compact = false }: { view: PrepView; compact?: boolean }) {
  if (!view.relatedGoals || view.relatedGoals.length === 0) {
    return <p className="text-xs text-text-muted/60 italic">No active goals.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {view.relatedGoals.map((g) => (
        <li key={g._id} className={cn('text-text', compact ? 'text-xs' : 'text-sm')}>
          {g.title}
          {g.targetDate && (
            <span className="text-[10px] text-text-muted/60 ml-2">→ {g.targetDate}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl px-4 py-3 bg-bg-subtle/20">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl px-4 py-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function SidebarBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl px-4 py-3 bg-bg-subtle/20">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function SkeletonDoc() {
  return (
    <div className="max-w-3xl mx-auto px-1 animate-pulse">
      <div className="h-8 w-2/3 bg-bg-subtle rounded mb-3" />
      <div className="h-3 w-1/2 bg-bg-subtle rounded mb-8" />
      <div className="h-32 bg-bg-subtle rounded-xl mb-6" />
      <div className="h-24 bg-bg-subtle rounded-xl mb-6" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-1 text-center py-20">
      <p className="text-sm text-text-muted">Prep not found.</p>
      <Link
        href="/meetings?tab=upcoming"
        className="mt-3 inline-block text-[11px] uppercase tracking-wide text-accent hover:text-accent-hover transition-colors"
      >
        ← Back to upcoming meetings
      </Link>
    </div>
  );
}

function formatWhen(startMs: number, endMs: number): string {
  const start = new Date(startMs);
  const end = new Date(endMs);
  const sameDay = start.toDateString() === end.toDateString();
  const date = start.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const t1 = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const t2 = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `${date}, ${t1} – ${t2}` : `${date}, ${t1} – ${end.toLocaleString()}`;
}
