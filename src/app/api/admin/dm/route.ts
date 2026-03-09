import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Admin: search/view DM conversations and messages
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canBan = await hasPermission(user.id, 'ban_users');
  if (!canBan) return NextResponse.json({ error: 'No permission' }, { status: 403 });

  const searchQuery = request.nextUrl.searchParams.get('q');
  const conversationId = request.nextUrl.searchParams.get('conversationId');
  const username = request.nextUrl.searchParams.get('username');

  // View messages in a specific conversation
  if (conversationId) {
    const { data: conv } = await supabaseAdmin
      .from('dm_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: participants } = await supabaseAdmin
      .from('dm_participants')
      .select('user_id, user:profiles!user_id(username, display_name, avatar_url)')
      .eq('conversation_id', conversationId);

    const { data: messages } = await supabaseAdmin
      .from('dm_messages')
      .select('*, user:profiles!user_id(username, display_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);

    return NextResponse.json({
      conversation: conv,
      participants: (participants || []).map(p => ({
        user_id: p.user_id,
        username: (p.user as any)?.username,
        display_name: (p.user as any)?.display_name,
        avatar_url: (p.user as any)?.avatar_url,
      })),
      messages: (messages || []).map(m => ({
        ...m,
        username: (m as any).user?.username,
        display_name: (m as any).user?.display_name,
        avatar_url: (m as any).user?.avatar_url,
        user: undefined,
      })),
    });
  }

  // Search messages by content
  if (searchQuery) {
    const { data: messages } = await supabaseAdmin
      .from('dm_messages')
      .select('*, conversation:dm_conversations!conversation_id(id, type, name), user:profiles!user_id(username, display_name)')
      .ilike('content', `%${searchQuery}%`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json(
      (messages || []).map(m => ({
        ...m,
        username: (m as any).user?.username,
        display_name: (m as any).user?.display_name,
        conversation_type: (m as any).conversation?.type,
        conversation_name: (m as any).conversation?.name,
        user: undefined,
        conversation: undefined,
      }))
    );
  }

  // Search conversations by username
  if (username) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('username', `%${username}%`)
      .limit(1)
      .single();

    if (!profile) return NextResponse.json([]);

    const { data: participations } = await supabaseAdmin
      .from('dm_participants')
      .select('conversation_id')
      .eq('user_id', profile.id);

    if (!participations || participations.length === 0) return NextResponse.json([]);

    const convIds = participations.map(p => p.conversation_id);
    const { data: conversations } = await supabaseAdmin
      .from('dm_conversations')
      .select('*')
      .in('id', convIds)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get participants for each
    const results = await Promise.all((conversations || []).map(async (conv) => {
      const { data: parts } = await supabaseAdmin
        .from('dm_participants')
        .select('user:profiles!user_id(username, display_name)')
        .eq('conversation_id', conv.id);

      return {
        ...conv,
        participants: (parts || []).map(p => ({
          username: (p.user as any)?.username,
          display_name: (p.user as any)?.display_name,
        })),
      };
    }));

    return NextResponse.json(results);
  }

  return NextResponse.json([]);
}
