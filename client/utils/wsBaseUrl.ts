/**
 * Build WebSocket origin from NEXT_PUBLIC_API_URL.
 * Browsers forbid ws:// from HTTPS pages — use wss:// when the document is secure.
 */
export const getWsBaseFromApiUrl = (): string => {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  let origin = apiBase.replace(/\/api\/?$/, '');

  const pageIsHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';

  if (pageIsHttps) {
    origin = origin.replace(/^http:\/\//i, 'wss://');
    if (!/^wss:\/\//i.test(origin)) {
      origin = origin.replace(/^https:\/\//i, 'wss://');
    }
  } else {
    origin = origin
      .replace(/^http:\/\//i, 'ws://')
      .replace(/^https:\/\//i, 'wss://');
  }

  return origin;
};
