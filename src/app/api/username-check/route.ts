import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');

  if (!username || username.length < 3) {
    return NextResponse.json({ available: false, error: 'Username must be at least 3 characters' });
  }

  if (!/^[a-z0-9_-]+$/.test(username)) {
    return NextResponse.json({ available: false, error: 'Invalid characters' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT username FROM users WHERE username = ?').get(username);

  return NextResponse.json({ available: !existing });
}
