import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

// GET - Get unread mention count
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ count: 0 });

  const { count } = await supabaseAdmin
    .from('mentions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return NextResponse.json({ count: count || 0 });
}

// POST - Mark mentions as read
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { mentionIds, channelId, conversationId } = await request.json();

  if (mentionIds && Array.isArray(mentionIds)) {
    await supabaseAdmin
      .from('mentions')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .in('id', mentionIds);
  } else if (channelId) {
    await supabaseAdmin
      .from('mentions')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('channel_id', channelId)
      .eq('is_read', false);
  } else if (conversationId) {
    await supabaseAdmin
      .from('mentions')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('conversation_id', conversationId)
      .eq('is_read', false);
  }

  return NextResponse.json({ ok: true });
}
