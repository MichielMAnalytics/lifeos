'use client';

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyCode({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <code
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="bg-surface px-1.5 py-0.5 inline-flex items-center gap-1 cursor-pointer hover:bg-surface-hover transition-colors rounded"
    >
      {text}
      {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
    </code>
  );
}
