import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

// GET - Fetch messages for a conversation
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const conversationId = request.nextUrl.searchParams.get('conversationId');
  if (!conversationId) return NextResponse.json([]);

  // Verify user is a participant
  const { data: participant } = await supabaseAdmin
    .from('dm_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (!participant) return NextResponse.json({ error: 'Not a participant' }, { status: 403 });

  const { data: messages } = await supabaseAdmin
    .from('dm_messages')
    .select('*, user:profiles!user_id(username, display_name, avatar_url, pronouns)')
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(200);

  if (!messages) return NextResponse.json([]);

  // Get roles for users
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
    if (userRole?.role) roleMap[uid as string] = userRole.role as any;
  }

  // Reply previews
  const replyIds = messages.map((m: any) => m.reply_to).filter(Boolean);
  const replyMap: Record<string, any> = {};
  if (replyIds.length > 0) {
    const { data: replyMsgs } = await supabaseAdmin
      .from('dm_messages')
      .select('id, content, user:profiles!user_id(username, display_name)')
      .in('id', replyIds);
    if (replyMsgs) {
      for (const rm of replyMsgs) {
        replyMap[rm.id] = {
          content: (rm as any).content || '',
          display_name: (rm as any).user?.display_name || 'Unknown',
          username: (rm as any).user?.username || '',
        };
      }
    }
  }

  // Update last_read_at
  await supabaseAdmin
    .from('dm_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  const flat = messages.map((m: any) => ({
    ...m,
    username: m.user?.username,
    display_name: m.user?.display_name,
    avatar_url: m.user?.avatar_url,
    pronouns: m.user?.pronouns,
    role_name: roleMap[m.user_id]?.name || null,
    role_color: roleMap[m.user_id]?.color || null,
    reply_to_message: m.reply_to ? replyMap[m.reply_to] || null : null,
    user: undefined,
  }));

  return NextResponse.json(flat);
}

// POST - Send a message
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { conversationId, content, replyTo, imageUrl } = await request.json();
  if (!conversationId || (!content?.trim() && !imageUrl)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (content && content.length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  // Verify participant
  const { data: participant } = await supabaseAdmin
    .from('dm_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (!participant) return NextResponse.json({ error: 'Not a participant' }, { status: 403 });

  // Word filter
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
    .from('dm_messages')
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      content: (content || '').trim(),
      image_url: imageUrl || null,
      reply_to: replyTo || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to send' }, { status: 500 });

  // Get profile and role
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

  let reply_to_message = null;
  if (replyTo) {
    const { data: replyMsg } = await supabaseAdmin
      .from('dm_messages')
      .select('id, content, user:profiles!user_id(username, display_name)')
      .eq('id', replyTo)
      .single();
    if (replyMsg) {
      reply_to_message = {
        content: (replyMsg as any).content || '',
        display_name: (replyMsg as any).user?.display_name || 'Unknown',
        username: (replyMsg as any).user?.username || '',
      };
    }
  }

  // Parse mentions from content
  if (content) {
    const mentionRegex = /@(\w+)/g;
    let match;
    const mentionedUsernames = new Set<string>();
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionedUsernames.add(match[1].toLowerCase());
    }

    if (mentionedUsernames.size > 0) {
      // Get participant user IDs for mentioned users
      const { data: participants } = await supabaseAdmin
        .from('dm_participants')
        .select('user_id, user:profiles!user_id(username)')
        .eq('conversation_id', conversationId);

      if (participants) {
        const mentionInserts = participants
          .filter(p => p.user_id !== user.id && mentionedUsernames.has((p.user as any)?.username?.toLowerCase()))
          .map(p => ({
            user_id: p.user_id,
            dm_message_id: message.id,
            conversation_id: conversationId,
          }));

        if (mentionInserts.length > 0) {
          await supabaseAdmin.from('mentions').insert(mentionInserts);
        }
      }
    }
  }

  return NextResponse.json({
    ...message,
    username: profile?.username,
    display_name: profile?.display_name,
    avatar_url: profile?.avatar_url,
    pronouns: profile?.pronouns,
    role_name: (userRole?.role as any)?.name || null,
    role_color: (userRole?.role as any)?.color || null,
    reply_to_message,
  });
}

// DELETE - Delete a message
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { messageId } = await request.json();
  if (!messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });

  const { data: message } = await supabaseAdmin
    .from('dm_messages')
    .select('id, user_id, conversation_id')
    .eq('id', messageId)
    .single();

  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (message.user_id !== user.id) {
    return NextResponse.json({ error: 'Can only delete your own messages' }, { status: 403 });
  }

  await supabaseAdmin
    .from('dm_messages')
    .update({ is_deleted: true })
    .eq('id', messageId);

  return NextResponse.json({ ok: true, messageId, conversationId: message.conversation_id });
}
