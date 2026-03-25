import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded h-5 px-2 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-surface text-text-muted",
        success:
          "bg-success/10 text-success ring-1 ring-success/20",
        warning:
          "bg-warning/10 text-warning ring-1 ring-warning/20",
        destructive:
          "bg-danger/10 text-danger ring-1 ring-danger/20",
        secondary:
          "bg-surface text-text-muted ring-1 ring-text/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
