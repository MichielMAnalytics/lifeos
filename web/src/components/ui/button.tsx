import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-accent hover:bg-accent-hover text-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:shadow-[0_2px_8px_var(--color-accent-glow)]',
  secondary: 'bg-transparent hover:bg-surface-hover border border-border text-text hover:border-text-muted/30',
  ghost: 'hover:bg-surface-hover text-text-muted hover:text-text',
  danger: 'bg-transparent hover:bg-danger/10 text-danger border border-danger/20',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[12px] rounded-md gap-1.5',
  md: 'h-8 px-3 text-[13px] rounded-lg gap-2',
  lg: 'h-9 px-4 text-sm rounded-lg gap-2',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
