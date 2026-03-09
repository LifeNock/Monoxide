import { createSupabaseServerClient } from './supabase-server';
import { supabaseAdmin } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, display_name')
      .eq('id', user.id)
      .single();

    return profile || null;
  } catch {
    return null;
  }
}
