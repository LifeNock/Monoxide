import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ banned: false });

  // Check for active bans on this user
  const { data: bans } = await supabaseAdmin
    .from('user_bans')
    .select('id, ban_type, reason, expires_at, created_at')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (!bans || bans.length === 0) {
    return NextResponse.json({ banned: false });
  }

  // Filter out expired temporary bans and deactivate them
  const activeBans = [];
  for (const ban of bans) {
    if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
      // Expired — deactivate it
      await supabaseAdmin
        .from('user_bans')
        .update({ is_active: false })
        .eq('id', ban.id);
    } else {
      activeBans.push(ban);
    }
  }

  if (activeBans.length === 0) {
    return NextResponse.json({ banned: false });
  }

  // Return the most severe ban
  const ban = activeBans[0];
  return NextResponse.json({
    banned: true,
    banType: ban.ban_type,
    reason: ban.reason,
    expiresAt: ban.expires_at,
  });
}
