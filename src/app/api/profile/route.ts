import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, pronouns, banner_color, banner_url, created_at')
    .eq('username', username)
    .single();

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get badges
  const { data: badges } = await supabaseAdmin
    .from('user_badges')
    .select('badge:badges(*)')
    .eq('user_id', profile.id);

  // Get roles
  const { data: roles } = await supabaseAdmin
    .from('user_roles')
    .select('role:roles(*)')
    .eq('user_id', profile.id)
    .order('role(priority)', { ascending: false });

  return NextResponse.json({
    profile,
    badges: badges?.map((b: any) => b.badge) || [],
    roles: roles?.map((r: any) => r.role) || [],
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { displayName, bio, pronouns, bannerColor, avatarUrl, bannerUrl } = await request.json();

  const updates: Record<string, any> = {};
  if (displayName !== undefined) updates.display_name = displayName;
  if (bio !== undefined) updates.bio = bio;
  if (pronouns !== undefined) updates.pronouns = pronouns;
  if (bannerColor !== undefined) updates.banner_color = bannerColor;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
  if (bannerUrl !== undefined) updates.banner_url = bannerUrl;

  await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
