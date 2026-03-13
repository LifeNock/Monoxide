import { NextRequest, NextResponse } from 'next/server';

const CONSUMET_URL = process.env.CONSUMET_API_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ episodes: [] });

  try {
    const res = await fetch(`${CONSUMET_URL}/anime/animekai/info?id=${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('Consumet unavailable');
    const data = await res.json();
    return NextResponse.json({
      title: data.title,
      episodes: data.episodes || [],
      totalEpisodes: data.totalEpisodes,
    });
  } catch {
    return NextResponse.json({ episodes: [] });
  }
}
