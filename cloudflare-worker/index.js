const ALLOWED_ORIGINS = [
  'https://lukecoopz.github.io',
  'http://localhost:5173',
  'http://localhost:4173', // vite preview
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Token, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') ?? '';
    const corsHeaders = getCorsHeaders(origin);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow GET
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const qaseUrl = `https://api.qase.io/v1${url.pathname}${url.search}`;

    const qaseResponse = await fetch(qaseUrl, {
      headers: {
        Token: request.headers.get('Token') ?? '',
        'Content-Type': 'application/json',
      },
    });

    const body = await qaseResponse.text();
    return new Response(body, {
      status: qaseResponse.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  },
};
