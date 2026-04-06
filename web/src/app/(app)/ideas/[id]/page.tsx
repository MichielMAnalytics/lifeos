'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Breadcrumb } from '@/components/breadcrumb';
import { useParams } from 'next/navigation';
import type { Id } from '@/lib/convex-api';

const ACTIONABILITY_OPTIONS = [
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

export default function IdeaDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"ideas">;

  const idea = useQuery(api.ideas.get, { id });
  const updateIdea = useMutation(api.ideas.update);

  const [contentValue, setContentValue] = useState('');
  const [nextStepValue, setNextStepValue] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (idea && !initializedRef.current) {
      setContentValue(idea.content ?? '');
      setNextStepValue(idea.nextStep ?? '');
      initializedRef.current = true;
    }
  }, [idea]);

  const autoResize = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.height = 'auto';
      contentRef.current.style.height = `${contentRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => { autoResize(); }, [contentValue, autoResize]);

  const saveContent = useCallback(async () => {
    if (idea && contentValue !== idea.content) {
      await updateIdea({ id, content: contentValue });
    }
  }, [contentValue, idea, id, updateIdea]);

  const saveNextStep = useCallback(async () => {
    if (idea && nextStepValue !== (idea.nextStep ?? '')) {
      await updateIdea({ id, nextStep: nextStepValue });
    }
  }, [nextStepValue, idea, id, updateIdea]);

  if (idea === undefined) {
    return (
      <div className="mx-auto max-w-2xl py-8 px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-surface rounded" />
          <div className="h-8 w-2/3 bg-surface rounded" />
        </div>
      </div>
    );
  }

  if (idea === null) {
    return (
      <div className="mx-auto max-w-2xl py-8 px-6">
        <Breadcrumb items={[
          { label: 'LifeOS', href: '/today' },
          { label: 'Ideas', href: '/ideas' },
          { label: 'Not found' },
        ]} />
        <p className="text-text-muted">Idea not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8 px-6">
      <Breadcrumb items={[
        { label: 'LifeOS', href: '/today' },
        { label: 'Ideas', href: '/ideas' },
        { label: contentValue.slice(0, 40) || 'Idea' },
      ]} />

      {/* Properties */}
      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-3 py-1.5">
          <span className="text-sm text-text-muted w-28 shrink-0">Actionability</span>
          <div className="flex gap-2">
            {ACTIONABILITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => updateIdea({ id, actionability: opt.id })}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                  idea.actionability === opt.id
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-border text-text-muted hover:border-text/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 my-6" />

      {/* Content */}
      <textarea
        ref={contentRef}
        value={contentValue}
        onChange={(e) => { setContentValue(e.target.value); autoResize(); }}
        onBlur={saveContent}
        placeholder="Describe your idea..."
        rows={5}
        className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/70 focus:outline-none resize-none leading-relaxed mb-6"
      />

      {/* Next Step */}
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted mb-2 block">
          Next Step
        </span>
        <input
          type="text"
          value={nextStepValue}
          onChange={(e) => setNextStepValue(e.target.value)}
          onBlur={saveNextStep}
          placeholder="What's the next action?"
          className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/70 focus:outline-none"
        />
      </div>
    </div>
  );
}
