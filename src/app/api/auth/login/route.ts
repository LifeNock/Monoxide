import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Support login by username or email
    let loginEmail = email;
    if (!email.includes('@')) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('username', email)
        .single();

      if (!profile) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      loginEmail = profile.email;
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      // Check if the error is due to unconfirmed email
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return NextResponse.json({
          error: 'Please confirm your email before signing in.',
          code: 'EMAIL_NOT_CONFIRMED',
          email: loginEmail,
        }, { status: 403 });
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, display_name')
      .eq('id', data.user.id)
      .single();

    return NextResponse.json({ user: profile });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
