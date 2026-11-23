import { Server as SocketServer } from 'socket.io';
import type { Server } from 'http';
import { createHandshakeRateLimiter } from './handshakeRateLimit.js';
import { allowedOrigins } from '../utils/allowedOrigins.js';

let notificationsIO: SocketServer | null = null;

export function setupNotificationsWebsocket(httpServer: Server) {
  const io = new SocketServer(httpServer, {
    path: '/sockets/notifications',
    allowRequest: createHandshakeRateLimiter({ scope: 'notifications' }),
    cors: {
      origin: allowedOrigins(),
      credentials: true,
    },
    perMessageDeflate: {
      threshold: 512,
    },
  });

  notificationsIO = io;

  io.on('connection', (socket) => {
    socket.join('notifications');

    socket.on('disconnect', () => {
      // socket.io handles cleanup
    });
  });

  process.on('SIGTERM', () => {
    io.close();
  });

  return io;
}

export function broadcastNotificationsUpdate() {
  if (notificationsIO) {
    notificationsIO.to('notifications').emit('notificationsUpdated');
  }
}
