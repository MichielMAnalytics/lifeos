import { promises as fs } from 'fs';
import path from 'path';
import Link from 'next/link';
import { InspirationView } from '@/components/inspiration-view';
import type { InspirationData } from '@/lib/inspiration-types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadData(): Promise<InspirationData | null> {
  try {
    const filePath = path.join(process.cwd(), 'inspiration', 'operatorai-data.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as InspirationData;
  } catch {
    return null;
  }
}

export default async function OperatoraiInspirationPage() {
  const data = await loadData();

  if (!data || !Array.isArray(data.ideas) || data.ideas.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-16 px-12">
        <Link
          href="/today"
          className="inline-flex items-center gap-1 text-xs text-text-muted/70 hover:text-text transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>
        <h1 className="mt-10 text-3xl font-bold tracking-tight text-text">Operatorai inspiration</h1>
        <p className="mt-2 text-sm text-text-muted">No diff data yet.</p>
        <div className="mt-6 rounded-lg border border-border bg-surface/30 p-5 text-sm leading-relaxed text-text-muted">
          <p>Generate the first batch from the lifeai root:</p>
          <pre className="mt-3 overflow-x-auto rounded border border-border bg-bg p-3 text-xs text-text">bash scripts/diff-operatorai.sh</pre>
          <p className="mt-3">
            The script diffs <code className="rounded bg-surface px-1 text-text">~/Code/operatorai</code>{' '}
            against the last checkpoint and writes ideas to{' '}
            <code className="rounded bg-surface px-1 text-text">web/inspiration/operatorai-data.json</code>.
          </p>
        </div>
      </div>
    );
  }

  return <InspirationView data={data} />;
}
