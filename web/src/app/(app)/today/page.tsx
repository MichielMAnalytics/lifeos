'use client';

import { PageShell } from '@/components/page-shell';
import { TodayDateProvider } from '@/lib/today-date-context';

export default function TodayPage() {
  return (
    <TodayDateProvider>
      <PageShell page="today" title="Today" />
    </TodayDateProvider>
  );
}
