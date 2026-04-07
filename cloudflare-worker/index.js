const ALLOWED_ORIGINS = [
  'https://lukecoopz.github.io',
  'http://localhost:5173',
  'http://localhost:4173', // vite preview
];

const SNAPSHOTS_BASE = 'https://lukecoopz.github.io/qase-dashboard/data/snapshots';

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Token, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function handleSnapshot(url, corsHeaders) {
  const parts = url.pathname.split('/').filter(Boolean); // ["snapshot", "PAS"]
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

  const snapshotRes = await fetch(`${SNAPSHOTS_BASE}/${projectCode}.json`);
  if (!snapshotRes.ok) {
    return jsonResponse({ error: `No snapshot data for project ${projectCode}` }, 404, corsHeaders);
  }

  const history = await snapshotRes.json();

  let best = -1;
  let lo = 0;
  let hi = history.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (history[mid].date <= date) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (best < 0) {
    return jsonResponse({ error: `No snapshot data on or before ${date}` }, 404, corsHeaders);
  }

  const entry = history[best];
  const sid = String(suiteId);
  const counts = entry.suites[sid] || [0, 0];
  const [total, automated] = counts;

  return jsonResponse({
    project: projectCode,
    suite_id: sid,
    requested_date: date,
    snapshot_date: entry.date,
    total,
    automated,
    manual: total - automated,
  }, 200, corsHeaders);
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

    // Snapshot endpoint — reads static JSON from GitHub Pages, no Qase token needed
    if (url.pathname.startsWith('/snapshot/')) {
      return handleSnapshot(url, corsHeaders);
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
