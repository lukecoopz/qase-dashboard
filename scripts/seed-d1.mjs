#!/usr/bin/env node
/**
 * One-time seed script — reads existing JSON snapshot files, fetches suite
 * trees from Qase to un-roll parent counts, then POSTs direct-only counts
 * and hierarchy to the Cloudflare Worker's D1 ingest endpoint.
 *
 * Env: WORKER_URL      (required)
 *      SNAPSHOT_SECRET  (required)
 *      QASE_API_TOKEN   (required — to fetch suite trees for un-rolling)
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = join(__dirname, '..', 'public', 'data', 'snapshots');

const WORKER_URL = process.env.WORKER_URL;
const SNAPSHOT_SECRET = process.env.SNAPSHOT_SECRET;
const QASE_API_TOKEN = process.env.QASE_API_TOKEN;
const API_BASE = 'https://api.qase.io/v1';

if (!WORKER_URL || !SNAPSHOT_SECRET) {
  console.error('WORKER_URL and SNAPSHOT_SECRET env vars are required');
  process.exit(1);
}
if (!QASE_API_TOKEN) {
  console.error('QASE_API_TOKEN env var is required (to fetch suite trees)');
  process.exit(1);
}

async function fetchAllPaged(endpoint, limit = 100) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `${API_BASE}${endpoint}${sep}limit=${limit}&offset=0`;
  const res = await fetch(url, {
    headers: { Token: QASE_API_TOKEN, 'Content-Type': 'application/json' },
  });
  if (!res.ok) return [];
  const first = await res.json();
  if (!first.status || !first.result) return [];

  const all = [...first.result.entities];
  const total = first.result.total;
  if (total <= limit) return all;

  const remaining = Math.ceil((total - limit) / limit);
  const pages = await Promise.all(
    Array.from({ length: remaining }, (_, i) => {
      const pageUrl = `${API_BASE}${endpoint}${sep}limit=${limit}&offset=${(i + 1) * limit}`;
      return fetch(pageUrl, {
        headers: { Token: QASE_API_TOKEN, 'Content-Type': 'application/json' },
      }).then(r => r.json());
    })
  );
  for (const page of pages) {
    if (page.status && page.result) all.push(...page.result.entities);
  }
  return all;
}

/**
 * Reverse the rollUpParentCounts operation. For each leaf suite,
 * subtract its counts from all ancestors. This recovers direct counts
 * for parent suites that also have their own test cases.
 */
function unrollParentCounts(suiteCounts, childToParent) {
  const parentIds = new Set(childToParent.values());

  for (const [sid, counts] of Object.entries(suiteCounts)) {
    if (parentIds.has(sid)) continue;

    let current = sid;
    while (childToParent.has(current)) {
      const parentId = childToParent.get(current);
      if (suiteCounts[parentId]) {
        suiteCounts[parentId][0] -= counts[0];
        suiteCounts[parentId][1] -= counts[1];
      }
      current = parentId;
    }
  }
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

async function main() {
  const files = readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} snapshot files`);

  let totalRows = 0;

  for (const file of files) {
    const projectCode = file.replace('.json', '');
    const filePath = join(SNAPSHOTS_DIR, file);
    const history = JSON.parse(readFileSync(filePath, 'utf-8'));

    // Fetch suite tree to build hierarchy and un-roll counts
    console.log(`\nFetching suite tree for ${projectCode}...`);
    const suiteList = await fetchAllPaged(`/suite/${projectCode}`);
    const childToParent = new Map();
    for (const s of suiteList) {
      if (s.parent_id != null) {
        childToParent.set(String(s.id), String(s.parent_id));
      }
    }
    const hierarchy = suiteList.map(s => ({ id: s.id, parent_id: s.parent_id }));
    console.log(`  ${suiteList.length} suites, ${history.length} entries to seed`);

    for (const entry of history) {
      const suiteCount = Object.keys(entry.suites).length;
      if (suiteCount === 0) continue;

      // Deep-clone and un-roll parent counts to get direct counts
      const directSuites = {};
      for (const [sid, counts] of Object.entries(entry.suites)) {
        directSuites[sid] = [counts[0], counts[1]];
      }
      unrollParentCounts(directSuites, childToParent);

      // Remove suites with zero direct counts (pure parents)
      for (const [sid, counts] of Object.entries(directSuites)) {
        if (counts[0] === 0 && counts[1] === 0) {
          delete directSuites[sid];
        }
      }

      try {
        // Only send hierarchy with the first entry
        const result = await ingest(
          projectCode,
          entry.date,
          directSuites,
          entry === history[0] ? hierarchy : undefined
        );
        totalRows += result.inserted;
        process.stdout.write('.');
      } catch (err) {
        console.error(`\n  Error seeding ${projectCode} @ ${entry.date}: ${err.message}`);
      }
    }
    console.log('');
  }

  console.log(`\nDone. Inserted ${totalRows} total rows.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
