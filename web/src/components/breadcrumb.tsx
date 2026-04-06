'use client';

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <span className="text-text-muted">/</span>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-text-muted hover:text-text transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-text truncate max-w-[300px]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
