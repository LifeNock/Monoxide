const http = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const { Server: SocketIOServer } = require('socket.io');
const path = require('path');
const { server: wisp } = require('@mercuryworkshop/wisp-js/server');
const httpProxy = require('http-proxy');

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

// Connect reverse proxy (WebSocket proxy for noVNC/websockify)
const connectProxy = httpProxy.createProxyServer({ changeOrigin: true, ws: true, secure: false });
const machineUrlCache = new Map(); // machineId -> { url, timestamp }
const MACHINE_CACHE_TTL = 60 * 1000; // 1 min

connectProxy.on('error', (err, req, res) => {
  console.error('[connect-proxy] Proxy error:', err.message, err.code || '');
  if (res && res.writeHead) res.writeHead(502).end('Proxy error');
});

connectProxy.on('open', () => {
  console.log('[connect-proxy] WS connection opened to target');
});

connectProxy.on('close', (res, socket, head) => {
  console.log('[connect-proxy] WS connection closed');
});

async function getMachineUrl(machineId) {
  const cached = machineUrlCache.get(machineId);
  if (cached && Date.now() - cached.timestamp < MACHINE_CACHE_TTL) {
    return cached.url;
  }
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data } = await supabase
      .from('machines')
      .select('guacamole_url, user_id')
      .eq('id', machineId)
      .eq('paired', true)
      .single();
    if (data?.guacamole_url) {
      machineUrlCache.set(machineId, { url: data.guacamole_url, userId: data.user_id, timestamp: Date.now() });
      return data.guacamole_url;
    }
  } catch (err) {
    console.error('Machine lookup error:', err.message);
  }
  return null;
}

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

  // Connect proxy — WebSocket upgrade for noVNC handled in 'upgrade' event
  // This HTTP route is only for health checks / fallback
  expressApp.all('/connect-proxy/:machineId/*', async (req, res) => {
    const { machineId } = req.params;
    const targetUrl = await getMachineUrl(machineId);
    if (!targetUrl) return res.status(404).send('Machine not found');
    req.url = req.url.replace(`/connect-proxy/${machineId}`, '') || '/';
    connectProxy.web(req, res, { target: targetUrl });
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

  // WebSocket upgrade — intercept before Next.js HMR handler sees it
  // We override emit so custom WS routes are handled first; everything else
  // (socket.io, Next.js HMR) passes through normally via the real emit.
  const _origEmit = server.emit.bind(server);
  server.emit = function (event, ...args) {
    if (event === 'upgrade') {
      const [req, socket, head] = args;
      const pathname = parse(req.url, true).pathname || '';

      if (req.url.endsWith('/wisp/')) {
        wisp.routeRequest(req, socket, head);
        return true; // handled, don't pass to other listeners
      }

      if (pathname.startsWith('/connect-proxy/')) {
        const parts = pathname.split('/');
        const machineId = parts[2];
        console.log(`[connect-proxy] WS upgrade for machine: ${machineId}, path: ${pathname}`);
        if (machineId) {
          getMachineUrl(machineId).then(targetUrl => {
            if (targetUrl) {
              // Convert https:// to wss:// for WebSocket proxy target
              const wsTarget = targetUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
              console.log(`[connect-proxy] Proxying WS to: ${wsTarget}`);
              socket.on('error', (err) => console.error('[connect-proxy] Socket error:', err.message));
              socket.on('close', () => console.log('[connect-proxy] Socket closed'));
              connectProxy.ws(req, socket, head, { target: wsTarget });
            } else {
              console.log(`[connect-proxy] No URL found for machine ${machineId}`);
              socket.end();
            }
          }).catch(err => {
            console.error(`[connect-proxy] Error looking up machine ${machineId}:`, err.message);
            socket.end();
          });
        } else {
          console.log('[connect-proxy] No machineId in path');
          socket.end();
        }
        return true; // handled
      }

      // socket.io and Next.js HMR — pass through
    }
    return _origEmit(event, ...args);
  };

  server.listen(port, () => {
    console.log(`> Monoxide running at http://localhost:${port}`);
  });
});
