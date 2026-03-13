import { NextRequest, NextResponse } from 'next/server';

const CONSUMET_URL = process.env.CONSUMET_API_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json([]);

  try {
    const res = await fetch(`${CONSUMET_URL}/anime/animekai/${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('Consumet unavailable');
    const data = await res.json();
    return NextResponse.json(data.results || []);
  } catch {
    return NextResponse.json([]);
  }
}
