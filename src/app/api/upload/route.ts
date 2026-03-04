import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  const user = getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Save to public/uploads/avatars/
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  await mkdir(uploadsDir, { recursive: true });

  const ext = file.name.split('.').pop() || 'png';
  const filename = `${user.id}.${ext}`;
  const filepath = path.join(uploadsDir, filename);

  await writeFile(filepath, buffer);

  const url = `/uploads/avatars/${filename}`;
  return NextResponse.json({ url });
}
