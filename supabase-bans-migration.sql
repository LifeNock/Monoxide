-- User bans table for moderation system
CREATE TABLE IF NOT EXISTS user_bans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by uuid NOT NULL REFERENCES profiles(id),
  ban_type text NOT NULL CHECK (ban_type IN ('permanent', 'temporary', 'hwid', 'ip')),
  reason text DEFAULT '',
  hwid text,
  ip_address text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_hwid ON user_bans(hwid);
CREATE INDEX IF NOT EXISTS idx_user_bans_ip ON user_bans(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(is_active);

-- RLS policies (optional - we use service role key so RLS is bypassed)
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

-- Add fingerprint column to profiles for HWID tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fingerprint text;
CREATE INDEX IF NOT EXISTS idx_profiles_fingerprint ON profiles(fingerprint);
