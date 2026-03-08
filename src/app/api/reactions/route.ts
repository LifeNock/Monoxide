import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

// GET reactions for a message
export async function GET(request: NextRequest) {
  const messageId = request.nextUrl.searchParams.get('messageId');
  if (!messageId) return NextResponse.json([]);

  const user = await getAuthUser();
  const userId = user?.id;

  const { data: reactions } = await supabaseAdmin
    .from('message_reactions')
    .select('emoji_id, user_id')
    .eq('message_id', messageId);

  if (!reactions) return NextResponse.json([]);

  // Group by emoji
  const grouped: Record<string, { emoji_id: string; count: number; user_reacted: boolean }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji_id]) {
      grouped[r.emoji_id] = { emoji_id: r.emoji_id, count: 0, user_reacted: false };
    }
    grouped[r.emoji_id].count++;
    if (userId && r.user_id === userId) grouped[r.emoji_id].user_reacted = true;
  }

  return NextResponse.json(Object.values(grouped));
}

// Toggle a reaction
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { messageId, emoji } = await request.json();
  if (!messageId || !emoji) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  // Check if already reacted
  const { data: existing } = await supabaseAdmin
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji_id', emoji)
    .single();

  if (existing) {
    // Remove reaction
    await supabaseAdmin
      .from('message_reactions')
      .delete()
      .eq('id', existing.id);
    return NextResponse.json({ action: 'removed', emoji });
  } else {
    // Add reaction
    await supabaseAdmin
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: user.id, emoji_id: emoji });
    return NextResponse.json({ action: 'added', emoji });
  }
}
