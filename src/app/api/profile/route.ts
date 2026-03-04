import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

  const db = getDb();
  const profile = db.prepare(`
    SELECT id, username, display_name, avatar_url, bio, pronouns, banner_color, created_at
    FROM users WHERE username = ?
  `).get(username);

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get badges
  const badges = db.prepare(`
    SELECT b.* FROM badges b
    JOIN user_badges ub ON b.id = ub.badge_id
    WHERE ub.user_id = ?
  `).all((profile as any).id);

  // Get top role
  const roles = db.prepare(`
    SELECT r.* FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ?
    ORDER BY r.priority DESC
  `).all((profile as any).id);

  return NextResponse.json({ profile, badges, roles });
}

export async function PUT(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { displayName, bio, pronouns, bannerColor, avatarUrl } = await request.json();
  const db = getDb();

  db.prepare(`
    UPDATE users SET
      display_name = COALESCE(?, display_name),
      bio = COALESCE(?, bio),
      pronouns = COALESCE(?, pronouns),
      banner_color = COALESCE(?, banner_color),
      avatar_url = COALESCE(?, avatar_url)
    WHERE id = ?
  `).run(displayName, bio, pronouns, bannerColor, avatarUrl, user.id);

  return NextResponse.json({ ok: true });
}
