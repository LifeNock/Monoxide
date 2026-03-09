import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

// GET - List blacklisted domains
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canBan = await hasPermission(user.id, 'ban_users');
  if (!canBan) return NextResponse.json({ error: 'No permission' }, { status: 403 });

  const { data } = await supabaseAdmin
    .from('email_blacklist')
    .select('*')
    .order('created_at', { ascending: false });

  return NextResponse.json(data || []);
}

// POST - Add domain to blacklist
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canBan = await hasPermission(user.id, 'ban_users');
  if (!canBan) return NextResponse.json({ error: 'No permission' }, { status: 403 });

  const { domain, reason } = await request.json();
  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 });

  const cleanDomain = domain.toLowerCase().replace(/^@/, '').trim();
  if (!cleanDomain || !cleanDomain.includes('.')) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('email_blacklist')
    .insert({
      domain: cleanDomain,
      reason: reason || '',
      added_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Domain already blacklisted' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE - Remove domain from blacklist
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canBan = await hasPermission(user.id, 'ban_users');
  if (!canBan) return NextResponse.json({ error: 'No permission' }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await supabaseAdmin.from('email_blacklist').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
