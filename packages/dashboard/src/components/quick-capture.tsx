'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

type CaptureType = 'task' | 'idea' | 'thought' | 'win';

const captureTypes: {
  type: CaptureType;
  label: string;
}[] = [
  { type: 'task', label: 'Task' },
  { type: 'idea', label: 'Idea' },
  { type: 'thought', label: 'Thought' },
  { type: 'win', label: 'Win' },
];

export function QuickCapture() {
  const [value, setValue] = useState('');
  const [type, setType] = useState<CaptureType>('task');
  const [saving, setSaving] = useState(false);

  const createTask = useMutation(api.tasks.create);
  const createIdea = useMutation(api.ideas.create);
  const createThought = useMutation(api.thoughts.create);
  const createWin = useMutation(api.wins.create);

  const submit = async () => {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      switch (type) {
        case 'task':
          await createTask({ title: value.trim() });
          break;
        case 'idea':
          await createIdea({ content: value.trim() });
          break;
        case 'thought':
          await createThought({ content: value.trim() });
          break;
        case 'win':
          await createWin({ content: value.trim() });
          break;
      }
      setValue('');
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
