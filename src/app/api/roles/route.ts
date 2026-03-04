import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET() {
  const db = getDb();
  const roles = db.prepare('SELECT * FROM roles ORDER BY priority DESC').all();
  return NextResponse.json(roles.map((r: any) => ({
    ...r,
    permissions: JSON.parse(r.permissions || '{}'),
  })));
}

export async function POST(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const db = getDb();
  const id = randomUUID();

  db.prepare(`
    INSERT INTO roles (id, name, color, priority, permissions)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, body.name, body.color || '#8E8E8E', body.priority || 0, JSON.stringify(body.permissions || {}));

  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as any;
  return NextResponse.json({ ...role, permissions: JSON.parse(role.permissions) });
}

export async function PUT(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const db = getDb();

  db.prepare(`
    UPDATE roles SET name = ?, color = ?, priority = ?, permissions = ?
    WHERE id = ?
  `).run(body.name, body.color, body.priority, JSON.stringify(body.permissions), body.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await request.json();
  const db = getDb();
  db.prepare('DELETE FROM roles WHERE id = ?').run(id);

  return NextResponse.json({ ok: true });
}
