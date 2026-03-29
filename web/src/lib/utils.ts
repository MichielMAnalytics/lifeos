import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function formatRelativeDate(dateStr: string | undefined | null): { text: string; colorClass: string } {
  if (!dateStr) return { text: 'No date', colorClass: 'text-text-muted' };

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (dateStr === today) return { text: 'Today', colorClass: 'text-accent' };
  if (dateStr === tomorrow) return { text: 'Tomorrow', colorClass: 'text-text' };
  if (dateStr === yesterday) return { text: 'Yesterday', colorClass: 'text-danger' };
  if (dateStr < today) {
    const daysAgo = Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000);
    if (daysAgo <= 7) return { text: `${daysAgo}d overdue`, colorClass: 'text-danger' };
    return { text: 'Overdue', colorClass: 'text-danger' };
  }

  // Future dates
  const daysAhead = Math.floor((new Date(dateStr + 'T00:00:00').getTime() - Date.now()) / 86400000);
  if (daysAhead <= 6) {
    const d = new Date(dateStr + 'T00:00:00');
    return { text: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), colorClass: 'text-text' };
  }

  const d = new Date(dateStr + 'T00:00:00');
  return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), colorClass: 'text-text-muted' };
}
