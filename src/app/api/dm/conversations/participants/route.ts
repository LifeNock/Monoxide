import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

// POST - Add user to group chat
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { conversationId, userId } = await request.json();
  if (!conversationId || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { data: conv } = await supabaseAdmin
    .from('dm_conversations')
    .select('id, owner_id, type')
    .eq('id', conversationId)
    .single();

  if (!conv || conv.type !== 'group') return NextResponse.json({ error: 'Not a group chat' }, { status: 400 });
  if (conv.owner_id !== user.id) return NextResponse.json({ error: 'Only the owner can add users' }, { status: 403 });

  // Check participant limit
  const { count } = await supabaseAdmin
    .from('dm_participants')
    .select('user_id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  if ((count || 0) >= 15) return NextResponse.json({ error: 'Group chat is full (15 max)' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('dm_participants')
    .insert({ conversation_id: conversationId, user_id: userId });

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'User already in group' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE - Remove (kick) user from group chat
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { conversationId, userId } = await request.json();
  if (!conversationId || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { data: conv } = await supabaseAdmin
    .from('dm_conversations')
    .select('id, owner_id, type')
    .eq('id', conversationId)
    .single();

  if (!conv || conv.type !== 'group') return NextResponse.json({ error: 'Not a group chat' }, { status: 400 });
  if (conv.owner_id !== user.id) return NextResponse.json({ error: 'Only the owner can kick users' }, { status: 403 });
  if (userId === user.id) return NextResponse.json({ error: 'Cannot kick yourself' }, { status: 400 });

  await supabaseAdmin
    .from('dm_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  return NextResponse.json({ ok: true });
}
