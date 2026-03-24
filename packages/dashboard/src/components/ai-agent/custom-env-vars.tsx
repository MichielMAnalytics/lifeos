'use client';

import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui-clawnow/button";
import { Input } from "@/components/ui-clawnow/input";
import { SecretInput } from "@/components/ui-clawnow/secret-input";
import { capture, EVENTS } from "@/lib/analytics";

interface EnvEntry {
  name: string;
  value: string;
}

export function CustomEnvVars() {
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const saveCustomEnvVars = useMutation(api.deploymentSettings.saveCustomEnvVars);

  const [entries, setEntries] = useState<EnvEntry[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storedKeys = settings?.customEnvKeys ?? [];
  const hasNewEntries = entries.some((e) => e.name && e.value);
  const hasReplacements = Object.values(replacements).some((v) => v.length > 0);
  const hasChanges = hasNewEntries || hasReplacements || pendingDeletes.size > 0;

  const addEntry = () => {
    setEntries([...entries, { name: "", value: "" }]);
  };

  const updateEntry = (idx: number, field: "name" | "value", val: string) => {
    const next = [...entries];
    next[idx] = {
      ...next[idx],
      [field]: field === "name" ? val.toUpperCase().replace(/[^A-Z0-9_]/g, "") : val,
    };
    setEntries(next);
  };

  const removeEntry = (idx: number) => {
    setEntries(entries.filter((_, i) => i !== idx));
  };

  const markForDeletion = (name: string) => {
    setPendingDeletes((prev) => new Set([...prev, name]));
    setReplacements((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const undoDeletion = (name: string) => {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  const handleSave = async () => {
    const envVars: Array<{ name: string; value: string }> = [];
    for (const e of entries) {
      if (e.name && e.value) envVars.push({ name: e.name, value: e.value });
    }
    for (const [name, value] of Object.entries(replacements)) {
      if (value) envVars.push({ name, value });
    }
    for (const name of pendingDeletes) {
      envVars.push({ name, value: "" });
    }
    if (envVars.length === 0) return;

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await saveCustomEnvVars({ envVars });
      setEntries([]);
      setPendingDeletes(new Set());
      setReplacements({});
      setSaved(true);
      capture(EVENTS.CREDENTIALS_UPDATED, { context: "custom_env_vars" });
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[9px] text-text-muted/60 leading-relaxed">
        Skills automatically pick these up as environment variables — for example, set{" "}
        <code className="text-[9px] bg-surface px-1 py-0.5 rounded">BRAVE_API_KEY</code> for
        web search or{" "}
        <code className="text-[9px] bg-surface px-1 py-0.5 rounded">E2B_API_KEY</code> for code sandboxes.
      </p>

      {/* Existing stored keys */}
      {storedKeys.map((key) => {
        const isDeleting = pendingDeletes.has(key.name);
        const replacementValue = replacements[key.name] ?? "";

        return (
          <div key={key.name} className={`flex items-center gap-2 ${isDeleting ? "opacity-40" : ""}`}>
            <div className="w-[35%] shrink-0">
              <Input
                value={key.name}
                disabled
                className="font-mono text-xs bg-surface/50"
              />
            </div>
            <div className="flex-1 min-w-0">
              {isDeleting ? (
                <div className="h-9 flex items-center px-3 text-[10px] text-text-muted italic">
                  Will be removed
                </div>
              ) : (
                <SecretInput
                  storedLength={key.valueLength}
                  placeholder="Enter new value to replace"
                  value={replacementValue}
                  onChange={(val) =>
                    setReplacements((prev) => ({ ...prev, [key.name]: val }))
                  }
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => isDeleting ? undoDeletion(key.name) : markForDeletion(key.name)}
              className={`shrink-0 transition-colors p-1 ${
                isDeleting
                  ? "text-text-muted hover:text-text"
                  : "text-text-muted/40 hover:text-danger"
              }`}
              title={isDeleting ? "Undo remove" : "Remove"}
            >
              {isDeleting ? (
                <span className="text-[9px] font-medium">Undo</span>
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </button>
          </div>
        );
      })}

      {/* New entries */}
      {entries.map((entry, idx) => (
        <div key={`new-${idx}`} className="flex items-center gap-2">
          <div className="w-[35%] shrink-0">
            <Input
              value={entry.name}
              onChange={(e) => updateEntry(idx, "name", e.target.value)}
              placeholder="ENV_VAR_NAME"
              className="font-mono text-xs"
            />
          </div>
          <div className="flex-1">
            <SecretInput
              placeholder="value"
              value={entry.value}
              onChange={(val) => updateEntry(idx, "value", val)}
            />
          </div>
          <button
            type="button"
            onClick={() => removeEntry(idx)}
            className="shrink-0 text-text-muted/40 hover:text-danger transition-colors p-1"
            title="Remove"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}

      {/* Add button */}
      <button
        type="button"
        onClick={addEntry}
        className="flex items-center gap-1.5 text-[10px] text-text-muted hover:text-text transition-colors cursor-pointer"
      >
        <Plus className="size-3" />
        Add environment variable
      </button>

      {/* Save */}
      {hasChanges && (
        <>
          <p className="text-[9px] text-text-muted/50 leading-relaxed">
            Saving will restart your instance to apply the new environment variables. This takes about 1 minute.
          </p>
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            loading={saving}
            className="w-full"
          >
            {saving ? "Saving..." : "Save & Restart"}
          </Button>
        </>
      )}

      {error && (
        <p className="text-[10px] text-center text-danger">{error}</p>
      )}
      {saved && (
        <p className="text-[10px] text-center text-success">
          Environment variables updated. Your instance will restart shortly.
        </p>
      )}
    </div>
  );
}
