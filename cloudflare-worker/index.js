const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://lukecoopz.github.io',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Token, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
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
        ...CORS_HEADERS,
      },
    });
  },
};
