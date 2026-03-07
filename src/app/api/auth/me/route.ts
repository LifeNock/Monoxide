import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ user: null });
  }

  const { data: user } = await supabaseAdmin
    .from('profiles')
    .select('id, email, username, display_name, avatar_url, bio, pronouns, banner_color, banner_url, created_at')
    .eq('id', authUser.id)
    .single();

  if (!user) {
    return NextResponse.json({ user: null });
  }

  // Get settings
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const isAdmin = ['lifenock'].includes(user.username.toLowerCase());

  return NextResponse.json({ user, settings, isAdmin });
}
