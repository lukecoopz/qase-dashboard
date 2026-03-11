import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const navigate = useNavigate();
  const location = useLocation();

  const [appState, setAppState] = useState<AppState>(() =>
    localStorage.getItem('qase_api_token') ? 'selecting-project' : 'login'
  );
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('qase_api_token'));
  const [projects, setProjects] = useState<QaseProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<QaseProject | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(false);
  const [suitesLoading, setSuitesLoading] = useState(false);
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
    setSuitesLoading(true);
    setError(null);
    setTestCases([]);
    setSuites([]);

    try {
      const cases = await getAllTestCases(project.code);
      setTestCases(cases);
      setLoading(false);
      setAppState('dashboard');

      // Load suites in background
      getAllTestSuites(project.code).then(suiteData => {
        setSuites(suiteData);
        setSuitesLoading(false);
        isLoadingRef.current = false;
      }).catch(err => {
        console.error('Error loading suites:', err);
        setSuitesLoading(false);
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
    navigate('/projects');
  };

  const handleLogout = () => {
    localStorage.removeItem('qase_api_token');
    setToken(null);
    setProjects([]);
    setSelectedProject(null);
    setTestCases([]);
    setSuites([]);
    setSuitesLoading(false);
    setAppState('login');
    isLoadingRef.current = false;
    navigate('/');
  };

  const handleProjectSelect = (project: QaseProject) => {
    setSelectedProject(project);
    navigate(`/${project.code}`);
    loadProjectData(project);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setTestCases([]);
    setSuites([]);
    setSuitesLoading(false);
    setAppState('selecting-project');
    navigate('/projects');
  };

  // On first load with a saved token, fetch projects
  useEffect(() => {
    if (token && appState === 'selecting-project' && projects.length === 0 && !isLoadingRef.current) {
      loadProjects();
    }
  }, [token]);

  // After projects load, check if the URL points to a specific project and auto-load it
  useEffect(() => {
    if (appState !== 'selecting-project' || projects.length === 0) return;
    const parts = location.pathname.split('/').filter(Boolean);
    // parts[0] = project code (basename is stripped by React Router)
    if (parts.length === 0 || parts[0] === 'projects') return;
    const code = parts[0];
    const project = projects.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (project) {
      setSelectedProject(project);
      loadProjectData(project);
      // Don't navigate — keep the URL as-is so Dashboard can restore section/drillPath
    }
  }, [projects, appState]);

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
          suitesLoading={suitesLoading}
        />
      )}
    </div>
  );
}

export default App;
