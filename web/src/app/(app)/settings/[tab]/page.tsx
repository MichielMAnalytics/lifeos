'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { SettingsClient } from '../settings-client';

function SettingsTabInner() {
  const params = useParams<{ tab: string }>();
  const user = useQuery(api.authHelpers.getMe, {});
  const apiKeys = useQuery(api.authHelpers.listApiKeys, {});

  const resolvedUser = user === undefined ? null : user;
  const resolvedApiKeys = apiKeys === undefined ? [] : apiKeys ?? [];

  return (
    <SettingsClient
      user={resolvedUser}
      initialApiKeys={resolvedApiKeys}
      tab={params?.tab}
    />
  );
}

export default function SettingsTabPage() {
  return (
    <Suspense>
      <SettingsTabInner />
    </Suspense>
  );
}
