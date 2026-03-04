import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const db = getDb();
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user.id);
  return NextResponse.json(settings || {});
}

export async function PUT(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const db = getDb();

  // Upsert settings
  db.prepare(`
    INSERT INTO user_settings (user_id, theme, font, panic_key, panic_url, about_blank_cloak, dms_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      theme = COALESCE(excluded.theme, theme),
      font = COALESCE(excluded.font, font),
      panic_key = COALESCE(excluded.panic_key, panic_key),
      panic_url = COALESCE(excluded.panic_url, panic_url),
      about_blank_cloak = COALESCE(excluded.about_blank_cloak, about_blank_cloak),
      dms_enabled = COALESCE(excluded.dms_enabled, dms_enabled)
  `).run(
    user.id,
    body.theme || 'carbon',
    body.font || 'barlow',
    body.panicKey || '`',
    body.panicUrl || 'https://www.google.com',
    body.aboutBlankCloak ? 1 : 0,
    body.dmsEnabled !== false ? 1 : 0,
  );

  return NextResponse.json({ ok: true });
}
