'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Button } from '@/components/ui/button';

export function IdentityStatement() {
  const statement = useQuery(api.identity.get);
  const upsert = useMutation(api.identity.upsert);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (statement !== undefined && statement !== null) {
      setDraft(statement);
    }
  }, [statement]);

  async function handleSave() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await upsert({ statement: draft.trim() });
      setEditing(false);
    } catch (err) {
      console.error('Failed to save identity statement:', err);
    } finally {
      setSaving(false);
    }
  }

  if (statement === undefined) {
    return <div className="animate-pulse h-32 bg-surface rounded-lg" />;
  }

  return (
    <div className="border border-border flex flex-col">
      {/* Header */}
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Identity
        </h2>
        {!editing && (
          <button
            onClick={() => {
              setDraft(statement ?? '');
              setEditing(true);
            }}
            className="text-xs text-text-muted hover:text-text transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {editing ? (
          <div className="space-y-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Define who you are and who you're becoming..."
              rows={6}
              autoFocus
              className="w-full rounded-md border border-border bg-bg px-4 py-3 text-base text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || !draft.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setDraft(statement ?? '');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : statement ? (
          <blockquote className="border-l-2 border-border pl-6 py-2">
            <p className="text-lg italic text-text leading-relaxed whitespace-pre-line">
              {statement}
            </p>
          </blockquote>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full py-12 text-center group"
          >
            <p className="text-base text-text-muted italic group-hover:text-text transition-colors">
              &ldquo;Define who you are and who you&rsquo;re becoming...&rdquo;
            </p>
            <p className="text-xs text-text-muted/60 mt-2 group-hover:text-text-muted transition-colors">
              Click to write your identity statement
            </p>
          </button>
        )}
      </div>
    </div>
  );
}
