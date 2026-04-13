'use client';

import { Suspense } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { SettingsClient } from './settings-client';

function SettingsInner() {
  const user = useQuery(api.authHelpers.getMe, {});
  const apiKeys = useQuery(api.authHelpers.listApiKeys, {});

  const resolvedUser = user === undefined ? null : user;
  const resolvedApiKeys = apiKeys === undefined ? [] : apiKeys ?? [];

  return <SettingsClient user={resolvedUser} initialApiKeys={resolvedApiKeys} />;
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}
