import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TOKEN = process.env.TMDB_READ_TOKEN!;
const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  const type = request.nextUrl.searchParams.get('type') || 'anime';

  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    let results: any[] = [];

    if (type === 'movie') {
      const res = await fetch(`${TMDB_BASE}/search/movie?query=${encodeURIComponent(q)}&page=1`, { headers });
      const data = await res.json();
      results = (data.results || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        poster_path: item.poster_path,
        rating: item.vote_average,
        year: item.release_date?.slice(0, 4),
        media_type: 'movie',
      }));
    } else {
      // anime and show both search TV
      const res = await fetch(`${TMDB_BASE}/search/tv?query=${encodeURIComponent(q)}&page=1`, { headers });
      const data = await res.json();
      results = (data.results || []).map((item: any) => ({
        id: item.id,
        title: item.name,
        poster_path: item.poster_path,
        rating: item.vote_average,
        year: item.first_air_date?.slice(0, 4),
        media_type: type,
      }));
    }

    return NextResponse.json(results.slice(0, 20));
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
