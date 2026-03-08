import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

// NOTE: Run supabase-bans-migration.sql in Supabase dashboard before using this API

// GET - List all active bans
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canBan = await hasPermission(user.id, 'ban_users');
  const canKick = await hasPermission(user.id, 'kick_users');
  if (!canBan && !canKick) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { data: bans, error } = await supabaseAdmin
    .from('user_bans')
    .select(`
      *,
      user:profiles!user_id(username, display_name, avatar_url),
      moderator:profiles!banned_by(username, display_name)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(bans || []);
}

// POST - Create a ban/timeout
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canBan = await hasPermission(user.id, 'ban_users');
  if (!canBan) {
    return NextResponse.json({ error: 'No permission to ban users' }, { status: 403 });
  }

  const { username, banType, reason, duration, hwid, ipAddress } = await request.json();

  if (!username || !banType) {
    return NextResponse.json({ error: 'Username and ban type required' }, { status: 400 });
  }

  // Look up the target user (include fingerprint for HWID bans)
  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('id, username, fingerprint')
    .eq('username', username)
    .single();

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Prevent banning yourself
  if (target.id === user.id) {
    return NextResponse.json({ error: 'Cannot ban yourself' }, { status: 400 });
  }

  // Prevent banning hardcoded admins
  if (['lifenock'].includes(target.username.toLowerCase())) {
    return NextResponse.json({ error: 'Cannot ban this user' }, { status: 403 });
  }

  // For HWID bans, auto-fill from user's stored fingerprint if not provided
  let resolvedHwid = hwid || null;
  if (banType === 'hwid') {
    resolvedHwid = hwid || target.fingerprint || null;
    if (!resolvedHwid) {
      return NextResponse.json({ error: 'No HWID available for this user. They may not have logged in yet.' }, { status: 400 });
    }
  }

  // Calculate expiry for temporary bans
  let expiresAt = null;
  if (banType === 'temporary' && duration) {
    const now = new Date();
    const ms = parseDuration(duration);
    if (ms > 0) {
      expiresAt = new Date(now.getTime() + ms).toISOString();
    }
  }

  const { data: ban, error } = await supabaseAdmin
    .from('user_bans')
    .insert({
      user_id: target.id,
      banned_by: user.id,
      ban_type: banType,
      reason: reason || '',
      hwid: banType === 'hwid' ? resolvedHwid : null,
      ip_address: banType === 'ip' ? (ipAddress || null) : null,
      expires_at: expiresAt,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(ban);
}

// DELETE - Revoke a ban
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canBan = await hasPermission(user.id, 'ban_users');
  if (!canBan) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { banId } = await request.json();
  if (!banId) return NextResponse.json({ error: 'Ban ID required' }, { status: 400 });

  await supabaseAdmin
    .from('user_bans')
    .update({ is_active: false })
    .eq('id', banId);

  return NextResponse.json({ ok: true });
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)\s*(m|h|d|w)$/i);
  if (!match) return 0;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    case 'w': return num * 7 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}
