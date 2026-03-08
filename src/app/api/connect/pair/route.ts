import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - called by the agent on the user's home PC to complete pairing
export async function POST(request: NextRequest) {
  const { token, guacamole_url } = await request.json();

  if (!token || !guacamole_url) {
    return NextResponse.json({ error: 'Token and guacamole_url required' }, { status: 400 });
  }

  // Validate URL format
  try {
    new URL(guacamole_url);
  } catch {
    return NextResponse.json({ error: 'Invalid guacamole_url' }, { status: 400 });
  }

  // Find the machine by pairing token
  const { data: machine, error: findError } = await supabaseAdmin
    .from('machines')
    .select('id, paired')
    .eq('pairing_token', token)
    .single();

  if (findError || !machine) {
    return NextResponse.json({ error: 'Invalid pairing token' }, { status: 404 });
  }

  // Update machine with tunnel URL and mark as paired (allows re-pairing)
  const { error: updateError } = await supabaseAdmin
    .from('machines')
    .update({
      guacamole_url,
      paired: true,
      paired_at: machine.paired ? undefined : new Date().toISOString(),
      last_seen: new Date().toISOString(),
    })
    .eq('id', machine.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: 'Machine paired successfully' });
}
