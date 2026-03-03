import { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ProjectSelector from './components/ProjectSelector';
import { getProjects, getAllTestCases, getAllTestSuites } from './services/qaseApi';
import type { QaseProject, TestCase, TestSuite } from './types';
import './App.css';

type AppState = 'login' | 'selecting-project' | 'loading-data' | 'dashboard';

// Auto-populate token from env var during local development
const DEV_TOKEN = import.meta.env.VITE_QASE_API_TOKEN as string | undefined;
if (DEV_TOKEN && !localStorage.getItem('qase_api_token')) {
  localStorage.setItem('qase_api_token', DEV_TOKEN);
}

function App() {
  const [appState, setAppState] = useState<AppState>(() =>
    localStorage.getItem('qase_api_token') ? 'selecting-project' : 'login'
  );
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('qase_api_token'));
  const [projects, setProjects] = useState<QaseProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<QaseProject | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  // Load project list after login
  const loadProjects = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const projectList = await getProjects();
      setProjects(projectList);
      setAppState('selecting-project');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // Load test cases + suites for the selected project
  const loadProjectData = async (project: QaseProject) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setAppState('loading-data');
    setLoading(true);
    setError(null);
    setTestCases([]);
    setSuites([]);

    try {
      const cases = await getAllTestCases(project.code);
      setTestCases(cases);
      setLoading(false);
      setAppState('dashboard');

      // Load suites in background
      getAllTestSuites(project.code, cases).then(suiteData => {
        setSuites(suiteData);
        isLoadingRef.current = false;
      }).catch(err => {
        console.error('Error loading suites:', err);
        isLoadingRef.current = false;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data');
      setLoading(false);
      setAppState('selecting-project');
      isLoadingRef.current = false;
    }
  };

  const handleLogin = (newToken: string) => {
    setToken(newToken);
    setAppState('selecting-project');
  };

  const handleLogout = () => {
    localStorage.removeItem('qase_api_token');
    setToken(null);
    setProjects([]);
    setSelectedProject(null);
    setTestCases([]);
    setSuites([]);
    setAppState('login');
    isLoadingRef.current = false;
  };

  const handleProjectSelect = (project: QaseProject) => {
    setSelectedProject(project);
    loadProjectData(project);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setTestCases([]);
    setSuites([]);
    setAppState('selecting-project');
  };

  // On first load with a saved token, fetch projects
  useEffect(() => {
    if (token && appState === 'selecting-project' && projects.length === 0 && !isLoadingRef.current) {
      loadProjects();
    }
  }, [token]);

  if (appState === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  if (appState === 'selecting-project' || (appState === 'loading-data' && !selectedProject)) {
    if (loading && projects.length === 0) {
      return (
        <div className="app">
          <div className="app-header">
            <h1>Qase Dashboard</h1>
          </div>
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading projects...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="app">
          <div className="app-header">
            <h1>Qase Dashboard</h1>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
          <div className="error-container">
            <p>Error: {error}</p>
            <button onClick={loadProjects} className="retry-button">Retry</button>
          </div>
        </div>
      );
    }

    return <ProjectSelector projects={projects} onSelect={handleProjectSelect} onLogout={handleLogout} />;
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>Qase Dashboard</h1>
        <div className="suite-input-container">
          {selectedProject && (
            <button onClick={handleBackToProjects} className="back-button">
              ← Projects
            </button>
          )}
          {selectedProject && (
            <button onClick={() => loadProjectData(selectedProject)} className="refresh-button">
              Refresh
            </button>
          )}
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading {selectedProject?.title ?? 'project'}...</p>
        </div>
      )}

      {error && (
        <div className="error-container">
          <p>Error: {error}</p>
          {selectedProject && (
            <button onClick={() => loadProjectData(selectedProject)} className="retry-button">
              Retry
            </button>
          )}
        </div>
      )}

      {!loading && !error && selectedProject && (
        <Dashboard
          projectCode={selectedProject.code}
          projectTitle={selectedProject.title}
          suites={suites}
          testCases={testCases}
        />
      )}
    </div>
  );
}

export default App;
