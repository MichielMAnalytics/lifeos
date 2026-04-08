'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { SearchModal } from './search-modal';
import { ConfigureToolbar } from './configure-toolbar';

const STORAGE_KEY = 'lifeos-nav-expanded';

export function MainContent({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const { config, isConfigMode } = useDashboardConfig();
  const isHeader = config.navMode === 'header';
  const pathname = usePathname();
  const isFullHeight = pathname === '/life-coach';

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setExpanded(true);

    const onStorage = () => {
      setExpanded(localStorage.getItem(STORAGE_KEY) === 'true');
    };
    window.addEventListener('storage', onStorage);

    const interval = setInterval(() => {
      const current = localStorage.getItem(STORAGE_KEY) === 'true';
      setExpanded((prev) => (prev !== current ? current : prev));
    }, 100);

    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <main
      className={cn(
        'w-full bg-bg transition-all duration-200',
        isFullHeight ? 'h-screen' : 'min-h-screen overflow-y-auto',
        isHeader
          ? (isConfigMode ? 'mt-[5.75rem]' : 'mt-14')
          : (expanded ? 'ml-0 md:ml-60' : 'ml-0 md:ml-14'),
      )}
    >
      <ConfigureToolbar />
      <SearchModal />
      {isFullHeight ? (
        <div className="h-full">{children}</div>
      ) : (
        <div
          className="px-4 py-4 md:px-8 md:py-8"
          style={{
            // Section 16 D2 — density tokens scale page padding at lg+
            paddingLeft: 'var(--density-page-padding-x, 48px)',
            paddingRight: 'var(--density-page-padding-x, 48px)',
            paddingTop: 'var(--density-page-padding-y, 40px)',
            paddingBottom: 'var(--density-page-padding-y, 40px)',
          }}
        >
          {children}
        </div>
      )}
    </main>
  );
}
