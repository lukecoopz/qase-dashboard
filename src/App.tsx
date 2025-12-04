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
    // Only load on initial mount, not on re-renders
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

