import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { signToken, COOKIE_NAME } from '@/lib/auth';

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

    const db = getDb();

    // Check uniqueness
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
      return NextResponse.json({ error: 'Email or username already taken' }, { status: 409 });
    }

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, username, display_name, bio, pronouns)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, email, passwordHash, username, displayName, bio || '', pronouns || '');

    // Create default settings
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(id);

    // Assign @everyone role
    const everyoneRole = db.prepare("SELECT id FROM roles WHERE name = '@everyone'").get() as any;
    if (everyoneRole) {
      db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(id, everyoneRole.id);
    }

    // Newsletter
    if (newsletter) {
      db.prepare('INSERT INTO newsletter_emails (id, email, user_id) VALUES (?, ?, ?)').run(randomUUID(), email, id);
    }

    const token = signToken({ id, email, username, display_name: displayName });

    const response = NextResponse.json({ user: { id, email, username, display_name: displayName } });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 });
  }
}
