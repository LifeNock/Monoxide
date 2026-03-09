import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

// GET - List all filtered words
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canManage = await hasPermission(user.id, 'manage_word_filter');
  if (!canManage) return NextResponse.json({ error: 'No permission' }, { status: 403 });

  const { data } = await supabaseAdmin
    .from('word_filter')
    .select('*')
    .order('created_at', { ascending: false });

  return NextResponse.json(data || []);
}

// POST - Add word to filter
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canManage = await hasPermission(user.id, 'manage_word_filter');
  if (!canManage) return NextResponse.json({ error: 'No permission' }, { status: 403 });

  const { word, replacement, action } = await request.json();
  if (!word) return NextResponse.json({ error: 'Word required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('word_filter')
    .insert({
      word: word.toLowerCase().trim(),
      replacement: replacement || '***',
      action: action || 'replace',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Word already filtered' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE - Remove word from filter
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canManage = await hasPermission(user.id, 'manage_word_filter');
  if (!canManage) return NextResponse.json({ error: 'No permission' }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await supabaseAdmin.from('word_filter').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
