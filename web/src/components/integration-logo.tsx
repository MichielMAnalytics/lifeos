'use client';

import {
  Calendar,
  CreditCard,
  FileText,
  Github,
  Hash,
  MessageSquare,
  Send,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Curated registry of integrations lifeai talks to or might talk to.
// PNG-style logos in /public are the existing canonical assets where they
// exist; everything else is mapped to a Lucide icon as a brand-neutral
// stand-in so we get a consistent visual without shipping copyrighted SVGs.

type LogoKind =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'icon'; icon: LucideIcon; tint?: string };

const REGISTRY: Record<string, LogoKind> = {
  google: { kind: 'image', src: '/google-icon.png', alt: 'Google' },
  'google-calendar': { kind: 'icon', icon: Calendar, tint: 'text-[#4285F4]' },
  gmail: { kind: 'icon', icon: Send, tint: 'text-[#EA4335]' },
  gemini: { kind: 'image', src: '/gemini-icon.png', alt: 'Gemini' },
  telegram: { kind: 'image', src: '/telegram-icon.png', alt: 'Telegram' },
  whatsapp: { kind: 'image', src: '/whatsapp-icon.png', alt: 'WhatsApp' },
  discord: { kind: 'image', src: '/discord-icon.png', alt: 'Discord' },
  openai: { kind: 'image', src: '/openai-icon.png', alt: 'OpenAI' },
  claude: { kind: 'image', src: '/claude-icon.png', alt: 'Claude' },
  openclaw: { kind: 'image', src: '/openclaw-icon.png', alt: 'OpenClaw' },
  qwen: { kind: 'image', src: '/qwen-icon.png', alt: 'Qwen' },
  kimi: { kind: 'image', src: '/kimi-icon.svg', alt: 'Kimi' },
  minimax: { kind: 'image', src: '/minimax-icon.png', alt: 'Minimax' },
  notion: { kind: 'icon', icon: FileText, tint: 'text-text' },
  stripe: { kind: 'icon', icon: CreditCard, tint: 'text-[#635BFF]' },
  slack: { kind: 'icon', icon: Hash, tint: 'text-[#611f69]' },
  github: { kind: 'icon', icon: Github, tint: 'text-text' },
  granola: { kind: 'icon', icon: MessageSquare, tint: 'text-text-muted' },
};

export type IntegrationSlug = keyof typeof REGISTRY;

export function IntegrationLogo({
  slug,
  size = 20,
  className,
  rounded = true,
}: {
  slug: string;
  size?: number;
  className?: string;
  rounded?: boolean;
}) {
  const entry = REGISTRY[slug];

  if (!entry) {
    return (
      <span
        aria-hidden
        className={cn(
          'inline-flex items-center justify-center bg-surface text-text-muted text-[10px] font-mono',
          rounded && 'rounded-sm',
          className,
        )}
        style={{ width: size, height: size }}
      >
        <Globe size={Math.round(size * 0.6)} />
      </span>
    );
  }

  if (entry.kind === 'image') {
    return (
      <img
        src={entry.src}
        alt={entry.alt}
        width={size}
        height={size}
        className={cn('shrink-0 object-contain', rounded && 'rounded-sm', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const Icon = entry.icon;
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        entry.tint,
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.85)} />
    </span>
  );
}

export function listIntegrationSlugs(): string[] {
  return Object.keys(REGISTRY);
}
