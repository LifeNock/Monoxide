import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  const channelId = request.nextUrl.searchParams.get('channelId');
  if (!channelId) return NextResponse.json([]);

  const db = getDb();
  const messages = db.prepare(`
    SELECT m.*, u.username, u.display_name, u.avatar_url, u.pronouns
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.channel_id = ? AND m.is_deleted = 0
    ORDER BY m.created_at ASC
    LIMIT 100
  `).all(channelId);

  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { channelId, content, replyTo } = await request.json();
  if (!channelId || !content?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  const db = getDb();

  // Check word filter
  const filterWords = db.prepare('SELECT word FROM word_filter').all() as any[];
  const lower = content.toLowerCase();
  for (const fw of filterWords) {
    if (lower.includes(fw.word.toLowerCase())) {
      return NextResponse.json({ error: 'Message contains a filtered word' }, { status: 400 });
    }
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO messages (id, channel_id, user_id, content, reply_to)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, channelId, user.id, content.trim(), replyTo || null);

  // Fetch the full message with user info
  const message = db.prepare(`
    SELECT m.*, u.username, u.display_name, u.avatar_url, u.pronouns
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `).get(id);

  return NextResponse.json(message);
}

export async function DELETE(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { messageId } = await request.json();
  const db = getDb();

  // Soft delete — only own messages (or mods, but simplified for now)
  db.prepare('UPDATE messages SET is_deleted = 1 WHERE id = ? AND user_id = ?').run(messageId, user.id);

  return NextResponse.json({ ok: true });
}
