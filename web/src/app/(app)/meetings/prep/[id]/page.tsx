'use client';

import { use } from 'react';
import Link from 'next/link';
import { MeetingPrepDoc } from '@/components/meeting-prep-doc';
import { AdminGate } from '@/components/admin-gate';
import type { Id } from '@/lib/convex-api';

export default function MeetingPrepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AdminGate>
      <div className="animate-fade-in py-2">
        <div className="mb-4">
          <Link
            href="/meetings?tab=upcoming"
            className="text-[11px] uppercase tracking-wide text-text-muted hover:text-text transition-colors"
          >
            ← Upcoming meetings
          </Link>
        </div>
        <MeetingPrepDoc id={id as Id<'meetingPreps'>} />
      </div>
    </AdminGate>
  );
}
