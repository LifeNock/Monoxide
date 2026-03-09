import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
  const { data: roles } = await supabaseAdmin
    .from('roles')
    .select('*')
    .order('priority', { ascending: false });

  return NextResponse.json(roles || []);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const canManage = await hasPermission(user.id, 'manage_roles');
  if (!canManage) return NextResponse.json({ error: 'No permission' }, { status: 403 });

  const body = await request.json();

  const { data: role, error } = await supabaseAdmin
    .from('roles')
    .insert({
      name: body.name,
      color: body.color || '#8E8E8E',
      priority: body.priority || 0,
      permissions: body.permissions || {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(role);
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const canManage = await hasPermission(user.id, 'manage_roles');
  if (!canManage) return NextResponse.json({ error: 'No permission' }, { status: 403 });

  const body = await request.json();

  await supabaseAdmin
    .from('roles')
    .update({
      name: body.name,
      color: body.color,
      priority: body.priority,
      permissions: body.permissions,
    })
    .eq('id', body.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const canManage = await hasPermission(user.id, 'manage_roles');
  if (!canManage) return NextResponse.json({ error: 'No permission' }, { status: 403 });

  const { id } = await request.json();

  await supabaseAdmin
    .from('roles')
    .delete()
    .eq('id', id);

  return NextResponse.json({ ok: true });
}
