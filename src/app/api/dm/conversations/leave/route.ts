import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

// POST - Leave a group chat
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { conversationId } = await request.json();
  if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

  const { data: conv } = await supabaseAdmin
    .from('dm_conversations')
    .select('id, owner_id, type')
    .eq('id', conversationId)
    .single();

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Remove participant
  await supabaseAdmin
    .from('dm_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  // If owner leaves a group, transfer ownership to next participant
  if (conv.type === 'group' && conv.owner_id === user.id) {
    const { data: nextOwner } = await supabaseAdmin
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .limit(1)
      .single();

    if (nextOwner) {
      await supabaseAdmin
        .from('dm_conversations')
        .update({ owner_id: nextOwner.user_id })
        .eq('id', conversationId);
    } else {
      // No participants left, delete conversation
      await supabaseAdmin.from('dm_conversations').delete().eq('id', conversationId);
    }
  }

  return NextResponse.json({ ok: true });
}
