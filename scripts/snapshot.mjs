#!/usr/bin/env node
/**
 * Daily snapshot script — fetches all Qase projects and their test cases,
 * then writes per-suite [total, automated] counts into per-project JSON files
 * at public/data/snapshots/{PROJECT_CODE}.json.
 *
 * On first run (or when few entries exist), backfills historical data by
 * computing cumulative per-suite counts at each created_at date.
 *
 * Env: QASE_API_TOKEN (required)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = join(__dirname, '..', 'public', 'data', 'snapshots');

const API_BASE = 'https://api.qase.io/v1';
const TOKEN = process.env.QASE_API_TOKEN;
if (!TOKEN) {
  console.error('QASE_API_TOKEN env var is required');
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

function todayISO() {
  return toISO(new Date());
}

/**
 * Build a map of parent_id → [child_id, ...] from the suite list.
 * Returns { childToParent, allParents } where allParents is the set of
 * suite IDs that have at least one child.
 */
function buildSuiteTree(suites) {
  const childToParent = new Map();
  for (const s of suites) {
    if (s.parent_id != null) {
      childToParent.set(String(s.id), String(s.parent_id));
    }
  }
  return childToParent;
}

/**
 * Given leaf-level suite counts and the child→parent map, roll up totals
 * so every ancestor suite includes the sum of all its descendants.
 * Mutates suiteCounts in place.
 */
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

/**
 * Build historical snapshot entries from created_at dates.
 * For each unique creation date, compute cumulative per-suite counts
 * up to and including that date (using current automation status).
 */
function buildBackfill(cases, childToParent) {
  const dated = cases.filter(tc => tc.created_at);
  if (dated.length === 0) return [];

  dated.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const dateSet = new Set();
  for (const tc of dated) {
    dateSet.add(toISO(new Date(tc.created_at)));
  }
  const dates = [...dateSet].sort();

  const entries = [];
  const cumSuites = {};

  let idx = 0;
  for (const date of dates) {
    while (idx < dated.length && toISO(new Date(dated[idx].created_at)) <= date) {
      const tc = dated[idx];
      const sid = String(tc.suite_id);
      if (!cumSuites[sid]) cumSuites[sid] = [0, 0];
      cumSuites[sid][0] += 1;
      if (tc.automation === 2) cumSuites[sid][1] += 1;
      idx++;
    }

    const snapshot = {};
    for (const [sid, counts] of Object.entries(cumSuites)) {
      snapshot[sid] = [counts[0], counts[1]];
    }
    rollUpParentCounts(snapshot, childToParent);
    entries.push({ date, suites: snapshot });
  }

  return entries;
}

async function snapshotProject(code) {
  console.log(`  Fetching cases for ${code}...`);
  const [cases, suiteList] = await Promise.all([
    fetchAllPaged(`/case/${code}`),
    fetchAllPaged(`/suite/${code}`),
  ]);
  console.log(`  Got ${cases.length} test cases, ${suiteList.length} suites`);

  const childToParent = buildSuiteTree(suiteList);

  const filePath = join(SNAPSHOTS_DIR, `${code}.json`);
  let history = [];
  if (existsSync(filePath)) {
    try {
      history = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
      history = [];
    }
  }

  // Backfill if we have fewer than 7 real snapshot entries
  if (history.length < 7 && cases.length > 0) {
    const backfilled = buildBackfill(cases, childToParent);
    console.log(`  Backfilling ${backfilled.length} historical entries`);
    const existingDates = new Set(history.map(e => e.date));
    for (const entry of backfilled) {
      if (!existingDates.has(entry.date)) {
        history.push(entry);
      }
    }
  }

  // Today's live snapshot (overrides any backfill for today)
  const suites = {};
  for (const tc of cases) {
    const sid = String(tc.suite_id);
    if (!suites[sid]) suites[sid] = [0, 0];
    suites[sid][0] += 1;
    if (tc.automation === 2) suites[sid][1] += 1;
  }
  rollUpParentCounts(suites, childToParent);

  const date = todayISO();
  const idx = history.findIndex(e => e.date === date);
  const entry = { date, suites };
  if (idx >= 0) {
    history[idx] = entry;
  } else {
    history.push(entry);
  }

  history.sort((a, b) => a.date.localeCompare(b.date));
  writeFileSync(filePath, JSON.stringify(history, null, 2) + '\n');
  console.log(`  Wrote ${filePath} (${history.length} entries)`);
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
