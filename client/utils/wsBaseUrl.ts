import { getPublicApiBaseUrl } from './publicApiUrl';

/**
 * Build WebSocket origin from the same base as REST (`/api` stripped).
 * Browsers forbid ws:// from HTTPS pages — use wss:// when the document is secure.
 */
export const getWsBaseFromApiUrl = (): string => {
  const apiBase = getPublicApiBaseUrl();
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
