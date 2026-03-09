import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const canBan = await hasPermission(user.id, 'ban_users');
  const canKick = await hasPermission(user.id, 'kick_users');
  if (!canBan && !canKick) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const io = (global as any).__io;
  if (!io || !io._onlineUsers) {
    return NextResponse.json([]);
  }

  // Deduplicate by userId (user may have multiple tabs)
  const userMap = new Map<string, any>();
  for (const [, data] of io._onlineUsers) {
    if (!userMap.has(data.userId)) {
      userMap.set(data.userId, {
        userId: data.userId,
        username: data.username,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        ip: data.ip,
        hwid: data.hwid,
        connectedAt: data.connectedAt,
      });
    }
  }

  return NextResponse.json(Array.from(userMap.values()));
}
