import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TOKEN = process.env.TMDB_READ_TOKEN!;
const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

export async function GET(request: NextRequest) {
  const tmdbId = request.nextUrl.searchParams.get('id');
  const type = request.nextUrl.searchParams.get('type'); // movie | show | anime

  if (!tmdbId || !type) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  try {
    if (type === 'movie') {
      const res = await fetch(`${TMDB_BASE}/movie/${tmdbId}?append_to_response=credits`, { headers });
      const data = await res.json();
      return NextResponse.json({
        id: data.id,
        title: data.title,
        overview: data.overview,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        rating: data.vote_average,
        year: data.release_date?.slice(0, 4),
        runtime: data.runtime,
        genres: data.genres?.map((g: any) => g.name) || [],
        media_type: 'movie',
      });
    } else {
      // show or anime
      const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}?append_to_response=credits`, { headers });
      const data = await res.json();

      // Fetch all seasons (excluding specials season 0)
      const seasons = (data.seasons || [])
        .filter((s: any) => s.season_number > 0 && s.episode_count > 0)
        .map((s: any) => ({
          season_number: s.season_number,
          name: s.name,
          episode_count: s.episode_count,
          poster_path: s.poster_path,
        }));

      return NextResponse.json({
        id: data.id,
        title: data.name,
        overview: data.overview,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        rating: data.vote_average,
        year: data.first_air_date?.slice(0, 4),
        seasons,
        genres: data.genres?.map((g: any) => g.name) || [],
        media_type: type,
      });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
  }
}
