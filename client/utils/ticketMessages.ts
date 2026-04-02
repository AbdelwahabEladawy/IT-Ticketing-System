import { getToken } from './auth';
import { getWsBaseFromApiUrl } from './wsBaseUrl';

let socket: WebSocket | null = null;
const listeners = new Set<(payload: any) => void>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let waitForTokenTimer: ReturnType<typeof setInterval> | null = null;

const clearTimers = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (waitForTokenTimer) {
    clearInterval(waitForTokenTimer);
    waitForTokenTimer = null;
  }
};

const notifyListeners = (payload: any) => {
  for (const listener of Array.from(listeners)) {
    try {
      listener(payload);
    } catch {
      // ignore listener errors
    }
  }
};

const createSocket = () => {
  if (typeof window === 'undefined') return;

  const token = getToken();
  if (!token) return;

  const wsBase = getWsBaseFromApiUrl();
  const socketUrl = `${wsBase}/ws/ticket-messages?token=${encodeURIComponent(token)}`;

  try {
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }
  } catch {
    // ignore
  }

  socket = new WebSocket(socketUrl);

  socket.onopen = () => {
    console.debug('Ticket WS connected.');
    clearTimers();

    heartbeatTimer = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      notifyListeners(payload);
    } catch {
      // ignore malformed payload
    }
  };

  socket.onclose = () => {
    console.warn('Ticket WS closed. Attempting reconnect...');
    socket = null;
    clearTimers();
    if (listeners.size > 0 && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        createSocket();
      }, 2000);
    }
  };

  socket.onerror = (error) => {
    console.warn('Ticket WS error:', error);
  };
};

const ensureSocketConnected = () => {
  const token = getToken();
  if (token) {
    if (socket && socket.readyState === WebSocket.OPEN) return;
    if (socket && socket.readyState === WebSocket.CONNECTING) return;
    createSocket();
    return;
  }

  // Delay connect until auth cookie becomes available, then connect automatically.
  if (!waitForTokenTimer) {
    waitForTokenTimer = setInterval(() => {
      const delayedToken = getToken();
      if (!delayedToken) return;
      if (waitForTokenTimer) {
        clearInterval(waitForTokenTimer);
        waitForTokenTimer = null;
      }
      if (listeners.size > 0) {
        createSocket();
      }
    }, 500);
  }
};

export const connectTicketMessages = (onPayload: (payload: any) => void) => {
  if (typeof window === 'undefined') return;

  // Always register the listener first. Previously we returned when token was missing,
  // so pages that mounted before the cookie was readable never subscribed and never refetched.
  listeners.add(onPayload);
  ensureSocketConnected();
};

export const disconnectTicketMessages = (onPayload?: (payload: any) => void) => {
  if (onPayload) {
    listeners.delete(onPayload);
  } else {
    listeners.clear();
  }

  if (listeners.size === 0) {
    clearTimers();
    if (socket) {
      try {
        socket.close();
      } catch {
        // ignore
      }
      socket = null;
    }
  }
};