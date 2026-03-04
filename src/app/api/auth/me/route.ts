import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const authUser = getAuthUser();
  if (!authUser) {
    return NextResponse.json({ user: null });
  }

  const db = getDb();
  const user = db.prepare(`
    SELECT id, email, username, display_name, avatar_url, bio, pronouns, banner_color, created_at
    FROM users WHERE id = ?
  `).get(authUser.id) as any;

  if (!user) {
    return NextResponse.json({ user: null });
  }

  // Get settings
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user.id);

  return NextResponse.json({ user, settings });
}
