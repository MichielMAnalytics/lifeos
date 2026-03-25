import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { BorderBeam } from "./border-beam";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 cursor-pointer relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-accent text-bg hover:bg-accent-hover",
        outline:
          "ring-1 ring-border bg-bg hover:bg-surface-hover text-text",
        ghost: "hover:bg-surface-hover text-text",
        destructive:
          "bg-danger/10 text-danger hover:bg-danger/20",
      },
      size: {
        xs: "h-6 px-2 text-[10px]",
        sm: "h-7 px-3",
        default: "h-8 px-4",
        lg: "h-9 px-5",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {children}
      {loading && <BorderBeam size={100} duration={8} borderWidth={1.5} />}
    </button>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
