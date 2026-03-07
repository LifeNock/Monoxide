import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

const ADMIN_USERNAMES = ['lifenock'];

function isAdmin(username: string): boolean {
  return ADMIN_USERNAMES.includes(username.toLowerCase());
}

export async function GET(request: NextRequest) {
  const roleId = request.nextUrl.searchParams.get('roleId');
  if (!roleId) return NextResponse.json([]);

  const { data: members } = await supabaseAdmin
    .from('user_roles')
    .select('user:profiles!user_id(id, username, display_name, avatar_url)')
    .eq('role_id', roleId);

  return NextResponse.json(members?.map((m: any) => m.user) || []);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isAdmin(user.username)) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const { userId, username, roleId } = await request.json();

  let targetUserId = userId;
  if (!targetUserId && username) {
    const { data: target } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    targetUserId = target.id;
  }

  if (!targetUserId || !roleId) return NextResponse.json({ error: 'Missing userId/username and roleId' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id: targetUserId, role_id: roleId }, { onConflict: 'user_id,role_id' });

  if (error) return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!isAdmin(user.username)) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const { userId, roleId } = await request.json();
  if (!userId || !roleId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId);

  return NextResponse.json({ ok: true });
}
