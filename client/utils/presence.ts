import { getToken } from './auth';
import { getPublicApiBaseUrl } from './publicApiUrl';
import { getWsBaseFromApiUrl } from './wsBaseUrl';

const HEARTBEAT_MS = Number(process.env.NEXT_PUBLIC_PRESENCE_HEARTBEAT_MS || 15000);

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let socket: WebSocket | null = null;
let tabId: string | null = null;
let visibilityHandler: (() => void) | null = null;

const safeSendHeartbeat = () => {
  if (!socket) return;
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: 'heartbeat' }));
};

const generateTabId = (): string => {
  // `crypto.randomUUID()` is not available in some older browser/JS runtimes.
  const randomUUID =
    typeof window !== 'undefined' &&
    (window.crypto as Crypto | undefined | null)?.randomUUID;
  if (typeof randomUUID === 'function') return randomUUID.call(window.crypto);

  // Fallback: good-enough uniqueness per tab load for presence tracking.
  return `tab-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
};

const postHeartbeat = async () => {
  const token = getToken();
  if (!token) return;
  await fetch(`${getPublicApiBaseUrl()}/presence/heartbeat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ tabId })
  });
};

const postDisconnect = () => {
  const token = getToken();
  if (!token || !tabId) return;
  const payload = JSON.stringify({ tabId });
  const payloadWithToken = JSON.stringify({ tabId, token });
  const url = `${getPublicApiBaseUrl()}/presence/disconnect`;
  navigator.sendBeacon(url, new Blob([payloadWithToken || payload], { type: 'application/json' }));
};

export const startPresence = () => {
  const token = getToken();
  if (!token || typeof window === 'undefined') return;
  tabId = generateTabId();

  const wsBase = getWsBaseFromApiUrl();
  socket = new WebSocket(`${wsBase}/ws/presence?token=${encodeURIComponent(token)}&tabId=${encodeURIComponent(tabId)}`);
  socket.onopen = () => {
    safeSendHeartbeat();
  };

  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(() => {
      postHeartbeat().catch(() => undefined);
      safeSendHeartbeat();
    }, HEARTBEAT_MS);
  }

  window.addEventListener('pagehide', postDisconnect);
  visibilityHandler = () => {
    if (document.visibilityState === 'hidden') {
      postDisconnect();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
};

export const stopPresence = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  postDisconnect();
  if (socket) {
    socket.close();
    socket = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
};

