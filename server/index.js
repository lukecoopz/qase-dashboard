import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});

