import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json(settings || {});
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();

  await supabaseAdmin
    .from('user_settings')
    .upsert({
      user_id: user.id,
      theme: body.theme || 'carbon',
      font: body.font || 'barlow',
      panic_key: body.panicKey || '`',
      panic_url: body.panicUrl || 'https://www.google.com',
      about_blank_cloak: body.aboutBlankCloak || false,
      dms_enabled: body.dmsEnabled !== false,
    }, { onConflict: 'user_id' });

  return NextResponse.json({ ok: true });
}
