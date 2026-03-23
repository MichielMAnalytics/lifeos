import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'muted';

const variants: Record<Variant, string> = {
  default: 'text-accent border-border',
  success: 'text-success border-border',
  warning: 'text-warning border-border',
  danger: 'text-danger border-border',
  muted: 'text-text-muted border-border',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors',
        variants[variant],
        className,
      )}
    >
      [ {children} ]
    </span>
  );
}
