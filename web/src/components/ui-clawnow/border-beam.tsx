'use client';

import { cn } from "@/lib/utils";
import { motion, type Transition } from "motion/react";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  anchor?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "oklch(0.7 0.15 250)",
  colorTo = "oklch(0.7 0.15 310)",
  delay = 0,
}: BorderBeamProps) {
  const transition: Transition = {
    repeat: Infinity,
    duration,
    delay,
    ease: "linear",
  };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [border-radius:inherit]">
      <motion.div
        className={cn(
          "absolute inset-[0] rounded-[inherit]",
          className,
        )}
        style={{
          background: `conic-gradient(from calc(var(--angle) - 80deg) at 50% 50%, transparent 0%, ${colorFrom} 20%, ${colorTo} 40%, transparent 50%)`,
          borderWidth,
          borderStyle: "solid",
          borderColor: "transparent",
          backgroundClip: "border-box",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
        initial={{ "--angle": `${anchor}deg` } as Record<string, string>}
        animate={{ "--angle": `${anchor + 360}deg` } as Record<string, string>}
        transition={transition}
      />
      <motion.div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: `conic-gradient(from calc(var(--angle) - 80deg) at 50% 50%, transparent 0%, ${colorFrom} 20%, ${colorTo} 40%, transparent 50%)`,
          filter: `blur(${size / 4}px)`,
          opacity: 0.3,
        }}
        initial={{ "--angle": `${anchor}deg` } as Record<string, string>}
        animate={{ "--angle": `${anchor + 360}deg` } as Record<string, string>}
        transition={transition}
      />
    </div>
  );
}
