-- Machines table for Monoxide Connect
CREATE TABLE machines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'My Computer',
  pairing_token text UNIQUE NOT NULL,
  guacamole_url text,
  protocol text NOT NULL DEFAULT 'rdp',
  paired boolean NOT NULL DEFAULT false,
  paired_at timestamptz,
  last_seen timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Each user can only see their own machines
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own machines"
  ON machines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own machines"
  ON machines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own machines"
  ON machines FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own machines"
  ON machines FOR DELETE
  USING (auth.uid() = user_id);

-- Index for token lookups (used by pairing agent)
CREATE INDEX idx_machines_pairing_token ON machines(pairing_token);
CREATE INDEX idx_machines_user_id ON machines(user_id);
