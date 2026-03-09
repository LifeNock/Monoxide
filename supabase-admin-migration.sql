-- Email domain blacklist table
CREATE TABLE IF NOT EXISTS email_blacklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  reason TEXT DEFAULT '',
  added_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_blacklist_domain ON email_blacklist(domain);

-- Add 'poison' to allowed ban types (if using check constraint)
-- The user_bans table already exists from supabase-bans-migration.sql
-- Just ensure poison bans work — no schema change needed since ban_type is TEXT

-- Ensure word_filter table has the right columns
-- (table may already exist from initial migration)
CREATE TABLE IF NOT EXISTS word_filter (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  replacement TEXT DEFAULT '***',
  action TEXT DEFAULT 'replace',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
