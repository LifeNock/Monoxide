import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

// GET - List user's conversations
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Get all conversations user is part of
  const { data: participations } = await supabaseAdmin
    .from('dm_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id);

  if (!participations || participations.length === 0) return NextResponse.json([]);

  const convIds = participations.map(p => p.conversation_id);
  const lastReadMap: Record<string, string> = {};
  participations.forEach(p => { lastReadMap[p.conversation_id] = p.last_read_at; });

  // Get conversation details
  const { data: conversations } = await supabaseAdmin
    .from('dm_conversations')
    .select('*')
    .in('id', convIds)
    .order('created_at', { ascending: false });

  if (!conversations) return NextResponse.json([]);

  // Get participants for each conversation
  const { data: allParticipants } = await supabaseAdmin
    .from('dm_participants')
    .select('conversation_id, user_id, user:profiles!user_id(username, display_name, avatar_url)')
    .in('conversation_id', convIds);

  // Get last message for each conversation
  const results = await Promise.all(conversations.map(async (conv) => {
    const participants = (allParticipants || [])
      .filter(p => p.conversation_id === conv.id)
      .map(p => ({
        user_id: p.user_id,
        username: (p.user as any)?.username,
        display_name: (p.user as any)?.display_name,
        avatar_url: (p.user as any)?.avatar_url,
      }));

    const { data: lastMsg } = await supabaseAdmin
      .from('dm_messages')
      .select('content, user_id, created_at, user:profiles!user_id(display_name)')
      .eq('conversation_id', conv.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Count unread messages
    const lastRead = lastReadMap[conv.id];
    const { count: unreadCount } = await supabaseAdmin
      .from('dm_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('is_deleted', false)
      .neq('user_id', user.id)
      .gt('created_at', lastRead);

    return {
      ...conv,
      participants,
      last_message: lastMsg ? {
        content: lastMsg.content,
        user_id: lastMsg.user_id,
        display_name: (lastMsg.user as any)?.display_name,
        created_at: lastMsg.created_at,
      } : null,
      unread_count: unreadCount || 0,
    };
  }));

  // Sort by last message time
  results.sort((a, b) => {
    const aTime = a.last_message?.created_at || a.created_at;
    const bTime = b.last_message?.created_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return NextResponse.json(results);
}

// POST - Create a conversation (DM or group)
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { userIds, name } = await request.json();
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: 'At least one user required' }, { status: 400 });
  }

  // Check DMs enabled for target users (1:1 DMs only)
  if (userIds.length === 1) {
    const { data: targetSettings } = await supabaseAdmin
      .from('user_settings')
      .select('dms_enabled')
      .eq('user_id', userIds[0])
      .single();

    if (targetSettings && targetSettings.dms_enabled === false) {
      return NextResponse.json({ error: 'This user has DMs disabled' }, { status: 403 });
    }

    // Check if DM already exists between these two users
    const { data: existing } = await supabaseAdmin
      .from('dm_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (existing) {
      for (const e of existing) {
        const { data: conv } = await supabaseAdmin
          .from('dm_conversations')
          .select('id, type')
          .eq('id', e.conversation_id)
          .eq('type', 'dm')
          .single();

        if (conv) {
          const { data: otherParticipant } = await supabaseAdmin
            .from('dm_participants')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .eq('user_id', userIds[0])
            .single();

          if (otherParticipant) {
            return NextResponse.json({ id: conv.id, existing: true });
          }
        }
      }
    }
  }

  const isGroup = userIds.length > 1;
  const allUserIds = [user.id, ...userIds.filter((id: string) => id !== user.id)];

  if (isGroup && allUserIds.length > 15) {
    return NextResponse.json({ error: 'Group chats limited to 15 users' }, { status: 400 });
  }

  // Create conversation
  const { data: conv, error } = await supabaseAdmin
    .from('dm_conversations')
    .insert({
      type: isGroup ? 'group' : 'dm',
      name: isGroup ? (name || 'Group Chat') : null,
      owner_id: isGroup ? user.id : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add participants
  const participants = allUserIds.map((uid: string) => ({
    conversation_id: conv.id,
    user_id: uid,
  }));

  await supabaseAdmin.from('dm_participants').insert(participants);

  return NextResponse.json({ id: conv.id, existing: false });
}
