'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Breadcrumb } from '@/components/breadcrumb';
import { useParams } from 'next/navigation';
import type { Id } from '@/lib/convex-api';

export default function ThoughtDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"thoughts">;

  const thought = useQuery(api.thoughts.get, { id });

  if (thought === undefined) {
    return (
      <div className="mx-auto max-w-2xl py-8 px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-surface rounded" />
          <div className="h-8 w-2/3 bg-surface rounded" />
        </div>
      </div>
    );
  }

  if (thought === null) {
    return (
      <div className="mx-auto max-w-2xl py-8 px-6">
        <Breadcrumb items={[
          { label: 'LifeOS', href: '/today' },
          { label: 'Thoughts', href: '/thoughts' },
          { label: 'Not found' },
        ]} />
        <p className="text-text-muted">Thought not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8 px-6">
      <Breadcrumb items={[
        { label: 'LifeOS', href: '/today' },
        { label: 'Thoughts', href: '/thoughts' },
        { label: thought.title || thought.content.slice(0, 40) },
      ]} />

      {thought.title && (
        <h1 className="text-2xl font-bold text-text mb-4">
          {thought.title}
        </h1>
      )}

      <p className="text-sm text-text leading-relaxed whitespace-pre-line">
        {thought.content}
      </p>

      <div className="mt-6 text-xs text-text-muted/50">
        {new Date(thought._creationTime).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </div>
    </div>
  );
}
