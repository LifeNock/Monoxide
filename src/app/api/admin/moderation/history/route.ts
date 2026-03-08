import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canBan = await hasPermission(user.id, 'ban_users');
  if (!canBan) return NextResponse.json({ error: 'No permission' }, { status: 403 });

  const username = request.nextUrl.searchParams.get('username');

  let query = supabaseAdmin
    .from('user_bans')
    .select(`
      *,
      user:profiles!user_id(username, display_name, avatar_url),
      moderator:profiles!banned_by(username, display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (username) {
    // Look up user ID first
    const { data: target } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (!target) return NextResponse.json([]);
    query = query.eq('user_id', target.id);
  }

  const { data } = await query;
  return NextResponse.json(data || []);
}
