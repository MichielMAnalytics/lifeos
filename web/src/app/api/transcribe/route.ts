import { NextRequest, NextResponse } from 'next/server';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_INTERNAL_URL ?? 'http://ai-gateway-default.lifeos-system.svc.cluster.local';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Transcription not configured' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Forward to OpenAI's Whisper API directly (bypasses AI gateway IP validation)
    const upstreamForm = new FormData();
    upstreamForm.append('file', file, file.name || 'voice.webm');
    upstreamForm.append('model', 'gpt-4o-mini-transcribe');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: upstreamForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[transcribe] OpenAI error:', res.status, errText);
      return NextResponse.json({ error: 'Transcription failed' }, { status: res.status });
    }

    const data = await res.json() as { text?: string };
    return NextResponse.json({ text: data.text ?? '' });
  } catch (err) {
    console.error('[transcribe] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
