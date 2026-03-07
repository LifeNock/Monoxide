// This file is kept for backwards compatibility during migration.
// All database operations now use Supabase.
// See src/lib/supabase.ts and src/lib/supabase-server.ts

export { supabaseAdmin as db } from './supabase';
