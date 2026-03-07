import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data: channels } = await supabaseAdmin
    .from('channels')
    .select('*')
    .order('created_at', { ascending: true });

  return NextResponse.json(channels || []);
}
