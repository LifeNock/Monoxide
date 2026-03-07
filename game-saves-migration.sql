-- Game saves table with multiple slots per game
-- If creating fresh:
CREATE TABLE IF NOT EXISTS game_saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  slot INTEGER NOT NULL DEFAULT 1,
  slot_name TEXT NOT NULL DEFAULT 'Save 1',
  save_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, game_id, slot)
);

-- If upgrading from old schema (add slot columns):
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS slot INTEGER NOT NULL DEFAULT 1;
ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS slot_name TEXT NOT NULL DEFAULT 'Save 1';

-- Drop old unique constraint and add new one with slot
ALTER TABLE game_saves DROP CONSTRAINT IF EXISTS game_saves_user_id_game_id_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_saves_user_id_game_id_slot_key') THEN
    ALTER TABLE game_saves ADD CONSTRAINT game_saves_user_id_game_id_slot_key UNIQUE(user_id, game_id, slot);
  END IF;
END $$;

-- RLS
ALTER TABLE game_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own saves" ON game_saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own saves" ON game_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own saves" ON game_saves
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own saves" ON game_saves
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_saves_user_game ON game_saves(user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_game_saves_user_game_slot ON game_saves(user_id, game_id, slot);
