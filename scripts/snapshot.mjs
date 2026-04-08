#!/usr/bin/env node
/**
 * Daily snapshot script — fetches all Qase projects and their test cases,
 * computes per-suite [total, automated] counts (with parent rollup), and
 * POSTs the data to the Cloudflare Worker for D1 storage.
 *
 * Env: QASE_API_TOKEN  (required)
 *      WORKER_URL      (required — Cloudflare Worker base URL)
 *      SNAPSHOT_SECRET  (required — auth token for D1 ingest endpoint)
 */

const API_BASE = 'https://api.qase.io/v1';
const TOKEN = process.env.QASE_API_TOKEN;
const WORKER_URL = process.env.WORKER_URL;
const SNAPSHOT_SECRET = process.env.SNAPSHOT_SECRET;

if (!TOKEN) {
  console.error('QASE_API_TOKEN env var is required');
  process.exit(1);
}
if (!WORKER_URL || !SNAPSHOT_SECRET) {
  console.error('WORKER_URL and SNAPSHOT_SECRET env vars are required');
  process.exit(1);
}

async function fetchJSON(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { Token: TOKEN, 'Content-Type': 'application/json' },
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

function buildSuiteTree(suites) {
  const childToParent = new Map();
  for (const s of suites) {
    if (s.parent_id != null) {
      childToParent.set(String(s.id), String(s.parent_id));
    }
  }
  return childToParent;
}

function rollUpParentCounts(suiteCounts, childToParent) {
  for (const [sid, counts] of Object.entries(suiteCounts)) {
    let current = sid;
    while (childToParent.has(current)) {
      const parentId = childToParent.get(current);
      if (!suiteCounts[parentId]) suiteCounts[parentId] = [0, 0];
      suiteCounts[parentId][0] += counts[0];
      suiteCounts[parentId][1] += counts[1];
      current = parentId;
    }
  }
}

async function postToD1(project, date, suites) {
  const res = await fetch(`${WORKER_URL}/snapshot/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SNAPSHOT_SECRET}`,
    },
    body: JSON.stringify({ project, date, suites }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 ingest failed (${res.status}): ${text}`);
  }
  const result = await res.json();
  console.log(`  D1: inserted ${result.inserted} rows for ${project} @ ${date}`);
}

async function snapshotProject(code) {
  console.log(`  Fetching cases for ${code}...`);
  const [cases, suiteList] = await Promise.all([
    fetchAllPaged(`/case/${code}`),
    fetchAllPaged(`/suite/${code}`),
  ]);
  console.log(`  Got ${cases.length} test cases, ${suiteList.length} suites`);

  const childToParent = buildSuiteTree(suiteList);

  const suites = {};
  for (const tc of cases) {
    const sid = String(tc.suite_id);
    if (!suites[sid]) suites[sid] = [0, 0];
    suites[sid][0] += 1;
    if (tc.automation === 2) suites[sid][1] += 1;
  }
  rollUpParentCounts(suites, childToParent);

  const date = toISO(new Date());
  await postToD1(code, date, suites);
}

async function main() {
  console.log('Fetching projects...');
  const projects = await fetchAllPaged('/project');
  console.log(`Found ${projects.length} projects: ${projects.map(p => p.code).join(', ')}`);

  for (const project of projects) {
    console.log(`\nSnapshotting ${project.code} (${project.title})...`);
    try {
      await snapshotProject(project.code);
    } catch (err) {
      console.error(`  Error snapshotting ${project.code}: ${err.message}`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
