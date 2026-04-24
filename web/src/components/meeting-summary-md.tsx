'use client';

// Minimal markdown renderer for Granola meeting summaries. Hand-rolled (no
// library dep) because the subset of markdown Granola actually emits is
// small: H1/H2/H3 headings, bullet lists (- or *), **bold**, *italic*,
// [links](url), and paragraph text with blank-line separators. Plain-text
// summaries (summary_text) fall through as pre-wrapped paragraphs.
//
// Accepts a `variant` prop so the inspiration page can audition styles
// without duplicating the parser.

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export type SummaryVariant = 'prose' | 'sections' | 'outline' | 'compact';

interface Props {
  markdown?: string;         // prefer `summary_markdown` when available
  plain?: string;            // fallback to `summary_text`
  variant?: SummaryVariant;
}

// ── Block parsing ────────────────────────────────────
// We walk the text line-by-line and collect blocks of one of four kinds:
// heading (with level), bullet list (with items), paragraph (with rich
// inline runs), blank (separator). The renderer then lays each block out
// according to the active variant.

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'paragraph'; text: string }
  | { kind: 'blank' };

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      blocks.push({ kind: 'blank' });
      i++;
      continue;
    }
    // Heading
    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({ kind: 'heading', level, text: headingMatch[2].trim() });
      i++;
      continue;
    }
    // Bullet list — collect consecutive bullet lines
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'bullets', items });
      continue;
    }
    // Paragraph — collect consecutive non-blank non-bullet non-heading lines
    const paragraphLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i];
      const nextTrim = next.trim();
      if (!nextTrim) break;
      if (/^(#{1,3})\s+/.test(nextTrim)) break;
      if (/^[-*•]\s+/.test(nextTrim)) break;
      paragraphLines.push(next);
      i++;
    }
    blocks.push({ kind: 'paragraph', text: paragraphLines.join(' ') });
  }
  return blocks;
}

// ── Inline formatting ───────────────────────────────
// Bold, italic, inline code, links. Runs within a single line only.

function renderInline(text: string): React.ReactNode {
  // Tokenise greedily. Order matters: `**bold**` before `*italic*` so we
  // don't eat the ** inside bold as two italics.
  const parts: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    // [link](url)
    const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    if (linkMatch) {
      parts.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          {linkMatch[1]}
        </a>,
      );
      rest = rest.slice(linkMatch[0].length);
      continue;
    }
    // **bold**
    const boldMatch = /^\*\*([^*]+?)\*\*/.exec(rest);
    if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      rest = rest.slice(boldMatch[0].length);
      continue;
    }
    // *italic* or _italic_
    const italMatch = /^[*_]([^*_]+?)[*_]/.exec(rest);
    if (italMatch) {
      parts.push(<em key={key++}>{italMatch[1]}</em>);
      rest = rest.slice(italMatch[0].length);
      continue;
    }
    // `code`
    const codeMatch = /^`([^`]+?)`/.exec(rest);
    if (codeMatch) {
      parts.push(
        <code key={key++} className="bg-bg-subtle border border-border rounded px-1 py-0.5 text-[0.9em]">
          {codeMatch[1]}
        </code>,
      );
      rest = rest.slice(codeMatch[0].length);
      continue;
    }
    // Plain char(s) until next formatting marker
    const nextSpecial = rest.search(/[*_`[]/);
    if (nextSpecial === -1) {
      parts.push(rest);
      break;
    }
    if (nextSpecial === 0) {
      // No formatting matched but a special char is here — take one char as literal and move on.
      parts.push(rest.charAt(0));
      rest = rest.slice(1);
      continue;
    }
    parts.push(rest.slice(0, nextSpecial));
    rest = rest.slice(nextSpecial);
  }
  return parts;
}

// ── Plain-text block inference ───────────────────────
// When only `summary_text` is available (no markdown), Granola often emits
// heading-looking lines as the first line of each section followed by
// bullet-style prose without `-` markers. We do a lightweight pattern
// match to give it structure: lines that look like titles (short, no
// sentence ending, capitalised) become headings.

function inferStructure(text: string): string {
  const out: string[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) out.push('');
      inList = false;
      out.push('');
      continue;
    }
    const looksLikeHeading =
      line.length < 70 &&
      !/[.!?:]$/.test(line) &&
      /^[A-Z]/.test(line) &&
      !/^[-*•]\s/.test(line);
    if (looksLikeHeading) {
      if (inList) out.push('');
      out.push(`## ${line}`);
      inList = false;
      continue;
    }
    // Lines already starting with a bullet marker stay as-is.
    if (/^[-*•]\s/.test(line)) {
      out.push(line);
      inList = true;
      continue;
    }
    // Long prose lines in a sequence — convert to bullets for readability.
    out.push(`- ${line}`);
    inList = true;
  }
  return out.join('\n');
}

