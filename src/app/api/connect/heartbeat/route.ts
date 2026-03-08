import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - called periodically by the agent to signal the machine is online
export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('machines')
    .update({ last_seen: new Date().toISOString() })
    .eq('pairing_token', token)
    .eq('paired', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
