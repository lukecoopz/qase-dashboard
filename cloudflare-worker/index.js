const ALLOWED_ORIGINS = [
  'https://lukecoopz.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Token, Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

const HISTORY_CACHE_SECONDS = 3600;

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function withCorsHeaders(response, corsHeaders) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) {
    headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

function historyCacheKey(url, projectCode) {
  return new Request(`${url.origin}/snapshot/${projectCode}/history`, { method: 'GET' });
}

async function handleSnapshotHistory(url, env, corsHeaders) {
  const parts = url.pathname.split('/').filter(Boolean);
  const projectCode = parts[1];
  if (!projectCode) {
    return jsonResponse({ error: 'Project code is required: /snapshot/{code}/history' }, 400, corsHeaders);
  }

  const cache = caches.default;
  const cacheKey = historyCacheKey(url, projectCode);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return withCorsHeaders(cached, corsHeaders);
  }

  const { results } = await env.DB.prepare(
    'SELECT date, suite_id, total, automated FROM snapshot_counts WHERE project = ? ORDER BY date ASC'
  ).bind(projectCode).all();

  const dateMap = new Map();
  for (const row of results) {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, {});
    }
    dateMap.get(row.date)[row.suite_id] = [row.total, row.automated];
  }

  const history = [];
  for (const [date, suites] of dateMap) {
    history.push({ date, suites });
  }

  const cacheable = new Response(JSON.stringify(history), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${HISTORY_CACHE_SECONDS}`,
    },
  });
  await cache.put(cacheKey, cacheable.clone());

  return withCorsHeaders(cacheable, corsHeaders);
}

async function handleSnapshotIngest(request, url, env, corsHeaders) {
  const authHeader = request.headers.get('Authorization') ?? '';
  const expectedToken = env.SNAPSHOT_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
  }

  const { project, date, suites, hierarchy } = body;
  if (!project || !date || !suites || typeof suites !== 'object') {
    return jsonResponse({ error: 'Required fields: project (string), date (YYYY-MM-DD), suites (object)' }, 400, corsHeaders);
  }

  const BATCH_SIZE = 500;
  const statements = [];

  for (const [suiteId, counts] of Object.entries(suites)) {
    const [total, automated] = counts;
    statements.push(
      env.DB.prepare(
        'INSERT OR REPLACE INTO snapshot_counts (project, suite_id, date, total, automated) VALUES (?, ?, ?, ?, ?)'
      ).bind(project, suiteId, date, total, automated)
    );
  }

  if (Array.isArray(hierarchy)) {
    for (const entry of hierarchy) {
      statements.push(
        env.DB.prepare(
          'INSERT OR REPLACE INTO suite_hierarchy (project, suite_id, parent_id) VALUES (?, ?, ?)'
        ).bind(project, String(entry.id), entry.parent_id != null ? String(entry.parent_id) : null)
      );
    }
  }

  let totalInserted = 0;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const batch = statements.slice(i, i + BATCH_SIZE);
    await env.DB.batch(batch);
    totalInserted += batch.length;
  }

  await caches.default.delete(historyCacheKey(url, project));

  return jsonResponse({ inserted: totalInserted, project, date }, 200, corsHeaders);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const corsHeaders = getCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/snapshot/ingest') {
      return handleSnapshotIngest(request, url, env, corsHeaders);
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (url.pathname.match(/^\/snapshot\/[^/]+\/history$/)) {
      return handleSnapshotHistory(url, env, corsHeaders);
    }

    if (url.pathname.startsWith('/snapshot/')) {
      return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
    }

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
