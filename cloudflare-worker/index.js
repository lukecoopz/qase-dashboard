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

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function handleSnapshotRead(url, env, corsHeaders) {
  const parts = url.pathname.split('/').filter(Boolean);
  const projectCode = parts[1];
  if (!projectCode) {
    return jsonResponse({ error: 'Project code is required: /snapshot/{code}?suite_id=…&date=…' }, 400, corsHeaders);
  }

  const suiteId = url.searchParams.get('suite_id');
  const date = url.searchParams.get('date');
  if (!suiteId) {
    return jsonResponse({ error: 'suite_id query parameter is required' }, 400, corsHeaders);
  }
  if (!date) {
    return jsonResponse({ error: 'date query parameter is required (YYYY-MM-DD)' }, 400, corsHeaders);
  }

  const row = await env.DB.prepare(
    'SELECT project, suite_id, date, total, automated FROM snapshot_counts WHERE project = ? AND suite_id = ? AND date <= ? ORDER BY date DESC LIMIT 1'
  ).bind(projectCode, suiteId, date).first();

  if (!row) {
    return jsonResponse({ error: `No snapshot data for project ${projectCode} suite ${suiteId} on or before ${date}` }, 404, corsHeaders);
  }

  return jsonResponse({
    project: row.project,
    suite_id: row.suite_id,
    requested_date: date,
    snapshot_date: row.date,
    total: row.total,
    automated: row.automated,
    manual: row.total - row.automated,
  }, 200, corsHeaders);
}

async function handleSnapshotHistory(url, env, corsHeaders) {
  const parts = url.pathname.split('/').filter(Boolean); // ["snapshot", "PAS", "history"]
  const projectCode = parts[1];
  if (!projectCode) {
    return jsonResponse({ error: 'Project code is required: /snapshot/{code}/history' }, 400, corsHeaders);
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

  return jsonResponse(history, 200, corsHeaders);
}

async function handleSnapshotIngest(request, env, corsHeaders) {
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

  const { project, date, suites } = body;
  if (!project || !date || !suites || typeof suites !== 'object') {
    return jsonResponse({ error: 'Required fields: project (string), date (YYYY-MM-DD), suites (object)' }, 400, corsHeaders);
  }

  const statements = [];
  for (const [suiteId, counts] of Object.entries(suites)) {
    const [total, automated] = counts;
    statements.push(
      env.DB.prepare(
        'INSERT OR REPLACE INTO snapshot_counts (project, suite_id, date, total, automated) VALUES (?, ?, ?, ?, ?)'
      ).bind(project, suiteId, date, total, automated)
    );
  }

  if (statements.length === 0) {
    return jsonResponse({ inserted: 0 }, 200, corsHeaders);
  }

  // D1 batch limit is 500 statements per call
  const BATCH_SIZE = 500;
  let totalInserted = 0;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const batch = statements.slice(i, i + BATCH_SIZE);
    await env.DB.batch(batch);
    totalInserted += batch.length;
  }

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

    // Snapshot ingest (POST)
    if (request.method === 'POST' && url.pathname === '/snapshot/ingest') {
      return handleSnapshotIngest(request, env, corsHeaders);
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Snapshot history (GET /snapshot/{code}/history)
    if (url.pathname.match(/^\/snapshot\/[^/]+\/history$/)) {
      return handleSnapshotHistory(url, env, corsHeaders);
    }

    // Snapshot read (GET /snapshot/{code}?suite_id=…&date=…)
    if (url.pathname.startsWith('/snapshot/')) {
      return handleSnapshotRead(url, env, corsHeaders);
    }

    // Default: proxy to Qase API
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
