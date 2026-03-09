import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

// PATCH - Update group chat name/icon
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { conversationId, name, iconUrl } = await request.json();
  if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

  // Verify owner
  const { data: conv } = await supabaseAdmin
    .from('dm_conversations')
    .select('id, owner_id, type')
    .eq('id', conversationId)
    .single();

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (conv.type !== 'group') return NextResponse.json({ error: 'Can only update group chats' }, { status: 400 });
  if (conv.owner_id !== user.id) return NextResponse.json({ error: 'Only the owner can update' }, { status: 403 });

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name.trim().slice(0, 50) || 'Group Chat';
  if (iconUrl !== undefined) updates.icon_url = iconUrl;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  await supabaseAdmin
    .from('dm_conversations')
    .update(updates)
    .eq('id', conversationId);

  return NextResponse.json({ ok: true });
}
