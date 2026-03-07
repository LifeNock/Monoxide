import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PNG, JPEG, GIF, WebP allowed' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = (file.name.split('.').pop() || 'png').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5);
  const filePath = `${randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from('uploads')
    .upload(filePath, buffer, {
      contentType: file.type,
    });

  if (error) {
    return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('uploads')
    .getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrl });
}
