/* ============================================================
   Shared Socket.IO Instance
   ============================================================
   Attaches Socket.IO to the HTTP server and exports a
   getIo() accessor so any service can emit events without
   tight coupling to the server startup code.
   ============================================================ */

let io = null;

function initSocket(server) {
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: {
      origin: '*', // will be restricted by Express CORS middleware at HTTP level
      methods: ['GET', 'POST']
    },
    // Allow long-polling fallback in case WS upgrade is blocked
    transports: ['websocket', 'polling']
  });

  // --- Auth middleware on handshake ---
  const { adminClient } = require('../config/database');

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const { data: { user }, error } = await adminClient.auth.getUser(token);
      if (error || !user) {
        return next(new Error('Invalid token'));
      }

      socket.data.userId = user.id;

      // Tag admins so they can receive system-wide alert events.
      try {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        socket.data.role = profile?.role || 'student';
      } catch {
        socket.data.role = 'student';
      }

      next();
    } catch (err) {
      console.error('[SOCKET] Auth error:', err.message);
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    // Join a room keyed by userId so we can target a specific user
    socket.join(userId);

    // Admins also join a shared room for system-wide admin alerts.
    if (socket.data.role === 'admin') {
      socket.join('admins');
      console.log(`[SOCKET] Admin ${userId.slice(0, 8)}… joined admins room`);
    }

    console.log(`[SOCKET] User ${userId.slice(0, 8)}… connected (${socket.id})`);

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User ${userId.slice(0, 8)}… disconnected (${socket.id})`);
    });
  });

  console.log('[SOCKET] Socket.IO server initialized');
  return io;
}

function getIo() {
  return io;
}

module.exports = { initSocket, getIo };
