import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = join(__dirname, '..', 'public', 'data', 'snapshots');

const app = express();
const PORT = 3001;

// Qase API configuration
const QASE_API_BASE = 'https://api.qase.io/v1';
const API_TOKEN = process.env.QASE_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ Error: QASE_API_TOKEN environment variable is not set');
  console.error('Please create a .env file with QASE_API_TOKEN=your_token_here');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Proxy endpoint for test cases
app.get('/api/case/:projectCode', async (req, res) => {
  try {
    const { projectCode } = req.params;
    const { suite_id, limit = 100, offset = 0 } = req.query;

    const url = new URL(`${QASE_API_BASE}/case/${projectCode}`);
    if (suite_id) url.searchParams.append('suite_id', suite_id);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());

    const response = await fetch(url.toString(), {
      headers: {
        'Token': API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Qase API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching test cases:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for a specific test suite
app.get('/api/suite/:projectCode/:suiteId', async (req, res) => {
  try {
    const { projectCode, suiteId } = req.params;

    const response = await fetch(`${QASE_API_BASE}/suite/${projectCode}/${suiteId}`, {
      headers: {
        'Token': API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Qase API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching test suite:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for a specific test case (with details and steps)
app.get('/api/case/:projectCode/:caseId', async (req, res) => {
  try {
    const { projectCode, caseId } = req.params;

    const response = await fetch(`${QASE_API_BASE}/case/${projectCode}/${caseId}`, {
      headers: {
        'Token': API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Qase API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching test case:', error);
    res.status(500).json({ error: error.message });
  }
});

// Snapshot counts: readonly, reads from local snapshot JSON files
// GET /api/snapshot/:projectCode?suite_id=123&date=2026-04-08
app.get('/api/snapshot/:projectCode', (req, res) => {
  try {
    const { projectCode } = req.params;
    const { suite_id, date } = req.query;

    if (!suite_id) {
      return res.status(400).json({ error: 'suite_id query parameter is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    }

    const filePath = join(SNAPSHOTS_DIR, `${projectCode}.json`);
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: `No snapshot data for project ${projectCode}` });
    }

    const history = JSON.parse(readFileSync(filePath, 'utf-8'));

    // Find exact date or fall back to most recent before it
    let entry = null;
    let lo = 0;
    let hi = history.length - 1;
    let best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (history[mid].date <= date) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (best >= 0) entry = history[best];

    if (!entry) {
      return res.status(404).json({ error: `No snapshot data on or before ${date}` });
    }

    const sid = String(suite_id);
    const counts = entry.suites[sid] || [0, 0];
    const [total, automated] = counts;

    res.json({
      project: projectCode,
      suite_id: sid,
      requested_date: date,
      snapshot_date: entry.date,
      total,
      automated,
      manual: total - automated,
    });
  } catch (error) {
    console.error('Error reading snapshot:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});

