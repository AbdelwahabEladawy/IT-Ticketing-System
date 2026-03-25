import { getToken } from './auth';

let socket: WebSocket | null = null;

const getWsBaseUrl = () => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  return apiBase
    .replace('/api', '')
    .replace('http://', 'ws://')
    .replace('https://', 'wss://');
};

export const connectTicketMessages = (onPayload: (payload: any) => void) => {
  if (typeof window === 'undefined') return;

  const token = getToken();
  if (!token) return;

  // Avoid duplicate connections (Next dev mode can mount/unmount quickly)
  if (socket) {
    try {
      socket.close();
    } catch {
      // ignore
    }
    socket = null;
  }

  const wsBase = getWsBaseUrl();
  socket = new WebSocket(
    `${wsBase}/ws/ticket-messages?token=${encodeURIComponent(token)}`
  );

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      onPayload(payload);
    } catch {
      // ignore malformed payload
    }
  };
};

export const disconnectTicketMessages = () => {
  if (socket) {
    try {
      socket.close();
    } catch {
      // ignore
    }
    socket = null;
  }
};

