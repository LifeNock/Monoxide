import { NextRequest, NextResponse } from 'next/server';

const CONSUMET_URL = process.env.CONSUMET_API_URL || 'http://localhost:3000';
const TMDB_TOKEN = process.env.TMDB_READ_TOKEN;

// Returns anikai.to watch page URL for the anime episode.
// anikai.to has no X-Frame-Options so it embeds cleanly.
// The player has its own sub/dub toggle — we pass the preference via hash.
async function getAnimeEmbed(tmdbId: string, episodeNum: number, dub: boolean): Promise<string | null> {
  try {
    // 1. Get anime title from TMDB
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?language=en-US`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!tmdbRes.ok) return null;
    const tmdbData = await tmdbRes.json();
    const title: string = tmdbData.name || tmdbData.original_name;
    if (!title) return null;

    // 2. Search animekai for the title
    const searchRes = await fetch(
      `${CONSUMET_URL}/anime/animekai/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const results: any[] = searchData.results || [];
    if (!results.length) return null;

    // 3. Pick best match — prefer one with dub episodes if dub requested
    const match = dub
      ? (results.find((r: any) => r.dub > 0) || results[0])
      : results[0];

    // 4. Return the anikai.to watch page — it has sub/dub toggle built in
    return `https://anikai.to/watch/${match.id}#ep=${episodeNum}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  const id = request.nextUrl.searchParams.get('id');
  const season = request.nextUrl.searchParams.get('s') || '1';
  const episode = request.nextUrl.searchParams.get('e') || '1';
  const dub = request.nextUrl.searchParams.get('dub') === '1';

  if (!type || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const vidlink = 'https://vidlink.pro';
  const vlParams = `autoplay=true&multiLang=true${dub ? '&dubbed=true' : ''}`;

  if (type === 'movie') {
    return NextResponse.json({
      type: 'embed',
      url: `${vidlink}/movie/${id}?${vlParams}`,
    });
  }

  if (type === 'show') {
    return NextResponse.json({
      type: 'embed',
      url: `${vidlink}/tv/${id}/${season}/${episode}?${vlParams}`,
    });
  }

  if (type === 'anime') {
    // Always try anikai.to — it has built-in sub/dub toggle
    const embedUrl = await getAnimeEmbed(id, parseInt(episode), dub);
    if (embedUrl) {
      return NextResponse.json({ type: 'embed', url: embedUrl, provider: 'anikai' });
    }
    // Fallback to vidlink if Consumet fails
    return NextResponse.json({
      type: 'embed',
      url: `${vidlink}/tv/${id}/${season}/${episode}?${vlParams}`,
    });
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
}
