/**
 * Simple Express proxy server for Qase API
 * Deploy this to any Node.js hosting service (Render, Railway, Fly.io, etc.)
 * Set QASE_API_TOKEN as an environment variable
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const QASE_API_BASE = 'https://api.qase.io/v1';
const API_TOKEN = process.env.QASE_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ Error: QASE_API_TOKEN environment variable is not set');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Proxy endpoint - matches Qase API structure
app.get('/api/*', async (req, res) => {
  try {
    // Extract the path after /api/
    const qasePath = req.path.replace('/api', '');
    const url = `${QASE_API_BASE}${qasePath}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;

    const response = await fetch(url, {
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
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
});

