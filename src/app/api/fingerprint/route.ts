import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

// POST - Store the user's browser fingerprint
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { fingerprint } = await request.json();
  if (!fingerprint || typeof fingerprint !== 'string') {
    return NextResponse.json({ error: 'Invalid fingerprint' }, { status: 400 });
  }

  // Update the user's fingerprint
  await supabaseAdmin
    .from('profiles')
    .update({ fingerprint })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
