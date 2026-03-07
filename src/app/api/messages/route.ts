import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const channelId = request.nextUrl.searchParams.get('channelId');
  if (!channelId) return NextResponse.json([]);

  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select(`
      *,
      user:profiles!user_id(username, display_name, avatar_url, pronouns)
    `)
    .eq('channel_id', channelId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(100);

  if (!messages) return NextResponse.json([]);

  // Get top role for each unique user
  const userIds = Array.from(new Set(messages.map((m: any) => m.user_id).filter(Boolean)));
  const roleMap: Record<string, { name: string; color: string }> = {};

  for (const uid of userIds) {
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role:roles(name, color, priority)')
      .eq('user_id', uid)
      .order('role(priority)', { ascending: false })
      .limit(1)
      .single();

    if (userRole?.role) {
      roleMap[uid as string] = userRole.role as any;
    }
  }

  const flat = messages.map((m: any) => ({
    ...m,
    username: m.user?.username,
    display_name: m.user?.display_name,
    avatar_url: m.user?.avatar_url,
    pronouns: m.user?.pronouns,
    role_name: roleMap[m.user_id]?.name || null,
    role_color: roleMap[m.user_id]?.color || null,
    user: undefined,
  }));

  return NextResponse.json(flat);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { channelId, content, replyTo, imageUrl } = await request.json();
  if (!channelId || (!content?.trim() && !imageUrl)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (content && content.length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  // Check word filter
  const { data: filterWords } = await supabaseAdmin.from('word_filter').select('word');
  if (filterWords && content) {
    const lower = content.toLowerCase();
    for (const fw of filterWords) {
      if (lower.includes(fw.word.toLowerCase())) {
        return NextResponse.json({ error: 'Message contains a filtered word' }, { status: 400 });
      }
    }
  }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      channel_id: channelId,
      user_id: user.id,
      content: (content || '').trim(),
      image_url: imageUrl || null,
      reply_to: replyTo || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  // Get user profile and role for the response
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('username, display_name, avatar_url, pronouns')
    .eq('id', user.id)
    .single();

  const { data: userRole } = await supabaseAdmin
    .from('user_roles')
    .select('role:roles(name, color, priority)')
    .eq('user_id', user.id)
    .order('role(priority)', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    ...message,
    username: profile?.username,
    display_name: profile?.display_name,
    avatar_url: profile?.avatar_url,
    pronouns: profile?.pronouns,
    role_name: (userRole?.role as any)?.name || null,
    role_color: (userRole?.role as any)?.color || null,
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { messageId } = await request.json();

  await supabaseAdmin
    .from('messages')
    .update({ is_deleted: true })
    .eq('id', messageId)
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true });
}
