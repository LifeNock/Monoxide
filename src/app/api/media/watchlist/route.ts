import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { tmdb_id, media_type, title, poster_path, action } = await request.json();

  if (action === 'remove') {
    await supabaseAdmin
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('tmdb_id', tmdb_id)
      .eq('media_type', media_type);
    return NextResponse.json({ ok: true });
  }

  const { data, error } = await supabaseAdmin
    .from('watchlist')
    .upsert({ user_id: user.id, tmdb_id, media_type, title, poster_path }, {
      onConflict: 'user_id,tmdb_id,media_type',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  return NextResponse.json(data);
}
