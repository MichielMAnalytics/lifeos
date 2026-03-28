'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

interface SlashCommandState {
  menuVisible: boolean;
  filteredCommands: SlashCommand[];
  selectedIndex: number;
  query: string;
}

interface UseSlashCommandsReturn extends SlashCommandState {
  handleInputChange: (value: string, cursorPosition: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  dismiss: () => void;
  selectCommand: (index: number) => void;
}

export function useSlashCommands(
  commands: SlashCommand[],
  onTextChange?: (cleanedText: string) => void
): UseSlashCommandsReturn {
  const [state, setState] = useState<SlashCommandState>({
    menuVisible: false,
    filteredCommands: [],
    selectedIndex: 0,
    query: '',
  });

  const slashStartRef = useRef<number>(-1);

  const dismiss = useCallback(() => {
    setState({
      menuVisible: false,
      filteredCommands: [],
      selectedIndex: 0,
      query: '',
    });
    slashStartRef.current = -1;
  }, []);

  const handleInputChange = useCallback(
    (value: string, cursorPosition: number) => {
      // Find the last "/" before cursor that starts a command
      const textBeforeCursor = value.slice(0, cursorPosition);
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

      if (lastSlashIndex === -1 || (lastSlashIndex > 0 && textBeforeCursor[lastSlashIndex - 1] !== ' ')) {
        // No slash, or slash is not at start or after a space
        if (lastSlashIndex === -1 || lastSlashIndex > 0) {
          dismiss();
          return;
        }
      }

      const query = textBeforeCursor.slice(lastSlashIndex + 1).toLowerCase();

      // Check if there's a space in the query (means user moved past the command)
      if (query.includes(' ')) {
        dismiss();
        return;
      }

      slashStartRef.current = lastSlashIndex;

      const filtered = commands.filter(
        (cmd) =>
          cmd.id.toLowerCase().includes(query) ||
          cmd.label.toLowerCase().includes(query)
      );

      setState({
        menuVisible: true,
        filteredCommands: filtered,
        selectedIndex: 0,
        query,
      });
    },
    [commands, dismiss]
  );

  const selectCommand = useCallback(
    (index: number) => {
      const cmd = state.filteredCommands[index];
      if (!cmd) return;

      // Remove the slash command text from input
      if (onTextChange) {
        onTextChange('');
      }

      cmd.action();
      dismiss();
    },
    [state.filteredCommands, dismiss, onTextChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!state.menuVisible) return false;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.filteredCommands.length - 1),
        }));
        return true;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0),
        }));
        return true;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectCommand(state.selectedIndex);
        return true;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
        return true;
      }

      return false;
    },
    [state.menuVisible, state.selectedIndex, selectCommand, dismiss]
  );

  return {
    ...state,
    handleInputChange,
    handleKeyDown,
    dismiss,
    selectCommand,
  };
}

// ── Slash Command Menu Component ─────────────────────

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function SlashCommandMenu({ commands, selectedIndex, onSelect }: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (commands.length === 0) {
    return (
      <div
        ref={menuRef}
        className="w-64 rounded-xl border border-border bg-surface shadow-xl overflow-hidden"
      >
        <div className="px-3 py-3 text-xs text-text-muted text-center">
          No matching commands
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="w-64 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
    >
      {commands.map((cmd, idx) => (
        <button
          key={cmd.id}
          ref={idx === selectedIndex ? selectedRef : undefined}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(idx);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
            idx === selectedIndex ? 'bg-surface-hover' : ''
          }`}
        >
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-text-muted">
            {cmd.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-text font-medium">/{cmd.id}</div>
            <div className="text-xs text-text-muted truncate">{cmd.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
