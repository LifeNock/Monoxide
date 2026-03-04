# Monoxide

An all-in-one unblocked platform with a web proxy, games library, and real-time chat.

## Features

- **Dual-engine web proxy** — Ultraviolet and Scramjet with one-click engine switching
- **Games library** — 35+ curated browser games, searchable and filterable by category
- **Real-time chat** — Discord-style channels, custom emoji reactions, role-based permissions
- **User profiles** — Avatars, bios, pronouns, badges, and banner customization
- **5 themes** — Carbon (dark), Light, Midnight, Forest, Crimson
- **Privacy tools** — Panic key, about:blank cloaking, customizable redirect URL

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Set up Supabase:
   - Create a project at [supabase.com](https://supabase.com)
   - Run `supabase/schema.sql` in the SQL editor
   - Copy your API keys into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Generate favicons (optional):

```bash
npm run generate-favicon
```

4. Start the server:

```bash
npm run dev
```

The app runs at `http://localhost:8443`.

## Stack

- Next.js 14 (App Router)
- Custom Node server (Express + HTTP)
- Supabase (auth, database, storage, realtime)
- Socket.io (chat fallback)
- Ultraviolet + Scramjet (proxy engines)
- Wisp + Epoxy (transport layer)

## Project Structure

```
src/
  app/          — Next.js pages and layouts
  components/   — React components
  contexts/     — Theme and font providers
  data/         — Static data (games, emojis, fun facts)
  hooks/        — Custom React hooks
  lib/          — Supabase clients, proxy utils, chat client
server.js       — Custom server (port 8443)
supabase/       — Database schema and seeds
public/         — Static assets, proxy configs, emoji SVGs
```

## Port

Runs on port **8443** by default. Change via `PORT` environment variable.
