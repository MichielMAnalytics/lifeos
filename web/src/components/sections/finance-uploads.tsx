'use client';

import { useState, type ChangeEvent, type DragEvent } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api, type Doc } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

type SourceChoice = 'auto' | 'revolut' | 'wio';

type ImportResult =
  | { kind: 'success'; inserted: number; skipped: number; parseSkipped: number; source: string }
  | { kind: 'error'; reason: string };

const SOURCE_OPTIONS: { value: SourceChoice; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'revolut', label: 'Revolut' },
  { value: 'wio', label: 'WIO' },
];

export function FinanceUploads({
  statements,
}: {
  statements?: Doc<'financeStatements'>[];
} = {}) {
  const queried = useQuery(api.financeStatements.list, statements ? 'skip' : {});
  const importCsv = useAction(api.financeImport.importCsv);
  const remove = useMutation(api.financeStatements.remove);

  const [source, setSource] = useState<SourceChoice>('auto');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const data = statements ?? queried;
  const isMock = statements !== undefined;

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setResult({ kind: 'error', reason: 'not-a-csv' });
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const csvText = await file.text();
      const res = await importCsv({
        csvText,
        filename: file.name,
        source: source === 'auto' ? undefined : source,
      });
      if (res.ok) {
        setResult({
          kind: 'success',
          inserted: res.inserted,
          skipped: res.skipped,
          parseSkipped: res.parseSkipped,
          source: res.source,
        });
      } else {
        setResult({ kind: 'error', reason: res.reason });
      }
    } catch (err) {
      setResult({
        kind: 'error',
        reason: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }

  async function handleDelete(id: Doc<'financeStatements'>['_id']) {
    if (isMock) return;
    try {
      await remove({ id });
    } catch {
      // Convex will surface the error in dev tools; nothing to do here.
    }
  }

  return (
    <div className="border border-border rounded-xl">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
          Finance · Statement uploads
        </h3>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="flex items-center gap-1.5">
          {SOURCE_OPTIONS.map((opt) => {
            const active = source === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSource(opt.value)}
                disabled={uploading}
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50',
                  active
                    ? 'border-accent bg-accent text-white'
                    : 'border-border text-text-muted hover:text-text hover:border-accent/40',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            dragOver ? 'border-accent bg-accent/5' : 'border-border bg-bg-subtle/30',
          )}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
              <span
                className="inline-block h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin"
                aria-hidden
              />
              Uploading…
            </div>
          ) : (
            <div className="space-y-2">
              <label className="inline-block cursor-pointer text-[11px] font-semibold uppercase tracking-wide px-4 py-2 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors">
                Choose CSV file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onInputChange}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-text-muted/80">
                or drag a CSV here
              </p>
            </div>
          )}
        </div>

        {result?.kind === 'success' && (
          <div className="text-xs text-success bg-success/10 border border-success/30 rounded-md px-3 py-2">
            <span className="font-semibold">✓</span>{' '}
            Imported {result.inserted} transaction{result.inserted === 1 ? '' : 's'}
            {result.skipped > 0 && `, skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}`}
            {result.parseSkipped > 0 && ` · ${result.parseSkipped} unparseable row${result.parseSkipped === 1 ? '' : 's'}`}
            {' '}<span className="text-text-muted">({result.source})</span>
          </div>
        )}

        {result?.kind === 'error' && (
          <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
            <strong>Upload failed:</strong> {importErrorLabel(result.reason)}
          </div>
        )}
      </div>

      <div className="border-t border-border">
        <div className="px-5 py-2.5 flex items-baseline justify-between">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
            History
          </h4>
          {data && data.length > 0 && (
            <span className="text-[10px] text-text-muted/70">
              {data.length} upload{data.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {data === undefined ? (
          <div className="px-5 py-6 animate-pulse space-y-2">
            <div className="h-3 w-3/4 bg-bg-subtle rounded" />
            <div className="h-3 w-1/2 bg-bg-subtle rounded" />
          </div>
        ) : data.length === 0 ? (
          <div className="px-5 py-6 text-center text-xs text-text-muted">
            No uploads yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((s) => (
              <div
                key={s._id}
                className="group px-5 py-3 flex items-center gap-3 hover:bg-surface-hover transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text truncate">
                      {s.filename}
                    </span>
                    <SourcePill source={s.source} />
                    {s.accountLabel && (
                      <span className="text-[10px] text-text-muted/80 truncate">
                        {s.accountLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5 tabular-nums">
                    imported {s.parsedCount} / skipped {s.skippedCount}
                    <span className="text-text-muted/60"> · {formatRelative(s.uploadedAt)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(s._id)}
                  disabled={isMock}
                  className="opacity-0 group-hover:opacity-100 text-[11px] font-medium text-text-muted hover:text-danger transition-all px-2 py-1 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SourcePill({ source }: { source: Doc<'financeStatements'>['source'] }) {
  const label = source === 'revolut' ? 'Revolut' : source === 'wio' ? 'WIO' : 'Generic';
  return (
    <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-bg-subtle border border-border text-text-muted">
      {label}
    </span>
  );
}

function importErrorLabel(reason: string): string {
  switch (reason) {
    case 'empty-csv':
      return 'That file looks empty';
    case 'unknown-source':
      return 'Pick which bank this CSV is from';
    case 'no-rows':
      return "Couldn't parse any rows — wrong format?";
    case 'parse-failed':
      return 'Parse error — file may be malformed';
    case 'not-a-csv':
      return 'Only .csv files are supported';
    default:
      return reason;
  }
}

function formatRelative(epochMs: number): string {
  const diff = Date.now() - epochMs;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}
