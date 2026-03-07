import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username, displayName, bio, pronouns, newsletter } = await request.json();

    if (!email || !password || !username || !displayName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (username.length < 3 || !/^[a-z0-9_-]+$/.test(username)) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    // Check username uniqueness
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Sign up with Supabase Auth
    const supabase = createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName },
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Email already taken' }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user!.id;

    // Create profile
    await supabaseAdmin.from('profiles').insert({
      id: userId,
      email,
      username,
      display_name: displayName,
      bio: bio || '',
      pronouns: pronouns || '',
    });

    // Create default settings
    await supabaseAdmin.from('user_settings').insert({ user_id: userId });

    // Assign @everyone role
    const { data: everyoneRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', '@everyone')
      .single();

    if (everyoneRole) {
      await supabaseAdmin.from('user_roles').insert({
        user_id: userId,
        role_id: everyoneRole.id,
      });
    }

    // Newsletter
    if (newsletter) {
      await supabaseAdmin.from('newsletter_emails').insert({
        email,
        user_id: userId,
      });
    }

    return NextResponse.json({
      user: { id: userId, email, username, display_name: displayName },
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 });
  }
}
