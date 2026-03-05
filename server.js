const http = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const { Server: SocketIOServer } = require('socket.io');
const path = require('path');

// Use nebula's bare server (same as Interstellar)
let createBareServer;
try {
  createBareServer = require('@nebula-services/bare-server-node').createBareServer;
} catch {
  createBareServer = require('@tomphttp/bare-server-node').createBareServer;
}

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '5000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();
const bareServer = createBareServer('/bare/');

// Simple in-memory cache for game HTML
const gameCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

app.prepare().then(() => {
  const expressApp = express();

  // Serve custom UV/Scramjet configs first (override node_modules defaults)
  expressApp.use('/uv/', express.static(path.join(__dirname, 'public', 'uv')));
  expressApp.use('/uv/', express.static(
    path.join(__dirname, 'node_modules', '@titaniumnetwork-dev', 'ultraviolet', 'dist')
  ));
  expressApp.use('/scram/', express.static(path.join(__dirname, 'public', 'scram')));
  expressApp.use('/scram/', express.static(
    path.join(__dirname, 'node_modules', '@mercuryworkshop', 'scramjet', 'dist')
  ));

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
        // Remove Google Analytics/gtag
        .replace(/<script[^>]*googletagmanager\.com[^>]*><\/script>/gi, '')
        .replace(/<script>[\s\S]*?gtag[\s\S]*?<\/script>/gi, '')
        // Remove sidebar ad containers
        .replace(/<div id="sidebarad[^"]*">[\s\S]*?<\/div>\s*<\/div>/gi, '')
        // Remove obfuscated ad injection scripts
        .replace(/<script>\(function\(_0x[a-f0-9]+[\s\S]*?<\/script>/gi, '')
        // Remove ad-related styles
        .replace(/<style>[^<]*#sidebarad[\s\S]*?<\/style>/gi, '')
        // Remove any remaining ad scripts with known patterns
        .replace(/<script[^>]*gamedistribution[^>]*><\/script>/gi, '')
        .replace(/<script[^>]*gdsdk[^>]*><\/script>/gi, '')
        // Remove funding choices / Google ad scripts
        .replace(/<script[^>]*gstatic\.com[^>]*><\/script>/gi, '')
        .replace(/<script>[\s\S]*?__h82AlnkH6D91__[\s\S]*?<\/script>/gi, '')
        .replace(/<script>\s*window\.__h82AlnkH6D91__[\s\S]*?<\/script>/gi, '');

      // Cache it
      gameCache.set(cacheKey, { html, timestamp: Date.now() });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      console.error('Game fetch error:', err.message);
      res.status(500).send('Failed to load game');
    }
  });

  // All other requests handled by Next.js
  expressApp.all('*', (req, res) => {
    return handle(req, res, parse(req.url, true));
  });

  const server = http.createServer((req, res) => {
    if (bareServer.shouldRoute(req)) {
      bareServer.routeRequest(req, res);
    } else {
      expressApp(req, res);
    }
  });

  // Socket.io for chat
  const io = new SocketIOServer(server, {
    path: '/socket.io/',
    cors: { origin: '*' },
  });
  require('./src/lib/chat/socket-server')(io);

  // WebSocket upgrade
  server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
      bareServer.routeUpgrade(req, socket, head);
    } else if (parse(req.url, true).pathname?.startsWith('/socket.io/')) {
      return; // Socket.io handles its own
    } else {
      socket.end();
    }
  });

  server.listen(port, () => {
    console.log(`> Monoxide running at http://localhost:${port}`);
    console.log(`> Bare server at /bare/`);
  });
});
