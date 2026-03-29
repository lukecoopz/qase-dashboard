#!/usr/bin/env node
/**
 * Daily snapshot script — fetches all Qase projects and their test cases,
 * then writes per-suite [total, automated] counts into per-project JSON files
 * at public/data/snapshots/{PROJECT_CODE}.json.
 *
 * Env: QASE_API_TOKEN (required)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = join(__dirname, '..', 'public', 'data', 'snapshots');

const API_BASE = 'https://qase-dashboard.lukecoopz.workers.dev';
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

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function snapshotProject(code) {
  console.log(`  Fetching cases for ${code}...`);
  const cases = await fetchAllPaged(`/case/${code}`);
  console.log(`  Got ${cases.length} test cases`);

  const suites = {};
  for (const tc of cases) {
    const sid = String(tc.suite_id);
    if (!suites[sid]) suites[sid] = [0, 0];
    suites[sid][0] += 1;
    if (tc.automation === 2) suites[sid][1] += 1;
  }

  const filePath = join(SNAPSHOTS_DIR, `${code}.json`);
  let history = [];
  if (existsSync(filePath)) {
    try {
      history = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
      history = [];
    }
  }

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
