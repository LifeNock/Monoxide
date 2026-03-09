-- DM Conversations & Group Chats Migration
-- Run this in the Supabase SQL Editor

-- Conversations (1:1 DMs and group chats)
CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'dm' CHECK (type IN ('dm', 'group')),
  name TEXT DEFAULT NULL,
  icon_url TEXT DEFAULT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS dm_participants (
  conversation_id UUID REFERENCES dm_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- DM/Group messages (replacing the old direct_messages table for new system)
CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES dm_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT DEFAULT NULL,
  reply_to UUID REFERENCES dm_messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentions tracking (works for both channel messages and DMs)
CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message_id UUID,
  dm_message_id UUID,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES dm_conversations(id) ON DELETE CASCADE,
  is_everyone BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dm_participants_user ON dm_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_conv ON dm_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conv ON dm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created ON dm_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_dm_messages_user ON dm_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_unread ON mentions(user_id, is_read);

-- RLS
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

-- Policies (using service role key bypasses RLS, but good to have)
CREATE POLICY "Participants can view conversations" ON dm_conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM dm_participants WHERE conversation_id = dm_conversations.id AND user_id = auth.uid())
);
CREATE POLICY "Users can create conversations" ON dm_conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own participations" ON dm_participants FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can join conversations" ON dm_participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Participants can view messages" ON dm_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM dm_participants WHERE conversation_id = dm_messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Participants can send messages" ON dm_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM dm_participants WHERE conversation_id = dm_messages.conversation_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view own mentions" ON mentions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own mentions" ON mentions FOR UPDATE USING (user_id = auth.uid());

-- Auto-delete DM messages older than 90 days (run via Supabase cron or pg_cron)
-- If pg_cron is enabled:
-- SELECT cron.schedule('cleanup-dm-messages', '0 3 * * *', $$DELETE FROM dm_messages WHERE created_at < NOW() - INTERVAL '90 days'$$);
