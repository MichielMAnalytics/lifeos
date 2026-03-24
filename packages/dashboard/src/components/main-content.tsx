'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { GlobalQuickAdd } from './global-quick-add';

const STORAGE_KEY = 'lifeos-nav-expanded';

export function MainContent({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const { config, isConfigMode } = useDashboardConfig();
  const isHeader = config.navMode === 'header';

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setExpanded(true);

    // Listen for storage changes from the nav toggle
    const onStorage = () => {
      setExpanded(localStorage.getItem(STORAGE_KEY) === 'true');
    };
    window.addEventListener('storage', onStorage);

    // Also poll for same-tab changes (storage event only fires cross-tab)
    const interval = setInterval(() => {
      const current = localStorage.getItem(STORAGE_KEY) === 'true';
      setExpanded((prev) => (prev !== current ? current : prev));
    }, 100);

    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, []);

  // In header mode, the header is h-14 (56px). When config mode is active,
  // there's an extra config bar (~36px) making total ~90px. We use mt values
  // to push content below the fixed header.
  // In sidebar mode, we use ml values based on expanded/collapsed state.

  return (
    <main
      className={cn(
        'w-full min-h-screen bg-bg overflow-y-auto transition-all duration-200',
        isHeader
          ? (isConfigMode ? 'mt-[5.75rem]' : 'mt-14')
          : (expanded ? 'ml-52' : 'ml-14'),
      )}
    >
      <GlobalQuickAdd />
      <div className="px-8 py-8 lg:px-12 lg:py-10">{children}</div>
    </main>
  );
}
