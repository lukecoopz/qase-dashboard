const QASE_API_BASE = 'https://api.qase.io/v1';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_TOKEN = process.env.QASE_API_TOKEN;
  if (!API_TOKEN) {
    return res.status(500).json({ error: 'API token not configured' });
  }

  try {
    const projectCode = req.query.projectCode || req.query['projectCode'];
    const caseId = req.query.caseId || req.query['caseId'];

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
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    res.status(200).json(data);
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: error.message });
  }
}

