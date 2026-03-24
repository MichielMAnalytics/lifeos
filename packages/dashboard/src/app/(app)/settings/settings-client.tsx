'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { ConfigureToolbar } from '@/components/configure-toolbar';
import type { Id } from '../../../../../../convex/_generated/dataModel';

interface User {
  _id: Id<"users">;
  _creationTime: number;
  email: string;
  name?: string;
  timezone: string;
}

interface ApiKeyEntry {
  _id: Id<"apiKeys">;
  _creationTime: number;
  name?: string;
  keyPrefix: string;
  lastUsedAt?: number;
}

function daysSince(creationTime: number): number {
  try {
    return Math.max(0, Math.floor((Date.now() - creationTime) / 86400000));
  } catch {
    return 0;
  }
}

function formatJoinDate(creationTime: number): string {
  const d = new Date(creationTime);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getGreeting(name: string | undefined): string {
  const h = new Date().getHours();
  const n = name || 'operator';
  if (h < 6) return `Late night, ${n}`;
  if (h < 12) return `Good morning, ${n}`;
  if (h < 18) return `Good afternoon, ${n}`;
  return `Good evening, ${n}`;
}

function getDetectedTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function SettingsClient({
  user,
  initialApiKeys,
}: {
  user: User | null;
  initialApiKeys: ApiKeyEntry[];
}) {
  const [apiKeys] = useState<ApiKeyEntry[]>(initialApiKeys);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Profile picture from localStorage
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Timezone
  const [detectedTz, setDetectedTz] = useState('');
  const [updatingTz, setUpdatingTz] = useState(false);
  const [tzUpdated, setTzUpdated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('lifeos-avatar');
    if (stored) setAvatar(stored);
    setDetectedTz(getDetectedTimezone());
  }, []);

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatar(result);
      localStorage.setItem('lifeos-avatar', result);
    };
    reader.readAsDataURL(file);
  }

  const updateMeMutation = useMutation(api.authHelpers.updateMe);

  async function handleUpdateTimezone() {
    setUpdatingTz(true);
    try {
      await updateMeMutation({ timezone: detectedTz });
      setTzUpdated(true);
    } catch {
      // silent
    } finally {
      setUpdatingTz(false);
    }
  }

  function removeAvatar() {
    setAvatar(null);
    localStorage.removeItem('lifeos-avatar');
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreating(true);
    setCreatedKey(null);
    setError(null);

    try {
      // API key creation would need a dedicated Convex mutation or HTTP endpoint
      // For now, show an error since the old REST API is deprecated
      setError('API key creation via REST is no longer supported. Use the Convex CLI.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  const days = user ? daysSince(user._creationTime) : 0;
  const userTz = user?.timezone || detectedTz;
  const tzCity = userTz.split('/').pop()?.replace(/_/g, ' ') || userTz;

  return (
    <div className="max-w-none space-y-12 animate-fade-in">
      <ConfigureToolbar />
      <h1 className="text-3xl font-bold tracking-tight text-text">Settings</h1>

      {/* -- Profile ---------------------------------------- */}
      <section>
        <SectionHeader label="Profile" />

        {user ? (
          <div className="border border-border">
            {/* Hero */}
            <div className="p-8 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-6">
                  {/* Avatar with upload */}
                  <div className="relative group">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Profile"
                        className="h-18 w-18 rounded-full object-cover border-2 border-border"
                        style={{ width: 72, height: 72 }}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center rounded-full border-2 border-border bg-surface text-2xl font-bold text-text"
                        style={{ width: 72, height: 72 }}
                      >
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      style={{ width: 72, height: 72 }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </button>
                    {avatar && (
                      <button
                        onClick={removeAvatar}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-danger text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove photo"
                      >
                        x
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-xl font-bold text-text">
                      {getGreeting(user.name)}
                    </p>
                    <p className="text-sm text-text-muted font-mono mt-1">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Day counter */}
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-text-muted">
                    Day
                  </p>
                  <p className="text-4xl font-bold text-text font-mono tabular-nums leading-tight">
                    {days}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 divide-x divide-border">
              <Stat label="Timezone" value={tzUpdated ? (detectedTz.split('/').pop()?.replace(/_/g, ' ') || detectedTz) : tzCity} />
              <Stat label="Joined" value={formatJoinDate(user._creationTime)} />
              <Stat label="API Keys" value={String(apiKeys.length)} mono />
            </div>

            {/* Timezone auto-detect notice */}
            {detectedTz && detectedTz !== user.timezone && !tzUpdated && (
              <div className="px-6 py-3 border-t border-border flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  Your browser timezone is <span className="font-mono text-text">{detectedTz}</span>,
                  but your profile is set to <span className="font-mono text-text">{user.timezone}</span>
                </p>
                <button
                  onClick={handleUpdateTimezone}
                  disabled={updatingTz}
                  className="text-xs font-mono text-text underline underline-offset-2 hover:opacity-70 transition-opacity disabled:opacity-50"
                >
                  {updatingTz ? 'Updating...' : 'Update'}
                </button>
              </div>
            )}
            {tzUpdated && (
              <div className="px-6 py-3 border-t border-border">
                <p className="text-xs text-success">
                  Timezone updated to {detectedTz}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-border p-12 text-center">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-border mx-auto mb-4 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <p className="text-text font-medium">Connect your profile</p>
            <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
              Set <span className="font-mono text-text">LIFEOS_API_KEY</span> in your dashboard
              environment to load your profile data.
            </p>
          </div>
        )}
      </section>

      {/* -- API Keys --------------------------------------- */}
      <section>
        <SectionHeader label="API Keys" />

        <div className="border border-border">
          {apiKeys.length > 0 ? (
            <div className="divide-y divide-border">
              {apiKeys.map((key, idx) => (
                <div
                  key={key._id}
                  className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-hover"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-text-muted w-8">
                      [{String(idx + 1).padStart(2, '0')}]
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text">
                        {key.name ?? 'Unnamed key'}
                      </p>
                      <p className="font-mono text-xs text-text-muted mt-0.5">
                        {key.keyPrefix}{'--------'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {key.lastUsedAt ? (
                      <p className="text-xs text-text-muted font-mono">
                        {new Date(key.lastUsedAt).toISOString().split('T')[0]}
                      </p>
                    ) : (
                      <span className="text-xs text-text-muted/50">[ never used ]</span>
                    )}
                    <div className={`h-2 w-2 rounded-full ${key.lastUsedAt ? 'bg-success' : 'bg-border'}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-text-muted">No API keys yet.</p>
              <p className="text-xs text-text-muted/60 mt-1">Create one to connect the CLI or OpenClaw.</p>
            </div>
          )}

          <div className="border-t border-border px-6 py-4">
            {createdKey && (
              <div className="border border-success/30 p-4 mb-4">
                <p className="mb-2 text-xs font-bold text-success uppercase tracking-wide">
                  Key created -- copy it now, it won&apos;t be shown again
                </p>
                <code className="block break-all text-xs text-text font-mono select-all">
                  {createdKey}
                </code>
              </div>
            )}

            {error && <p className="text-xs text-danger mb-3">{error}</p>}

            <form onSubmit={handleCreateKey} className="flex gap-3">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. CLI, Mobile, OpenClaw)"
                className="flex-1 border border-border bg-transparent px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-text focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={creating || !newKeyName.trim()}
                className="bg-text text-bg px-5 py-2.5 text-xs font-medium uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-30 disabled:pointer-events-none"
              >
                {creating ? 'Creating...' : 'Create Key'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -- Section Header ----------------------------------------- */

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">{label}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/* -- Stat cell ---------------------------------------------- */

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-6 py-4 text-center">
      <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">{label}</p>
      <p className={`text-sm font-medium text-text ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

