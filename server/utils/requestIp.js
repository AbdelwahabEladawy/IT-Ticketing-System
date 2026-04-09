import net from 'net';

const IPV4_WITH_PORT_PATTERN = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/;
const BRACKETED_IPV6_PATTERN = /^\[([^[\]]+)\](?::\d+)?$/;

const normalizeIpCandidate = (value) => {
  if (!value) return null;

  let candidate = String(value).trim();
  if (!candidate || candidate.toLowerCase() === 'unknown') {
    return null;
  }

  if (
    candidate.startsWith('"') &&
    candidate.endsWith('"') &&
    candidate.length > 1
  ) {
    candidate = candidate.slice(1, -1).trim();
  }

  const bracketedIpv6Match = candidate.match(BRACKETED_IPV6_PATTERN);
  if (bracketedIpv6Match) {
    candidate = bracketedIpv6Match[1];
  }

  const ipv4WithPortMatch = candidate.match(IPV4_WITH_PORT_PATTERN);
  if (ipv4WithPortMatch) {
    candidate = ipv4WithPortMatch[1];
  }

  if (candidate.startsWith('::ffff:')) {
    const mappedIpv4 = candidate.slice(7);
    if (net.isIP(mappedIpv4) === 4) {
      candidate = mappedIpv4;
    }
  }

  const zoneIndex = candidate.indexOf('%');
  if (zoneIndex !== -1) {
    candidate = candidate.slice(0, zoneIndex);
  }

  return net.isIP(candidate) ? candidate : null;
};

const getFirstForwardedIp = (value) => {
  if (!value) return null;

  const headerValue = Array.isArray(value) ? value[0] : value;
  const [firstCandidate] = String(headerValue).split(',');
  return normalizeIpCandidate(firstCandidate);
};

const isPrivateIpv4 = (ip) => {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first === 127 ||
    (first === 169 && second === 254)
  );
};

const isPrivateIpv6 = (ip) => {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
};

export const isInternalIp = (ip) => {
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateIpv4(ip);
  }
  if (version === 6) {
    return isPrivateIpv6(ip);
  }
  return false;
};

export const getInternalRequestIp = (req) => {
  const forwardedIp = getFirstForwardedIp(req.headers['x-forwarded-for']);
  if (forwardedIp) {
    return isInternalIp(forwardedIp) ? forwardedIp : null;
  }

  const remoteIp = normalizeIpCandidate(req.socket?.remoteAddress);
  if (!remoteIp) {
    return null;
  }

  return isInternalIp(remoteIp) ? remoteIp : null;
};
