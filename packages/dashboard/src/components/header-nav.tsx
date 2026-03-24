'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDashboardConfig } from '@/lib/dashboard-config';

const allPages: Record<string, { label: string }> = {
  today: { label: 'Today' },
  tasks: { label: 'Tasks' },
  projects: { label: 'Projects' },
  goals: { label: 'Goals' },
  journal: { label: 'Journal' },
  ideas: { label: 'Ideas' },
  plan: { label: 'Plan' },
  reviews: { label: 'Reviews' },
};

export function HeaderNav() {
  const pathname = usePathname();
  const { config, isConfigMode, toggleConfigMode } = useDashboardConfig();
  const visiblePages = config.navOrder.filter(p => !config.navHidden.includes(p));

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 border-b border-border bg-bg flex items-center px-6 gap-1">
      {/* Logo */}
      <Link href="/today" className="text-sm font-bold tracking-widest text-text mr-6 uppercase">
        LifeOS
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        {visiblePages.map(key => {
          const page = allPages[key];
          if (!page) return null;
          const href = `/${key}`;
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                'px-3 py-1.5 text-sm transition-colors rounded',
                isActive
                  ? 'text-text bg-surface'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {page.label}
            </Link>
          );
        })}
      </nav>

      {/* Right side: configure + settings */}
      <button
        onClick={toggleConfigMode}
        className={cn(
          'px-3 py-1.5 text-xs uppercase tracking-wider transition-colors rounded',
          isConfigMode ? 'text-text bg-border/50' : 'text-text-muted hover:text-text',
        )}
      >
        {isConfigMode ? 'Done' : 'Configure'}
      </button>
      <Link
        href="/settings"
        className="px-3 py-1.5 text-sm text-text-muted hover:text-text transition-colors"
      >
        Settings
      </Link>
    </header>
  );
}
