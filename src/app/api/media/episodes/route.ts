import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TOKEN = process.env.TMDB_READ_TOKEN!;
const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

export async function GET(request: NextRequest) {
  const tmdbId = request.nextUrl.searchParams.get('id');
  const season = request.nextUrl.searchParams.get('season') || '1';

  if (!tmdbId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}/season/${season}`, { headers });
    const data = await res.json();

    const episodes = (data.episodes || []).map((ep: any) => ({
      episode_number: ep.episode_number,
      name: ep.name,
      overview: ep.overview,
      still_path: ep.still_path,
      runtime: ep.runtime,
      air_date: ep.air_date,
    }));

    return NextResponse.json(episodes);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
  }
}
