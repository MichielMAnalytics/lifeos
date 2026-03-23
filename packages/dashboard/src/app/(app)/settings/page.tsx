import { api } from '@/lib/api';
import { SettingsClient } from './settings-client';

interface User {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  created_at: string;
}

interface ApiKeyEntry {
  id: string;
  name: string | null;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export default async function SettingsPage() {
  let user: User | null = null;
  let apiKeys: ApiKeyEntry[] = [];

  try {
    const userData = await api.get<{ data: User }>('/api/v1/auth/me');
    user = userData.data;
  } catch {}

  try {
    const keysData = await api.get<{ data: ApiKeyEntry[] }>('/api/v1/auth/api-keys');
    apiKeys = keysData.data ?? [];
  } catch {}

  return <SettingsClient user={user} initialApiKeys={apiKeys} />;
}
