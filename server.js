const http = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const { Server: SocketIOServer } = require('socket.io');
const path = require('path');
const { server: wisp } = require('@mercuryworkshop/wisp-js/server');

const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const { epoxyPath } = require('@mercuryworkshop/epoxy-transport');
const { baremuxPath } = require('@mercuryworkshop/bare-mux/node');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '5000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

// Simple in-memory cache for game HTML
const gameCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

app.prepare().then(() => {
  const expressApp = express();

  // Serve custom UV config from public/uv/ first (overrides dist defaults)
  expressApp.use('/uv/', express.static(path.join(__dirname, 'public', 'uv')));
  // Then serve UV dist files
  expressApp.use('/uv/', express.static(uvPath));

  // Epoxy transport
  expressApp.use('/epoxy/', express.static(epoxyPath));

  // Bare-mux
  expressApp.use('/baremux/', express.static(baremuxPath));

  // Scramjet (if used)
  expressApp.use('/scram/', express.static(path.join(__dirname, 'public', 'scram')));
  try {
    expressApp.use('/scram/', express.static(
      path.join(__dirname, 'node_modules', '@mercuryworkshop', 'scramjet', 'dist')
    ));
  } catch {}

  // Game HTML proxy — fetches from gnmath CDN, strips ads/tracking
  expressApp.get('/g/:id', async (req, res) => {
    const id = req.params.id;
    const cacheKey = `game-${id}`;

    // Check cache
    if (gameCache.has(cacheKey)) {
      const { html, timestamp } = gameCache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_TTL) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
      gameCache.delete(cacheKey);
    }

    try {
      const url = `https://cdn.jsdelivr.net/gh/gn-math/html@main/${id}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        return res.status(404).send('Game not found');
      }

      let html = await resp.text();

      // Strip gnmath ads, tracking, and sidebar ad containers
      html = html
        .replace(/<script[^>]*googletagmanager\.com[^>]*><\/script>/gi, '')
        .replace(/<script>[\s\S]*?gtag[\s\S]*?<\/script>/gi, '')
        .replace(/<div id="sidebarad[^"]*">[\s\S]*?<\/div>\s*<\/div>/gi, '')
        .replace(/<script>\(function\(_0x[a-f0-9]+[\s\S]*?<\/script>/gi, '')
        .replace(/<style>[^<]*#sidebarad[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*gamedistribution[^>]*><\/script>/gi, '')
        .replace(/<script[^>]*gdsdk[^>]*><\/script>/gi, '')
        .replace(/<script[^>]*gstatic\.com[^>]*><\/script>/gi, '')
        .replace(/<script>[\s\S]*?__h82AlnkH6D91__[\s\S]*?<\/script>/gi, '')
        .replace(/<script>\s*window\.__h82AlnkH6D91__[\s\S]*?<\/script>/gi, '');

      gameCache.set(cacheKey, { html, timestamp: Date.now() });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      console.error('Game fetch error:', err.message);
      res.status(500).send('Failed to load game');
    }
  });

  expressApp.get('/sg/:slug', async (req, res) => {
    const slug = req.params.slug;
    const cacheKey = `seraph-${slug}`;

    if (gameCache.has(cacheKey)) {
      const { html, timestamp } = gameCache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_TTL) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }
      gameCache.delete(cacheKey);
    }

    try {
      const base = `https://cdn.jsdelivr.net/gh/a456pur/seraph@main/games/${slug}`;
      const resp = await fetch(`${base}/index.html`);
      if (!resp.ok) return res.status(404).send('Game not found');

      let html = await resp.text();
      html = html.replace(/<head>/i, `<head><base href="${base}/">`);

      gameCache.set(cacheKey, { html, timestamp: Date.now() });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      console.error('Seraph game fetch error:', err.message);
      res.status(500).send('Failed to load game');
    }
  });

  // All other requests handled by Next.js
  expressApp.all('*', (req, res) => {
    return handle(req, res, parse(req.url, true));
  });

  const server = http.createServer((req, res) => {
    // COOP/COEP required for SharedWorker (bare-mux v2)
    // Using 'credentialless' for COEP so external resources (images, CDN, Supabase) still load
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');

    expressApp(req, res);
  });

  // Socket.io for chat
  const io = new SocketIOServer(server, {
    path: '/socket.io/',
    cors: { origin: '*' },
  });
  require('./src/lib/chat/socket-server')(io);

  // WebSocket upgrade — wisp handles proxy transport
  server.on('upgrade', (req, socket, head) => {
    if (req.url.endsWith('/wisp/')) {
      wisp.routeRequest(req, socket, head);
    } else if (parse(req.url, true).pathname?.startsWith('/socket.io/')) {
      // Let socket.io handle its own upgrades
      return;
    } else {
      socket.end();
    }
  });

  server.listen(port, () => {
    console.log(`> Monoxide running at http://localhost:${port}`);
  });
});
