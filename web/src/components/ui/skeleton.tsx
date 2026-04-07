'use client';

import { cn } from '@/lib/utils';

/**
 * Phase 2 / Section 18J — skeleton loader primitives.
 *
 * The goal is "shape-matching" loaders: while data is loading, render a
 * silhouette that matches the size and structure of the real content. No
 * spinners. The shimmer animation comes from Tailwind's animate-pulse.
 *
 * Use the small primitives to build per-section skeletons that match the
 * actual layout (e.g. `<SkeletonRow />` mirrors a task row, `<SkeletonCard />`
 * mirrors a generic card).
 */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional explicit width override (CSS length) */
  width?: string | number;
  /** Optional explicit height override (CSS length) */
  height?: string | number;
}

/**
 * Base skeleton block — a single rectangle with the surface color and pulse.
 * All other skeleton primitives compose this.
 */
export function Skeleton({ className, width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-surface',
        className,
      )}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Skeleton text line — height defaults to 1em (matches a body line).
 * Pass `w` for the width (e.g. "w-3/4" or "w-32").
 */
export function SkeletonText({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn('h-3 w-full max-w-[20ch] rounded', className)} {...props} />;
}

/** Skeleton circle for avatars/checkboxes/dots. */
export function SkeletonCircle({ className, size = 16, ...props }: SkeletonProps & { size?: number }) {
  return (
    <Skeleton
      className={cn('rounded-full', className)}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}

/** A row that matches a task list row: circle + title + meta. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2.5', className)}>
      <SkeletonCircle size={16} />
      <Skeleton className="h-3 flex-1 max-w-[24ch]" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

/** A list of N task-shaped rows. */
export function SkeletonList({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

/** A card with header and a few body lines. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Page-level skeleton with a header bar and a list. */
export function SkeletonPage({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <div className="rounded-xl border border-border bg-surface">
        <div className="px-6 py-4 border-b border-border">
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="px-3 py-3">
          <SkeletonList count={rows} />
        </div>
      </div>
    </div>
  );
}
