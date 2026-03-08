import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// POST - authenticate with Guacamole and return auth token + client URL
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { machineId } = await request.json();

  // Verify user owns this machine
  const { data: machine } = await supabaseAdmin
    .from('machines')
    .select('id, guacamole_url, pairing_token, user_id')
    .eq('id', machineId)
    .eq('user_id', user.id)
    .eq('paired', true)
    .single();

  if (!machine) {
    return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
  }

  try {
    // Authenticate with Guacamole REST API
    const authRes = await fetch(`${machine.guacamole_url}api/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=monoxide&password=${encodeURIComponent(machine.pairing_token)}`,
    });

    if (!authRes.ok) {
      return NextResponse.json({ error: 'Guacamole auth failed' }, { status: 502 });
    }

    const authData = await authRes.json();
    // authData contains: { authToken, username, dataSource, availableDataSources }

    return NextResponse.json({
      token: authData.authToken,
      dataSource: authData.dataSource,
    });
  } catch (err: any) {
    console.error('Guacamole session error:', err);
    return NextResponse.json({ error: 'Could not reach Guacamole' }, { status: 502 });
  }
}
