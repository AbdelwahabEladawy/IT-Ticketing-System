const getTargetUrl = () => {
  const fromEnv = process.env.FIREWALL_BACKEND_INTERNAL_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  return 'http://localhost:5000/internal/firewall-ticket';
};

const readBody = (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  return {};
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = readBody(req);
    const response = await fetch(getTargetUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    return res.status(response.status).json(json);
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Proxy error' });
  }
}
