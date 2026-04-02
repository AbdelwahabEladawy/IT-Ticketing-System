import { getToken } from './auth';

let socket: WebSocket | null = null;
const listeners = new Set<(payload: any) => void>();

const getWsBaseUrl = () => {
  let base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').trim();
  // HTTP API lives at .../api; WS is on the same host without the /api suffix.
  base = base.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  if (!/^https?:\/\//i.test(base)) {
    base = `http://${base}`;
  }
  return base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
};

export const connectTicketMessages = (onPayload: (payload: any) => void) => {
  if (typeof window === 'undefined') return;

  const token = getToken();
  if (!token) return;

  listeners.add(onPayload);

  // If socket is already connected, just register the listener.
  if (socket && socket.readyState === WebSocket.OPEN) return;
  if (socket && socket.readyState !== WebSocket.CLOSED) return;

  try {
    if (socket) socket.close();
  } catch {
    // ignore
  }
  socket = null;

  const wsBase = getWsBaseUrl();
  socket = new WebSocket(
    `${wsBase}/ws/ticket-messages?token=${encodeURIComponent(token)}`
  );

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      for (const listener of Array.from(listeners)) {
        try {
          listener(payload);
        } catch {
          // ignore listener errors
        }
      }
    } catch {
      // ignore malformed payload
    }
  };
};

export const disconnectTicketMessages = (onPayload?: (payload: any) => void) => {
  if (onPayload) {
    listeners.delete(onPayload);
  } else {
    listeners.clear();
  }

  if (listeners.size === 0 && socket) {
    try {
      socket.close();
    } catch {
      // ignore
    }
    socket = null;
  }
};

