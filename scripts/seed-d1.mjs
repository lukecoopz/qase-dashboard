#!/usr/bin/env node
/**
 * Seed script — fetches all test cases from Qase, computes historical
 * per-suite direct counts (from created_at dates), and POSTs them to D1.
 * Also posts the suite hierarchy for each project.
 *
 * This recomputes everything from the Qase API rather than reading JSON
 * files, ensuring clean direct counts with no parent rollup artifacts.
 *
 * Env: WORKER_URL      (required)
 *      SNAPSHOT_SECRET  (required)
 *      QASE_API_TOKEN   (required)
 */

const WORKER_URL = process.env.WORKER_URL;
const SNAPSHOT_SECRET = process.env.SNAPSHOT_SECRET;
const QASE_API_TOKEN = process.env.QASE_API_TOKEN;
const API_BASE = 'https://api.qase.io/v1';

if (!WORKER_URL || !SNAPSHOT_SECRET) {
  console.error('WORKER_URL and SNAPSHOT_SECRET env vars are required');
  process.exit(1);
}
if (!QASE_API_TOKEN) {
  console.error('QASE_API_TOKEN env var is required');
  process.exit(1);
}

async function fetchJSON(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { Token: QASE_API_TOKEN, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

async function fetchAllPaged(endpoint, limit = 100) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const first = await fetchJSON(`${endpoint}${sep}limit=${limit}&offset=0`);
  if (!first.status || !first.result) return [];

  const all = [...first.result.entities];
  const total = first.result.total;
  if (total <= limit) return all;

  const remaining = Math.ceil((total - limit) / limit);
  const pages = await Promise.all(
    Array.from({ length: remaining }, (_, i) =>
      fetchJSON(`${endpoint}${sep}limit=${limit}&offset=${(i + 1) * limit}`)
    )
  );
  for (const page of pages) {
    if (page.status && page.result) all.push(...page.result.entities);
  }
  return all;
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function ingest(project, date, suites, hierarchy) {
  const res = await fetch(`${WORKER_URL}/snapshot/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SNAPSHOT_SECRET}`,
    },
    body: JSON.stringify({ project, date, suites, hierarchy }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

async function seedProject(code) {
  console.log(`  Fetching data for ${code}...`);
  const [cases, suiteList] = await Promise.all([
    fetchAllPaged(`/case/${code}`),
    fetchAllPaged(`/suite/${code}`),
  ]);
  console.log(`  ${cases.length} test cases, ${suiteList.length} suites`);

  const hierarchy = suiteList.map(s => ({ id: s.id, parent_id: s.parent_id }));

  // Build historical entries from created_at dates (direct counts only)
  const dated = cases.filter(tc => tc.created_at);
  if (dated.length === 0) {
    // Still post hierarchy even if no test cases
    if (hierarchy.length > 0) {
      await ingest(code, toISO(new Date()), {}, hierarchy);
    }
    return 0;
  }

  dated.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const dateSet = new Set();
  for (const tc of dated) {
    dateSet.add(toISO(new Date(tc.created_at)));
  }
  const dates = [...dateSet].sort();

  // Compute cumulative direct counts at each date
  const cumSuites = {};
  let tcIdx = 0;
  let totalRows = 0;
  let isFirst = true;

  for (const date of dates) {
    while (tcIdx < dated.length && toISO(new Date(dated[tcIdx].created_at)) <= date) {
      const tc = dated[tcIdx];
      const sid = String(tc.suite_id);
      if (!cumSuites[sid]) cumSuites[sid] = [0, 0];
      cumSuites[sid][0] += 1;
      if (tc.automation === 2) cumSuites[sid][1] += 1;
      tcIdx++;
    }

    const snapshot = {};
    for (const [sid, counts] of Object.entries(cumSuites)) {
      snapshot[sid] = [counts[0], counts[1]];
    }

    try {
      const result = await ingest(code, date, snapshot, isFirst ? hierarchy : undefined);
      totalRows += result.inserted;
      isFirst = false;
      process.stdout.write('.');
    } catch (err) {
      console.error(`\n  Error seeding ${code} @ ${date}: ${err.message}`);
    }
  }

  // Also post today's live snapshot
  const today = toISO(new Date());
  if (!dateSet.has(today)) {
    const snapshot = {};
    for (const [sid, counts] of Object.entries(cumSuites)) {
      snapshot[sid] = [counts[0], counts[1]];
    }
    try {
      const result = await ingest(code, today, snapshot);
      totalRows += result.inserted;
      process.stdout.write('.');
    } catch (err) {
      console.error(`\n  Error seeding ${code} @ ${today}: ${err.message}`);
    }
  }

  console.log('');
  return totalRows;
}

async function main() {
  console.log('Fetching projects...');
  const projects = await fetchAllPaged('/project');
  console.log(`Found ${projects.length} projects\n`);

  let totalRows = 0;
  for (const project of projects) {
    console.log(`Seeding ${project.code} (${project.title})...`);
    try {
      totalRows += await seedProject(project.code);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  console.log(`\nDone. Inserted ${totalRows} total rows.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