// ── Variant renderers ───────────────────────────────

export function MeetingSummary({ markdown, plain, variant = 'prose' }: Props) {
  const blocks = useMemo(() => {
    if (markdown && markdown.trim()) return parseBlocks(markdown);
    if (plain && plain.trim()) return parseBlocks(inferStructure(plain));
    return [];
  }, [markdown, plain]);

  if (blocks.length === 0) return null;

  switch (variant) {
    case 'sections':
      return <SectionsLayout blocks={blocks} />;
    case 'outline':
      return <OutlineLayout blocks={blocks} />;
    case 'compact':
      return <CompactLayout blocks={blocks} />;
    case 'prose':
    default:
      return <ProseLayout blocks={blocks} />;
  }
}

// ── Layout A: Prose (default) ────────────────────────
// Bigger headings, comfortable paragraph spacing, bullets with real
// indentation. The "notion editorial" look — most universally readable.
function ProseLayout({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-text">
      {blocks.map((b, i) => renderBlock(b, i, 'prose'))}
    </div>
  );
}

// ── Layout B: Sections ───────────────────────────────
// Headings get a colored left-border + slight uppercase treatment, like a
// documentation sidebar. Each section feels like a distinct chunk.
function SectionsLayout({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-text">
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          return (
            <h3
              key={i}
              className={cn(
                'font-semibold text-text pl-3 border-l-2 border-accent/60',
                b.level === 1 && 'text-base',
                b.level === 2 && 'text-sm',
                b.level === 3 && 'text-xs uppercase tracking-wider text-text-muted/90',
              )}
            >
              {renderInline(b.text)}
            </h3>
          );
        }
        return renderBlock(b, i, 'sections');
      })}
    </div>
  );
}

// ── Layout C: Outline ────────────────────────────────
// Every block is a bullet, every heading is a bold bullet at the parent
// level. Feels like a collapsible note view. Great for scanning action
// items + decisions quickly.
function OutlineLayout({ blocks }: { blocks: Block[] }) {
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed text-text">
      {blocks.filter((b) => b.kind !== 'blank').map((b, i) => {
        if (b.kind === 'heading') {
          return (
            <li key={i} className="flex gap-2 font-semibold text-text mt-3 first:mt-0">
              <span className="text-accent shrink-0">◆</span>
              <span>{renderInline(b.text)}</span>
            </li>
          );
        }
        if (b.kind === 'bullets') {
          return (
            <ul key={i} className="ml-5 space-y-1 border-l border-border/40 pl-3">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2 text-text-muted">
                  <span className="text-text-muted/50 shrink-0">·</span>
                  <span>{renderInline(it)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.kind === 'paragraph') {
          return (
            <li key={i} className="flex gap-2 text-text-muted/90 ml-5">
              <span className="text-text-muted/50 shrink-0">·</span>
              <span>{renderInline(b.text)}</span>
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
}

// ── Layout D: Compact ────────────────────────────────
// Dense, smaller font, tighter spacing. Good when the peek panel is small
// or the summary is very long.
function CompactLayout({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-2 text-xs leading-relaxed text-text-muted">
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          return (
            <div key={i} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 mt-2 first:mt-0">
              {renderInline(b.text)}
            </div>
          );
        }
        if (b.kind === 'bullets') {
          return (
            <ul key={i} className="space-y-0.5">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-1.5">
                  <span className="text-text-muted/50">—</span>
                  <span>{renderInline(it)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.kind === 'paragraph') {
          return <p key={i}>{renderInline(b.text)}</p>;
        }
        return null;
      })}
    </div>
  );
}

// ── Shared block renderer (prose + sections fallback) ─

function renderBlock(b: Block, key: number, variant: SummaryVariant): React.ReactNode {
  if (b.kind === 'blank') return null;
  if (b.kind === 'heading') {
    return (
      <h3
        key={key}
        className={cn(
          'font-semibold text-text',
          b.level === 1 && 'text-lg',
          b.level === 2 && 'text-base',
          b.level === 3 && 'text-sm uppercase tracking-wider text-text-muted',
        )}
      >
        {renderInline(b.text)}
      </h3>
    );
  }
  if (b.kind === 'bullets') {
    return (
      <ul key={key} className={cn('space-y-1.5 ml-4', variant === 'compact' ? 'text-xs' : 'text-sm')}>
        {b.items.map((it, j) => (
          <li key={j} className="flex gap-2">
            <span className="text-text-muted/60 shrink-0">•</span>
            <span>{renderInline(it)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (b.kind === 'paragraph') {
    return (
      <p key={key} className="text-text leading-relaxed">
        {renderInline(b.text)}
      </p>
    );
  }
  return null;
}
