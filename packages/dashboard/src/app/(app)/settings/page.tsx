'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { SettingsClient } from './settings-client';

export default function SettingsPage() {
  const user = useQuery(api.authHelpers.getMe, {});
  const apiKeys = useQuery(api.authHelpers.listApiKeys, {});

  // While loading, pass null/empty so SettingsClient can handle gracefully
  const resolvedUser = user === undefined ? null : user;
  const resolvedApiKeys = apiKeys === undefined ? [] : apiKeys ?? [];

  return <SettingsClient user={resolvedUser} initialApiKeys={resolvedApiKeys} />;
}
