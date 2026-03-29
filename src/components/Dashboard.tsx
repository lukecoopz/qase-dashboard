import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { TestSuite, TestCase, SuiteTreeNode } from '../types';
import { calculateStats, buildSuiteTree, getAllDescendantSuiteIds } from '../services/qaseApi';
import AutomationOverviewWidget from './AutomationOverviewWidget';
import TestCaseList from './TestCaseList';
import TestRunsView from './TestRunsView';
import TestGrowthChart from './TestGrowthChart';

type Section = 'home' | 'suites' | 'runs';

interface DashboardProps {
  projectCode: string;
  projectTitle: string;
  suites: TestSuite[];
  testCases: TestCase[];
  suitesLoading?: boolean;
}

function sectionFromPath(pathname: string): Section {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[1] === 'suites') return 'suites';
  if (parts[1] === 'runs') return 'runs';
  return 'home';
}

export default function Dashboard({ projectCode, projectTitle, suites, testCases, suitesLoading }: DashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Initialise section from URL immediately to avoid flash
  const [section, setSection] = useState<Section>(() => sectionFromPath(location.pathname));
  const [drillPath, setDrillPath] = useState<SuiteTreeNode[]>([]);
  const hasRestoredDrillPath = useRef(false);

  const fullTree = useMemo(() => buildSuiteTree(suites, testCases), [suites, testCases]);

  const currentNodes = useMemo(() => {
    if (drillPath.length === 0) return fullTree;
    return drillPath[drillPath.length - 1].children;
  }, [drillPath, fullTree]);

  const scopedSuiteIds = useMemo(() => {
    if (drillPath.length === 0) {
      const ids = new Set<number>();
      const collect = (nodes: SuiteTreeNode[]) => {
        nodes.forEach(n => { ids.add(n.suite.id); collect(n.children); });
      };
      collect(fullTree);
      return ids;
    }
    const currentNode = drillPath[drillPath.length - 1];
    return new Set(getAllDescendantSuiteIds(currentNode.suite.id, fullTree));
  }, [drillPath, fullTree]);

  const scopedTestCases = useMemo(
    () => testCases.filter(tc => scopedSuiteIds.has(tc.suite_id)),
    [testCases, scopedSuiteIds]
  );

  const stats = useMemo(() => calculateStats(scopedTestCases), [scopedTestCases]);
  const projectStats = useMemo(() => calculateStats(testCases), [testCases]);

  // Restore drillPath from URL once suites have loaded
  useEffect(() => {
    if (suitesLoading || hasRestoredDrillPath.current || fullTree.length === 0) return;
    hasRestoredDrillPath.current = true;

    const parts = location.pathname.split('/').filter(Boolean);
    // parts: [projectCode, 'suites', id1, id2, ...]
    if (parts[1] !== 'suites' || parts.length < 3) return;

    const suiteIds = parts.slice(2).map(Number).filter(Boolean);
    if (suiteIds.length === 0) return;

    const path: SuiteTreeNode[] = [];
    let nodes = fullTree;
    for (const id of suiteIds) {
      const node = nodes.find(n => n.suite.id === id);
      if (!node) break;
      path.push(node);
      nodes = node.children;
    }
    if (path.length > 0) setDrillPath(path);
  }, [suitesLoading, fullTree]);

  // ── Navigation helpers ──────────────────────────────────────────────────────

  const navToSection = (s: Section) => {
    setSection(s);
    if (s === 'suites') navigate(`/${projectCode}/suites`);
    else if (s === 'runs') navigate(`/${projectCode}/runs`);
    else navigate(`/${projectCode}`);
  };

  const handleDrillDown = (node: SuiteTreeNode) => {
    const newPath = [...drillPath, node];
    setDrillPath(newPath);
    navigate(`/${projectCode}/suites/${newPath.map(n => n.suite.id).join('/')}`);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = drillPath.slice(0, index + 1);
    setDrillPath(newPath);
    navigate(`/${projectCode}/suites/${newPath.map(n => n.suite.id).join('/')}`, { replace: true });
  };

  const handleSuitesRoot = () => {
    setDrillPath([]);
    navigate(`/${projectCode}/suites`, { replace: true });
  };

  const handleSectionBack = () => {
    setSection('home');
    setDrillPath([]);
    navigate(`/${projectCode}`, { replace: true });
  };

  return (
    <div className="dashboard">
      {/* Breadcrumb */}
      <nav className="drill-breadcrumb" aria-label="Navigation">
        <button
          className={`drill-breadcrumb-item ${section === 'home' ? 'active' : ''}`}
          onClick={handleSectionBack}
        >
          {projectTitle}
        </button>
        {section === 'suites' && (
          <>
            <span className="drill-breadcrumb-entry">
              <span className="drill-breadcrumb-sep">›</span>
              <button
                className={`drill-breadcrumb-item ${drillPath.length === 0 ? 'active' : ''}`}
                onClick={handleSuitesRoot}
              >
                Test Suites
              </button>
            </span>
            {drillPath.map((node, i) => (
              <span key={node.suite.id} className="drill-breadcrumb-entry">
                <span className="drill-breadcrumb-sep">›</span>
                <button
                  className={`drill-breadcrumb-item ${i === drillPath.length - 1 ? 'active' : ''}`}
                  onClick={() => handleBreadcrumbClick(i)}
                >
                  {node.suite.title}
                </button>
              </span>
            ))}
          </>
        )}
        {section === 'runs' && (
          <span className="drill-breadcrumb-entry">
            <span className="drill-breadcrumb-sep">›</span>
            <button className="drill-breadcrumb-item active">Test Runs</button>
          </span>
        )}
      </nav>

      {/* Home: overview stats + 2 section nav cards */}
      {section === 'home' && (
        <>
          <AutomationOverviewWidget stats={projectStats} />
          <TestGrowthChart testCases={testCases} projectCode={projectCode} scopedSuiteIds={scopedSuiteIds} />
          <div className="section-nav-grid">
            <button
              className="section-nav-card"
              onClick={() => navToSection('suites')}
            >
              <div className="section-nav-card-icon">🗂</div>
              <div className="section-nav-card-content">
                <div className="section-nav-card-title">Test Suites</div>
                <div className="section-nav-card-sub">
                  Browse and drill into test suite structure
                </div>
              </div>
              <span className="section-nav-card-arrow">›</span>
            </button>

            <button
              className="section-nav-card"
              onClick={() => navToSection('runs')}
            >
              <div className="section-nav-card-icon">▶</div>
              <div className="section-nav-card-content">
                <div className="section-nav-card-title">Test Runs</div>
                <div className="section-nav-card-sub">
                  View execution history and run results
                </div>
              </div>
              <span className="section-nav-card-arrow">›</span>
            </button>
          </div>
        </>
      )}

      {/* Suites section */}
      {section === 'suites' && (
        <>
          <AutomationOverviewWidget stats={stats} />
          <TestGrowthChart testCases={scopedTestCases} projectCode={projectCode} scopedSuiteIds={scopedSuiteIds} />

          {suitesLoading ? (
            <div className="suites-loading">
              <div className="spinner"></div>
              <p>Loading suites...</p>
            </div>
          ) : (
            <>
              {currentNodes.length > 0 && (
                <div className="suite-browser">
                  <h2 className="suite-browser-heading">
                    {drillPath.length === 0
                      ? 'Suites'
                      : `Suites in "${drillPath[drillPath.length - 1].suite.title}"`}
                  </h2>
                  <div className="suite-browser-grid">
                    {currentNodes.map(node => {
                      const nodeSuiteIds = new Set(getAllDescendantSuiteIds(node.suite.id, fullTree));
                      const nodeTestCases = testCases.filter(tc => nodeSuiteIds.has(tc.suite_id));
                      const nodeStats = calculateStats(nodeTestCases);
                      const automatedPct = nodeStats.totalTests > 0
                        ? Math.round((nodeStats.automatedTests / nodeStats.totalTests) * 100)
                        : 0;
                      const canDrillDown = node.children.length > 0;

                      return (
                        <button
                          key={node.suite.id}
                          className={`suite-card ${canDrillDown ? 'has-children' : ''}`}
                          onClick={() => canDrillDown && handleDrillDown(node)}
                          disabled={!canDrillDown && node.allDescendantTestCount === 0}
                        >
                          <div className="suite-card-header">
                            <span className="suite-card-title">{node.suite.title}</span>
                            {canDrillDown && <span className="suite-card-arrow">›</span>}
                          </div>
                          <div className="suite-card-stats">
                            <span className="suite-card-count">{node.allDescendantTestCount} tests</span>
                            {nodeStats.totalTests > 0 && (
                              <span className="suite-card-auto">{automatedPct}% automated</span>
                            )}
                          </div>
                          {nodeStats.totalTests > 0 && (
                            <div className="suite-card-bar">
                              <div
                                className="suite-card-bar-fill"
                                style={{ width: `${automatedPct}%` }}
                              />
                            </div>
                          )}
                          {canDrillDown && (
                            <div className="suite-card-sub">
                              {node.children.length} sub-suite{node.children.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <TestCaseList
                testCases={scopedTestCases}
                suiteTree={currentNodes.length > 0 ? currentNodes : fullTree}
                projectCode={projectCode}
              />
            </>
          )}
        </>
      )}

      {/* Runs section */}
      {section === 'runs' && (
        <TestRunsView projectCode={projectCode} testCases={testCases} />
      )}
    </div>
  );
}
