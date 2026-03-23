'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/theme-provider';
import { themes, themeKeys, type ThemeKey } from '@/lib/themes';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface User {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  created_at: string;
}

interface ApiKeyEntry {
  id: string;
  name: string | null;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const apiKey = localStorage.getItem('lifeos_api_key') || '';
      const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
      const [userRes, keysRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/auth/me`, { headers }),
        fetch(`${API_URL}/api/v1/auth/api-keys`, { headers }),
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.data);
      }

      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setApiKeys(keysData.data ?? []);
      }
    } catch {
      // Non-fatal — theme section still works
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreating(true);
    setCreatedKey(null);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      const data = await res.json();
      setCreatedKey(data.data?.key ?? null);
      setNewKeyName('');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-none space-y-10">
      <h1 className="text-3xl font-bold tracking-tight text-text">Settings</h1>

      {/* Theme Switcher */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Theme
          </h2>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {themeKeys.map((key) => {
            const t = themes[key];
            const isActive = theme === key;
            return (
              <ThemeCard
                key={key}
                themeKey={key}
                name={t.name}
                description={t.description}
                colors={t.colors}
                isActive={isActive}
                onClick={() => setTheme(key)}
              />
            );
          })}
        </div>
      </section>

      {/* User Info */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Profile
          </h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="border border-border p-6">
          {user ? (
            <div className="space-y-3 text-sm">
              <Row label="Email" value={user.email} />
              <Row label="Name" value={user.name ?? '-'} />
              <Row label="Timezone" value={user.timezone} />
              <Row label="Member since" value={user.created_at.split('T')[0]} />
            </div>
          ) : (
            <p className="text-sm text-text-muted">Unable to load user info.</p>
          )}
        </div>
      </section>

      {/* API Keys */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
            API Keys
          </h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="border border-border p-6 space-y-4">
          {apiKeys.length > 0 ? (
            <div className="divide-y divide-border">
              {apiKeys.map((key, idx) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-muted">
                      [{String(idx + 1).padStart(2, '0')}]
                    </span>
                    <div>
                      <p className="text-sm text-text">
                        {key.name ?? 'Unnamed key'}
                      </p>
                      <p className="font-mono text-xs text-text-muted">
                        {key.key_prefix}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {key.last_used_at ? (
                      <p className="text-xs text-text-muted font-mono">
                        Last used: {key.last_used_at.split('T')[0]}
                      </p>
                    ) : (
                      <span className="text-xs text-text-muted">[ never used ]</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No API keys created.</p>
          )}

          {createdKey && (
            <div className="border border-success/30 p-4">
              <p className="mb-2 text-xs font-bold text-success uppercase tracking-wide">
                Key created. Copy it now -- it will not be shown again.
              </p>
              <code className="block break-all text-xs text-text font-mono">
                {createdKey}
              </code>
            </div>
          )}

          <form onSubmit={handleCreateKey} className="flex gap-3 pt-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. CLI, Mobile)"
              className="flex-1 border border-border bg-transparent px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-text focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={creating || !newKeyName.trim()}
              className="bg-white text-black px-5 py-2.5 text-sm font-medium uppercase tracking-wide hover:bg-white/90 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              {creating ? 'Creating...' : 'Create Key'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

/* -- Theme Card ---- */

function ThemeCard({
  themeKey,
  name,
  description,
  colors,
  isActive,
  onClick,
}: {
  themeKey: ThemeKey;
  name: string;
  description: string;
  colors: (typeof themes)[ThemeKey]['colors'];
  isActive: boolean;
  onClick: () => void;
}) {
  const paletteColors = [
    { key: 'bg', color: colors.bg },
    { key: 'surface', color: colors.surface },
    { key: 'accent', color: colors.accent },
    { key: 'success', color: colors.success },
    { key: 'danger', color: colors.danger },
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Switch to ${name} theme`}
      aria-pressed={isActive}
      className={`
        group relative flex flex-col gap-3 border p-4 text-left
        transition-all duration-200 cursor-pointer
        ${
          isActive
            ? 'border-text ring-1 ring-text/20'
            : 'border-border hover:border-text/30'
        }
      `}
      style={{ backgroundColor: colors.bg }}
    >
      {/* Active indicator */}
      {isActive && (
        <div
          className="absolute right-3 top-3 h-2 w-2 rounded-full"
          style={{ backgroundColor: colors.accent }}
        />
      )}

      {/* Color palette preview */}
      <div className="flex gap-1.5">
        {paletteColors.map((p) => (
          <div
            key={p.key}
            className="h-4 w-4 rounded-full border border-white/10"
            style={{ backgroundColor: p.color }}
            title={p.key}
          />
        ))}
      </div>

      {/* Text */}
      <div>
        <p
          className="text-sm font-medium"
          style={{ color: colors.text }}
        >
          {name}
        </p>
        <p
          className="mt-0.5 text-xs leading-snug"
          style={{ color: colors['text-muted'] }}
        >
          {description}
        </p>
      </div>

      {/* Preview bar showing surface + accent */}
      <div
        className="flex h-px w-full overflow-hidden"
        style={{ backgroundColor: colors.surface }}
      >
        <div
          className="h-full w-2/5"
          style={{ backgroundColor: colors.accent }}
        />
      </div>
    </button>
  );
}

/* -- Helper ---- */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-text-muted text-xs uppercase tracking-wide">{label}</span>
      <span className="text-text font-mono">{value}</span>
    </div>
  );
}
