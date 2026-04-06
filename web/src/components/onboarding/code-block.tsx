'use client';

import { useState } from 'react';

export function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="rounded-xl border border-border/40 bg-surface/40 px-5 py-4 text-[13px] font-mono text-text/80 overflow-x-auto leading-relaxed">
        {children}
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-text-muted/80 hover:text-text-muted bg-surface/80 border border-border/40 rounded-md px-2 py-1"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
