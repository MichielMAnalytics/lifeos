'use client';

export function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/40 text-xs font-medium text-text-muted/60">
      {n}
    </span>
  );
}
