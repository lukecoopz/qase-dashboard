#!/usr/bin/env node
/**
 * One-time seed script — reads all existing JSON snapshot files and POSTs
 * them to the Cloudflare Worker's D1 ingest endpoint to backfill historical data.
 *
 * Env: WORKER_URL     (required — e.g. https://qase-dashboard.lukecoopz.workers.dev)
 *      SNAPSHOT_SECRET (required — auth token matching the worker secret)
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = join(__dirname, '..', 'public', 'data', 'snapshots');

const WORKER_URL = process.env.WORKER_URL;
const SNAPSHOT_SECRET = process.env.SNAPSHOT_SECRET;

if (!WORKER_URL || !SNAPSHOT_SECRET) {
  console.error('WORKER_URL and SNAPSHOT_SECRET env vars are required');
  process.exit(1);
}

async function ingest(project, date, suites) {
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

    console.log(`\nSeeding ${projectCode} (${history.length} entries)...`);

    for (const entry of history) {
      const suiteCount = Object.keys(entry.suites).length;
      if (suiteCount === 0) continue;

      try {
        const result = await ingest(projectCode, entry.date, entry.suites);
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
