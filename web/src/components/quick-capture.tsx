'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useSlashCommands, SlashCommandMenu, type SlashCommand } from '@/components/slash-command-menu';

type CaptureType = 'task' | 'idea' | 'thought' | 'win' | 'reminder';

const captureTypes: {
  type: CaptureType;
  label: string;
}[] = [
  { type: 'task', label: 'Task' },
  { type: 'idea', label: 'Idea' },
  { type: 'thought', label: 'Thought' },
  { type: 'win', label: 'Win' },
  { type: 'reminder', label: 'Reminder' },
];

export function QuickCapture() {
  const [value, setValue] = useState('');
  const [type, setType] = useState<CaptureType>('task');
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const createTask = useMutation(api.tasks.create);
  const createIdea = useMutation(api.ideas.create);
  const createThought = useMutation(api.thoughts.create);
  const createWin = useMutation(api.wins.create);
  const createReminder = useMutation(api.reminders.create);

  const slashCommands: SlashCommand[] = useMemo(
    () => [
      {
        id: 'task',
        label: 'Task',
        description: 'Create a new task',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ),
        action: () => setType('task'),
      },
      {
        id: 'idea',
        label: 'Idea',
        description: 'Capture an idea',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="9" y1="18" x2="15" y2="18" />
            <line x1="10" y1="22" x2="14" y2="22" />
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
          </svg>
        ),
        action: () => setType('idea'),
      },
      {
        id: 'thought',
        label: 'Thought',
        description: 'Record a thought',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
        action: () => setType('thought'),
      },
      {
        id: 'win',
        label: 'Win',
        description: 'Log a win',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="7" />
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
          </svg>
        ),
        action: () => setType('win'),
      },
      {
        id: 'reminder',
        label: 'Reminder',
        description: 'Set a reminder',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
        action: () => setType('reminder'),
      },
    ],
    []
  );

  const slash = useSlashCommands(slashCommands, (cleanedText) => {
    setValue(cleanedText);
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        case 'reminder':
          await createReminder({
            title: value.trim(),
            scheduledAt: Date.now() + 60 * 60 * 1000, // default 1 hour from now
          });
          break;
      }
      setValue('');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    const cursorPosition = e.target.selectionStart ?? newValue.length;
    slash.handleInputChange(newValue, cursorPosition);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Let slash commands handle first
    if (slash.handleKeyDown(e)) return;
    if (e.key === 'Enter') void submit();
  };

  const currentLabel = captureTypes.find((c) => c.type === type)?.label ?? 'Task';

  return (
    <div className="relative border border-border rounded-xl flex items-center overflow-visible">
      {/* Type dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-muted transition-colors hover:text-text"
        >
          {currentLabel}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[120px] rounded-lg border border-border bg-surface shadow-lg">
            {captureTypes.map(({ type: t, label }) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setDropdownOpen(false);
                }}
                className={`block w-full px-4 py-2 text-left text-xs font-medium uppercase tracking-wide transition-colors ${
                  type === t
                    ? 'text-text bg-surface-hover'
                    : 'text-text-muted hover:text-text hover:bg-surface-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border shrink-0" />

      {/* Input */}
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={`Quick capture ${type}... (type / for commands)`}
          className="w-full bg-transparent text-sm text-text placeholder:text-text-muted/50 outline-none px-4 py-3"
        />

        {/* Slash command menu */}
        {slash.menuVisible && (
          <div className="absolute left-2 bottom-full mb-2 z-50">
            <SlashCommandMenu
              commands={slash.filteredCommands}
              selectedIndex={slash.selectedIndex}
              onSelect={slash.selectCommand}
            />
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={submit}
        disabled={!value.trim() || saving}
        className="shrink-0 bg-white text-black rounded-lg px-5 py-2 mr-1.5 text-xs font-medium uppercase tracking-wide transition-colors hover:bg-white/90 disabled:opacity-20 disabled:pointer-events-none"
      >
        Add
      </button>
    </div>
  );
}
