import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IncomingPick = {
  id: string;
  title?: string;
  category?: string;
  picked: boolean;
  note?: string;
};

type Body = {
  source: string;
  picks: IncomingPick[];
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!body || typeof body.source !== 'string' || !Array.isArray(body.picks)) {
    return NextResponse.json({ error: 'bad shape' }, { status: 400 });
  }
  if (!/^[a-z0-9-]+$/i.test(body.source)) {
    return NextResponse.json({ error: 'bad source' }, { status: 400 });
  }

  const dir = path.join(process.cwd(), 'inspiration');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${body.source}-picks.json`);

  const picked = body.picks.filter((p) => p.picked);
  const skipped = body.picks.filter((p) => !p.picked && (p.note ?? '').trim().length > 0);

  const payload = {
    saved_at: new Date().toISOString(),
    source: body.source,
    picked_count: picked.length,
    picked,
    skipped_with_notes: skipped,
  };

  await fs.writeFile(file, JSON.stringify(payload, null, 2) + '\n', 'utf-8');

  return NextResponse.json({ ok: true, file: `web/inspiration/${body.source}-picks.json`, picked: picked.length });
}
