'use client';

import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui-clawnow/input";

export function SecretInput({
  storedLength,
  value,
  onChange,
  placeholder,
  onDelete,
  pendingDelete,
}: {
  storedLength?: number;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  onDelete?: () => void;
  pendingDelete?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [visible, setVisible] = useState(false);

  if (!editing && !value && storedLength) {
    return (
      <div
        className="flex items-center h-9 w-full border border-border bg-transparent px-3 py-1 text-sm cursor-text rounded-md"
        onClick={() => setEditing(true)}
      >
        <span className={pendingDelete ? "text-text-muted/30 tracking-wider select-none line-through" : "text-text-muted tracking-wider select-none"}>
          {"\u2022".repeat(Math.min(storedLength, 40))}
        </span>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="ml-auto text-text-muted hover:text-danger transition-colors cursor-pointer"
            title={pendingDelete ? "Undo delete" : "Delete key"}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        placeholder={storedLength ? `Enter new value to replace` : placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => { if (!value) setEditing(false); }}
        className="pr-9"
        autoFocus={editing && !value}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      ) : null}
    </div>
  );
}
