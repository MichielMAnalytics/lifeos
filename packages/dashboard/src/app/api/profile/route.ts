import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.LIFEOS_API_URL || 'http://localhost:4100';
const API_KEY = process.env.LIFEOS_API_KEY || '';

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
