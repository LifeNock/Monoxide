-- =============================================
-- Monoxide Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3),
  display_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '' CHECK (char_length(bio) <= 200),
  pronouns TEXT DEFAULT '',
  banner_color TEXT DEFAULT '#FFD700',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL, -- SVG path or emoji identifier
  color TEXT DEFAULT '#FFD700',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User badges (many-to-many)
CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'carbon',
  font TEXT DEFAULT 'barlow',
  panic_key TEXT DEFAULT '`',
  panic_url TEXT DEFAULT 'https://www.google.com',
  about_blank_cloak BOOLEAN DEFAULT false,
  dms_enabled BOOLEAN DEFAULT true
);

-- Newsletter
CREATE TABLE IF NOT EXISTS newsletter_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subscribed_at TIMESTAMPTZ DEFAULT now()
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#8E8E8E',
  priority INT DEFAULT 0,
  permissions JSONB DEFAULT '{
    "send_messages": true,
    "delete_messages": false,
    "manage_channels": false,
    "manage_roles": false,
    "ban_users": false,
    "kick_users": false,
    "manage_word_filter": false,
    "manage_badges": false
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User roles (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Channels
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Message reactions (custom emoji only)
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji_id TEXT NOT NULL, -- references custom emoji registry
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (message_id, user_id, emoji_id)
);

-- Direct messages
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Word filter
CREATE TABLE IF NOT EXISTS word_filter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_filter ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone reads, own user updates
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Badges: anyone reads
CREATE POLICY "Badges viewable by everyone" ON badges FOR SELECT USING (true);

-- User badges: anyone reads
CREATE POLICY "User badges viewable by everyone" ON user_badges FOR SELECT USING (true);

-- User settings: own only
CREATE POLICY "Users read own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Newsletter: own insert
CREATE POLICY "Users can subscribe" ON newsletter_emails FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Roles: anyone reads
CREATE POLICY "Roles viewable by everyone" ON roles FOR SELECT USING (true);

-- User roles: anyone reads
CREATE POLICY "User roles viewable by everyone" ON user_roles FOR SELECT USING (true);

-- Channels: anyone reads
CREATE POLICY "Channels viewable by everyone" ON channels FOR SELECT USING (true);

-- Messages: authenticated read/insert, soft delete own
CREATE POLICY "Messages viewable by authenticated" ON messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can soft-delete own messages" ON messages FOR UPDATE USING (auth.uid() = user_id);

-- Reactions: authenticated
CREATE POLICY "Reactions viewable by authenticated" ON message_reactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can add reactions" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON message_reactions FOR DELETE USING (auth.uid() = user_id);

-- DMs: sender or receiver only
CREATE POLICY "Users see own DMs" ON direct_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send DMs" ON direct_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver can mark read" ON direct_messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Word filter: anyone reads
CREATE POLICY "Word filter viewable by authenticated" ON word_filter FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================
-- Seeds
-- =============================================

-- Default roles
INSERT INTO roles (name, color, priority, permissions) VALUES
  ('@everyone', '#8E8E8E', 0, '{"send_messages": true, "delete_messages": false, "manage_channels": false, "manage_roles": false, "ban_users": false, "kick_users": false, "manage_word_filter": false, "manage_badges": false}'::jsonb),
  ('Moderator', '#3498DB', 50, '{"send_messages": true, "delete_messages": true, "manage_channels": false, "manage_roles": false, "ban_users": false, "kick_users": true, "manage_word_filter": true, "manage_badges": false}'::jsonb),
  ('Admin', '#E74C3C', 100, '{"send_messages": true, "delete_messages": true, "manage_channels": true, "manage_roles": true, "ban_users": true, "kick_users": true, "manage_word_filter": true, "manage_badges": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Default channels
INSERT INTO channels (name, description, is_locked) VALUES
  ('general', 'General discussion', false),
  ('gaming', 'Talk about games', false),
  ('off-topic', 'Anything goes', false),
  ('announcements', 'Important announcements', true)
ON CONFLICT (name) DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
