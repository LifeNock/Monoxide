# Monoxide

An all-in-one unblocked platform with a web proxy, games library, and real-time chat.

## Features

- **Monoxide Proxy** -- Dual-engine browsing with Ultraviolet and Scramjet, powered by Wisp + Epoxy transport
- **Monoxide Games** -- 700+ curated browser games, searchable and filterable by category
- **Monoxide Chat** -- Discord-style channels with custom emoji reactions, profile cards, and role-based permissions
- **User profiles** -- Avatars, bios, pronouns, badges, banner customization, and popup profile cards in chat
- **Admin system** -- Role management restricted to designated administrators
- **5 themes** -- Carbon (dark), Light, Midnight, Forest, Crimson
- **Privacy tools** -- Panic key, about:blank cloaking, customizable redirect URL
- **Zero config** -- SQLite database, no external services needed

## Setup

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5000` with everything auto-configured:
- SQLite database is created automatically on first run
- Default channels (#general, #gaming, #off-topic, #announcements) are seeded
- Default roles (@everyone, Moderator, Admin) are seeded
- User auth uses JWT tokens stored in cookies

## Stack

- Next.js 14 (App Router)
- Custom Node server (Express + HTTP) on port 5000
- SQLite (via better-sqlite3) -- zero-config local database
- JWT auth with bcrypt password hashing
- Socket.io for real-time chat
- Ultraviolet + Scramjet proxy engines with bare-mux
- Wisp server + Epoxy transport layer

## Project Structure

```
src/
  app/          -- Next.js pages and layouts
  components/   -- React components (chat, sidebar, profile cards)
  contexts/     -- Theme and font providers
  data/         -- Static data (games, emojis, fun facts)
  hooks/        -- Custom React hooks
  lib/          -- Database, auth, proxy utils, chat client
server.js       -- Custom server (port 5000)
public/         -- Static assets, proxy configs, emoji SVGs
```

## Port

Runs on port **5000** by default. Change via `PORT` environment variable.
