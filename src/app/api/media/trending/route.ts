import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TOKEN = process.env.TMDB_READ_TOKEN!;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') || 'anime';

  try {
    let results: any[] = [];

    if (type === 'anime') {
      // Anime = TV shows with genre 16 (Animation) from Japan
      const res = await fetch(
        `${TMDB_BASE}/discover/tv?with_genres=16&with_origin_country=JP&sort_by=popularity.desc&page=1`,
        { headers }
      );
      const data = await res.json();
      results = (data.results || []).map((item: any) => ({
        id: item.id,
        title: item.name || item.title,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        rating: item.vote_average,
        year: item.first_air_date?.slice(0, 4),
        media_type: 'anime',
      }));
    } else if (type === 'movie') {
      const res = await fetch(`${TMDB_BASE}/trending/movie/week`, { headers });
      const data = await res.json();
      results = (data.results || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        rating: item.vote_average,
        year: item.release_date?.slice(0, 4),
        media_type: 'movie',
      }));
    } else if (type === 'show') {
      const res = await fetch(`${TMDB_BASE}/trending/tv/week`, { headers });
      const data = await res.json();
      results = (data.results || [])
        .filter((item: any) => {
          // Exclude anime (JP animation)
          return !(item.origin_country?.includes('JP') && item.genre_ids?.includes(16));
        })
        .map((item: any) => ({
          id: item.id,
          title: item.name,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          rating: item.vote_average,
          year: item.first_air_date?.slice(0, 4),
          media_type: 'show',
        }));
    }

    return NextResponse.json(results.slice(0, 20));
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch trending' }, { status: 500 });
  }
}
