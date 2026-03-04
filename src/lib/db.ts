import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'monoxide.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      pronouns TEXT DEFAULT '',
      banner_color TEXT DEFAULT '#FFD700',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT DEFAULT 'carbon',
      font TEXT DEFAULT 'barlow',
      panic_key TEXT DEFAULT '\`',
      panic_url TEXT DEFAULT 'https://www.google.com',
      about_blank_cloak INTEGER DEFAULT 0,
      dms_enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#8E8E8E',
      priority INTEGER DEFAULT 0,
      permissions TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      role_id TEXT REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT DEFAULT '#FFD700',
      description TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      badge_id TEXT REFERENCES badges(id) ON DELETE CASCADE,
      awarded_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, badge_id)
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      is_locked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      reply_to TEXT REFERENCES messages(id) ON DELETE SET NULL,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS message_reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      emoji_id TEXT NOT NULL,
      UNIQUE (message_id, user_id, emoji_id)
    );

    CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT REFERENCES users(id) ON DELETE SET NULL NOT NULL,
      receiver_id TEXT REFERENCES users(id) ON DELETE SET NULL NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS word_filter (
      id TEXT PRIMARY KEY,
      word TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS newsletter_emails (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Seed default roles
  const roleCount = db.prepare('SELECT COUNT(*) as c FROM roles').get() as any;
  if (roleCount.c === 0) {
    const insert = db.prepare('INSERT INTO roles (id, name, color, priority, permissions) VALUES (?, ?, ?, ?, ?)');
    insert.run(randomUUID(), '@everyone', '#8E8E8E', 0, JSON.stringify({
      send_messages: true, delete_messages: false, manage_channels: false,
      manage_roles: false, ban_users: false, kick_users: false,
      manage_word_filter: false, manage_badges: false,
    }));
    insert.run(randomUUID(), 'Moderator', '#3498DB', 50, JSON.stringify({
      send_messages: true, delete_messages: true, manage_channels: false,
      manage_roles: false, ban_users: false, kick_users: true,
      manage_word_filter: true, manage_badges: false,
    }));
    insert.run(randomUUID(), 'Admin', '#E74C3C', 100, JSON.stringify({
      send_messages: true, delete_messages: true, manage_channels: true,
      manage_roles: true, ban_users: true, kick_users: true,
      manage_word_filter: true, manage_badges: true,
    }));
  }

  // Seed default channels
  const chanCount = db.prepare('SELECT COUNT(*) as c FROM channels').get() as any;
  if (chanCount.c === 0) {
    const insert = db.prepare('INSERT INTO channels (id, name, description, is_locked) VALUES (?, ?, ?, ?)');
    insert.run(randomUUID(), 'general', 'General discussion', 0);
    insert.run(randomUUID(), 'gaming', 'Talk about games', 0);
    insert.run(randomUUID(), 'off-topic', 'Anything goes', 0);
    insert.run(randomUUID(), 'announcements', 'Important announcements', 1);
  }
}
