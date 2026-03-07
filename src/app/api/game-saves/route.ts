import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Increase body size limit for game save uploads
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// GET /api/game-saves?gameId=xxx - Load game saves (all slots)
// GET /api/game-saves?gameId=xxx&slot=1 - Load a specific slot
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gameId = req.nextUrl.searchParams.get('gameId');
  if (!gameId) return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });

  const slot = req.nextUrl.searchParams.get('slot');

  if (slot) {
    // Load a specific slot
    const { data } = await supabaseAdmin
      .from('game_saves')
      .select('slot, slot_name, save_data, updated_at')
      .eq('user_id', user.id)
      .eq('game_id', gameId)
      .eq('slot', parseInt(slot))
      .single();

    return NextResponse.json({ save: data || null });
  }

  // Load all slots for this game (metadata only, no save_data for listing)
  const { data: saves } = await supabaseAdmin
    .from('game_saves')
    .select('slot, slot_name, updated_at')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .order('slot', { ascending: true });

  return NextResponse.json({ saves: saves || [] });
}

// POST /api/game-saves - Save game state to a slot
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch (parseError: any) {
    console.error('Body parse error:', parseError.message);
    return NextResponse.json({ error: `Body too large or invalid: ${parseError.message}` }, { status: 413 });
  }
  const { gameId, gameName, saveData, slot = 1, slotName } = body;

  if (!gameId || !saveData) {
    return NextResponse.json({ error: 'Missing gameId or saveData' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('game_saves')
    .upsert({
      user_id: user.id,
      game_id: String(gameId),
      game_name: gameName || 'Unknown',
      slot: slot,
      slot_name: slotName || `Save ${slot}`,
      save_data: saveData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,game_id,slot' });

  if (error) {
    console.error('Game save error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save', details: error.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/game-saves?gameId=xxx&slot=1 - Delete a save slot
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gameId = req.nextUrl.searchParams.get('gameId');
  const slot = req.nextUrl.searchParams.get('slot');
  if (!gameId || !slot) return NextResponse.json({ error: 'Missing gameId or slot' }, { status: 400 });

  await supabaseAdmin
    .from('game_saves')
    .delete()
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .eq('slot', parseInt(slot));

  return NextResponse.json({ ok: true });
}
