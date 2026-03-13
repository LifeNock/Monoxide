import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('watch_history')
    .select('*')
    .eq('user_id', user.id)
    .order('last_watched_at', { ascending: false })
    .limit(50);

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const {
    tmdb_id, media_type, title, poster_path,
    season, episode, episode_title,
    timestamp_seconds, duration_seconds, completed,
  } = body;

  if (!tmdb_id || !media_type || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('watch_history')
    .upsert({
      user_id: user.id,
      tmdb_id,
      media_type,
      title,
      poster_path: poster_path || null,
      season: season || null,
      episode: episode || null,
      episode_title: episode_title || null,
      timestamp_seconds: timestamp_seconds || 0,
      duration_seconds: duration_seconds || null,
      completed: completed || false,
      last_watched_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,tmdb_id,media_type,season,episode',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  return NextResponse.json(data);
}
