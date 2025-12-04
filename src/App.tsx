import { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import { getAllTestCases, getAllTestSuites } from './services/qaseApi';
import type { TestCase, TestSuite } from './types';
import './App.css';

function App() {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Always load data on mount - token comes from GitHub secret via proxy
    if (!hasLoadedRef.current) {
      loadData();
      hasLoadedRef.current = true;
    }
  }, []);

  const loadData = async () => {
    // Prevent multiple simultaneous API calls
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      // First get all test cases
      const cases = await getAllTestCases();
      setTestCases(cases);
      setLoading(false); // Show dashboard as soon as test cases are loaded
      
      // Then get suites based on the test cases we found (in background)
      // Include suite ID 96 (Progress AI) even if it doesn't have direct test cases
      getAllTestSuites(cases, [96]).then(suiteData => {
        setSuites(suiteData);
        isLoadingRef.current = false;
      }).catch(err => {
        console.error('Error loading suites:', err);
        isLoadingRef.current = false;
        // Don't fail the whole app if suites fail to load
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Check if proxy is configured
  const proxyConfigured = import.meta.env.VITE_PROXY_BASE_URL;

  if (!proxyConfigured) {
    return (
      <div className="app">
        <div className="error-container" style={{ maxWidth: '800px', margin: '4rem auto' }}>
          <h2 style={{ color: '#FF5555', marginBottom: '1rem' }}>⚠️ Proxy Server Not Configured</h2>
          <p style={{ color: '#F8F8F2', marginBottom: '1.5rem' }}>
            The proxy server URL is not configured. Please set up the proxy server and add <code style={{ background: 'rgba(139, 233, 253, 0.2)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>VITE_PROXY_BASE_URL</code> as a GitHub secret.
          </p>
          <div style={{ background: 'rgba(139, 233, 253, 0.1)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(139, 233, 253, 0.2)' }}>
            <h3 style={{ color: '#8BE9FD', marginTop: 0 }}>Setup Instructions:</h3>
            <ol style={{ color: '#F8F8F2', lineHeight: '1.8' }}>
              <li>Deploy the proxy server (see <code>proxy-server.js</code>) to Render, Railway, or Fly.io</li>
              <li>Set <code>QASE_API_TOKEN</code> environment variable on your hosting service</li>
              <li>Add <code>VITE_PROXY_BASE_URL</code> as a GitHub secret pointing to your proxy URL</li>
              <li>Redeploy GitHub Pages</li>
            </ol>
            <p style={{ color: '#6272A4', marginTop: '1rem', fontSize: '0.9rem' }}>
              See <code>QUICK_START.md</code> for detailed instructions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>Qase Dashboard</h1>
        <div className="suite-input-container">
          <button onClick={loadData} className="refresh-button">
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading test cases...</p>
        </div>
      )}

      {error && (
        <div className="error-container">
          <p>Error: {error}</p>
          <button onClick={loadData} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <Dashboard suites={suites} testCases={testCases} />
      )}
    </div>
  );
}

export default App;

