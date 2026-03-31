import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('min-h-[200px] flex flex-col items-center justify-center gap-3 py-12 px-6', className)}>
      {icon && <div className="text-text-muted/40">{icon}</div>}
      <p className="text-sm font-medium text-text-muted">{title}</p>
      {description && <p className="text-xs text-text-muted/60 max-w-xs text-center">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
