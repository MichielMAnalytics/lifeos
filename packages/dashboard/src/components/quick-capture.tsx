'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type CaptureType = 'task' | 'idea' | 'thought' | 'win';

const captureTypes: {
  type: CaptureType;
  label: string;
  endpoint: string;
  field: string;
}[] = [
  { type: 'task', label: 'Task', endpoint: '/api/v1/tasks', field: 'title' },
  { type: 'idea', label: 'Idea', endpoint: '/api/v1/ideas', field: 'content' },
  { type: 'thought', label: 'Thought', endpoint: '/api/v1/thoughts', field: 'content' },
  { type: 'win', label: 'Win', endpoint: '/api/v1/wins', field: 'content' },
];

export function QuickCapture() {
  const [value, setValue] = useState('');
  const [type, setType] = useState<CaptureType>('task');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

  const submit = async () => {
    if (!value.trim() || saving) return;
    setSaving(true);
    const ct = captureTypes.find((c) => c.type === type)!;
    try {
      await fetch(`${apiUrl}${ct.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('lifeos_api_key') || ''}`,
        },
        body: JSON.stringify({ [ct.field]: value.trim() }),
      });
      setValue('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border flex items-center">
      {/* Type selector pills */}
      <div className="flex shrink-0 border-r border-border">
        {captureTypes.map(({ type: t, label }) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              'px-4 py-3 text-xs font-medium uppercase tracking-wide transition-colors',
              type === t
                ? 'text-text border-b-2 border-text'
                : 'text-text-muted hover:text-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {/* Input */}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={`Quick capture ${type}...`}
        className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted/50 outline-none px-4 py-3"
      />
      {/* Submit */}
      <button
        onClick={submit}
        disabled={!value.trim() || saving}
        className="shrink-0 bg-white text-black px-5 py-3 text-xs font-medium uppercase tracking-wide transition-colors hover:bg-white/90 disabled:opacity-20 disabled:pointer-events-none"
      >
        Add
      </button>
    </div>
  );
}
