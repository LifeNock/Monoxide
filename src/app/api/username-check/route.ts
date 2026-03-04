import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');

  if (!username || username.length < 3) {
    return NextResponse.json({ available: false, error: 'Username must be at least 3 characters' });
  }

  if (!/^[a-z0-9_-]+$/.test(username)) {
    return NextResponse.json({ available: false, error: 'Invalid characters' });
  }

  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .single();

  return NextResponse.json({ available: !data });
}
