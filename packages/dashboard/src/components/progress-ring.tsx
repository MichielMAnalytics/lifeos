'use client';

import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  done?: boolean;
  className?: string;
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 4,
  label,
  sublabel,
  done,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-border, hsl(var(--border)))"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={done ? 'var(--color-success, hsl(var(--success)))' : 'var(--color-accent, hsl(var(--accent)))'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          {done ? (
            <svg
              width={size * 0.35}
              height={size * 0.35}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-success, hsl(var(--success)))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <span className="text-lg font-semibold text-text">{progress}%</span>
          )}
        </div>
      </div>
      {(label || sublabel) && (
        <div className="text-center">
          {label && <div className="text-xs font-semibold text-text">{label}</div>}
          {sublabel && (
            <div className="text-xs text-text-muted truncate max-w-[100px]">{sublabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
