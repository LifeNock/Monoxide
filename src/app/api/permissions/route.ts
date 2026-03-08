import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserPermissions } from '@/lib/permissions';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ permissions: [] });

  const perms = await getUserPermissions(user.id);
  return NextResponse.json({ permissions: Array.from(perms) });
}
