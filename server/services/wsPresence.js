import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { heartbeat, markOffline, markOnline } from './presenceService.js';
import { registerTicketMessageSocket } from './wsTicketMessages.js';

export const setupPresenceWebSocket = (httpServer) => {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', async (socket, req) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;

      const token = url.searchParams.get('token');
      const tabId = url.searchParams.get('tabId');

      if (!token) {
        socket.close(1008, 'Unauthorized');
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // 🔹 Routing
      if (pathname === '/ws/presence') {
        await markOnline(userId, tabId || null, true);
      } else if (pathname === '/ws/ticket-messages') {
        registerTicketMessageSocket(userId, socket);
        return;
      } else {
        socket.close(1008, 'Unknown WebSocket path');
        return;
      }

      // 🔥 نستقبل heartbeat من client فقط
      socket.on('message', async (raw) => {
        try {
          const data = JSON.parse(raw.toString());

          if (data.type === 'heartbeat') {
            await heartbeat(userId, tabId || null);

            socket.send(JSON.stringify({
              type: 'heartbeat_ack',
              t: Date.now()
            }));
          }

        } catch (error) {
          console.error('WS message error:', error.message);
        }
      });

      // ✅ ping بدون DB
      const pingInterval = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // كل 30 ثانية

      socket.on('close', async () => {
        clearInterval(pingInterval);
        await markOffline(userId, tabId || null, 'WS_DISCONNECT');
      });

    } catch (error) {
      socket.close(1008, 'Unauthorized');
    }
  });
};