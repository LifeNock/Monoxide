const http = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const { Server: SocketIOServer } = require('socket.io');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '8443', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = express();

  // COOP/COEP headers required for proxy service workers
  expressApp.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
  });

  // Serve proxy static files
  try {
    expressApp.use('/uv/', express.static(path.join(__dirname, 'node_modules', '@titaniumnetwork-dev', 'ultraviolet', 'dist')));
  } catch (e) {
    console.warn('Ultraviolet package not found, /uv/ routes will not work');
  }

  try {
    expressApp.use('/scram/', express.static(path.join(__dirname, 'node_modules', '@mercuryworkshop', 'scramjet', 'dist')));
  } catch (e) {
    console.warn('Scramjet package not found, /scram/ routes will not work');
  }

  try {
    expressApp.use('/epoxy/', express.static(path.join(__dirname, 'node_modules', '@mercuryworkshop', 'epoxy-transport', 'dist')));
  } catch (e) {
    console.warn('Epoxy transport not found, /epoxy/ routes will not work');
  }

  try {
    expressApp.use('/baremux/', express.static(path.join(__dirname, 'node_modules', '@mercuryworkshop', 'bare-mux', 'dist')));
  } catch (e) {
    console.warn('Bare-mux not found, /baremux/ routes will not work');
  }

  // All other requests handled by Next.js
  expressApp.all('*', (req, res) => {
    return handle(req, res, parse(req.url, true));
  });

  const server = http.createServer(expressApp);

  // Socket.io for chat fallback
  const io = new SocketIOServer(server, {
    path: '/socket.io/',
    cors: { origin: '*' },
  });

  // Socket.io chat handlers
  require('./src/lib/chat/socket-server')(io);

  // WebSocket upgrade handler
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url, true);

    if (pathname === '/wisp/' || pathname === '/wisp') {
      // Wisp server for proxy transport
      try {
        const { routeRequest } = require('wisp-server-node');
        routeRequest(req, socket, head);
      } catch (e) {
        console.warn('Wisp server not available');
        socket.destroy();
      }
    } else if (pathname.startsWith('/socket.io/')) {
      // Socket.io handles its own upgrade
      return;
    } else {
      socket.destroy();
    }
  });

  server.listen(port, () => {
    console.log(`> Monoxide running at http://localhost:${port}`);
    console.log(`> Mode: ${dev ? 'development' : 'production'}`);
  });
});
