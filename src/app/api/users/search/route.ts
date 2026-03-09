import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const q = request.nextUrl.searchParams.get('q');
  if (!q || q.length < 2) return NextResponse.json([]);

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .neq('id', user.id)
    .limit(10);

  return NextResponse.json(data || []);
}
