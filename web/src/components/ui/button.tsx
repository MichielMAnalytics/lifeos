import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary:
    'bg-text hover:bg-accent-hover text-bg',
  secondary:
    'bg-transparent hover:bg-surface-hover border border-border text-text hover:border-text-muted/30',
  ghost: 'hover:bg-surface-hover text-text-muted hover:text-text',
  danger:
    'bg-transparent hover:bg-danger/10 text-danger border border-danger/20',
};

export function Button({
  children,
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-wider',
        'transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
