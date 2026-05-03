'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/loading-screen';

// /settings is now a dispatcher — each tab has its own URL
// (/settings/account, /settings/billing, …). Keep this redirect so old
// bookmarks and deep-links still land somewhere sensible.
export default function SettingsIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings/account');
  }, [router]);
  return <LoadingScreen />;
}
