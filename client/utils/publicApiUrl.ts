/**
 * Base URL for REST API calls (must end with `/api`).
 *
 * 1) `NEXT_PUBLIC_API_URL` — use in production or when API host differs from the page.
 * 2) Otherwise in the browser: derive from `window.location` (same host as the open site).
 *    - Page on standard ports (80/443 or empty): `{origin}/api` (reverse proxy serves `/api`).
 *    - Page on a dev port (e.g. 3000): `{protocol}//{hostname}:{NEXT_PUBLIC_API_PORT|5000}/api`.
 * 3) SSR / Node: `127.0.0.1` + `NEXT_PUBLIC_API_PORT` (default 5000) — rare for this app.
 */
export function getPublicApiBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (env) {
    const base = env.replace(/\/+$/, '');
    return base.endsWith('/api') ? base : `${base}/api`;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location;
    const apiPort = process.env.NEXT_PUBLIC_API_PORT || '5000';

    if (!port || port === '80' || port === '443') {
      return `${origin}/api`;
    }

    return `${protocol}//${hostname}:${apiPort}/api`;
  }

  return `http://127.0.0.1:${process.env.NEXT_PUBLIC_API_PORT || '5000'}/api`;
}
