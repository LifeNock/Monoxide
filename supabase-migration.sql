-- Monoxide Supabase Migration
-- Run this in the Supabase SQL Editor (or it will auto-run via the app)

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  pronouns TEXT DEFAULT '',
  banner_color TEXT DEFAULT '#FFD700',
  banner_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
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

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#8E8E8E',
  priority INTEGER DEFAULT 0,
  permissions JSONB DEFAULT '{}'
);

-- User roles
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT DEFAULT '#FFD700',
  description TEXT DEFAULT ''
);

-- User badges
CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- Channels
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Message reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji_id TEXT NOT NULL,
  UNIQUE (message_id, user_id, emoji_id)
);

-- Direct messages
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Word filter
CREATE TABLE IF NOT EXISTS word_filter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT UNIQUE NOT NULL
);

-- Newsletter emails
CREATE TABLE IF NOT EXISTS newsletter_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Seed default roles
INSERT INTO roles (name, color, priority, permissions) VALUES
  ('@everyone', '#8E8E8E', 0, '{"send_messages":true,"delete_messages":false,"manage_channels":false,"manage_roles":false,"ban_users":false,"kick_users":false,"manage_word_filter":false,"manage_badges":false}'),
  ('Moderator', '#3498DB', 50, '{"send_messages":true,"delete_messages":true,"manage_channels":false,"manage_roles":false,"ban_users":false,"kick_users":true,"manage_word_filter":true,"manage_badges":false}'),
  ('Admin', '#E74C3C', 100, '{"send_messages":true,"delete_messages":true,"manage_channels":true,"manage_roles":true,"ban_users":true,"kick_users":true,"manage_word_filter":true,"manage_badges":true}')
ON CONFLICT (name) DO NOTHING;

-- Seed default channels
INSERT INTO channels (name, description, is_locked) VALUES
  ('general', 'General discussion', false),
  ('gaming', 'Talk about games', false),
  ('off-topic', 'Anything goes', false),
  ('announcements', 'Important announcements', true)
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_filter ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: anyone can read, users can update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User settings: users can manage their own
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Roles: anyone can read
CREATE POLICY "Roles are viewable by everyone" ON roles FOR SELECT USING (true);

-- User roles: anyone can read
CREATE POLICY "User roles are viewable by everyone" ON user_roles FOR SELECT USING (true);

-- Badges: anyone can read
CREATE POLICY "Badges are viewable by everyone" ON badges FOR SELECT USING (true);

-- User badges: anyone can read
CREATE POLICY "User badges are viewable by everyone" ON user_badges FOR SELECT USING (true);

-- Channels: anyone can read
CREATE POLICY "Channels are viewable by everyone" ON channels FOR SELECT USING (true);

-- Messages: anyone can read, authenticated users can insert
CREATE POLICY "Messages are viewable by everyone" ON messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can soft-delete own messages" ON messages FOR UPDATE USING (auth.uid() = user_id);

-- Message reactions: anyone can read, authenticated users can manage their own
CREATE POLICY "Reactions are viewable by everyone" ON message_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON message_reactions FOR DELETE USING (auth.uid() = user_id);

-- Direct messages: users can see their own
CREATE POLICY "Users can view own DMs" ON direct_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send DMs" ON direct_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Word filter: anyone can read
CREATE POLICY "Word filter is viewable by everyone" ON word_filter FOR SELECT USING (true);

-- Newsletter: users can manage own
CREATE POLICY "Users can view own newsletter sub" ON newsletter_emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can subscribe to newsletter" ON newsletter_emails FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON direct_messages(receiver_id);
