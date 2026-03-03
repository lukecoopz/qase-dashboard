import { useState, useMemo } from 'react';
import type { TestSuite, TestCase, SuiteTreeNode } from '../types';
import { calculateStats, buildSuiteTree, getAllDescendantSuiteIds } from '../services/qaseApi';
import AutomationOverviewWidget from './AutomationOverviewWidget';
import TestCaseList from './TestCaseList';

interface DashboardProps {
  projectCode: string;
  projectTitle: string;
  suites: TestSuite[];
  testCases: TestCase[];
}

export default function Dashboard({ projectCode, projectTitle, suites, testCases }: DashboardProps) {
  // drillPath is the breadcrumb stack of suites the user has navigated into.
  // Empty = project root level.
  const [drillPath, setDrillPath] = useState<SuiteTreeNode[]>([]);

  // Build the full tree once
  const fullTree = useMemo(() => buildSuiteTree(suites, testCases), [suites, testCases]);

  // Current level nodes to display
  const currentNodes = useMemo(() => {
    if (drillPath.length === 0) return fullTree;
    return drillPath[drillPath.length - 1].children;
  }, [drillPath, fullTree]);

  // All suite IDs in scope at the current level (this suite + all descendants)
  const scopedSuiteIds = useMemo(() => {
    if (drillPath.length === 0) {
      const ids = new Set<number>();
      const collect = (nodes: SuiteTreeNode[]) => {
        nodes.forEach(n => {
          ids.add(n.suite.id);
          collect(n.children);
        });
      };
      collect(fullTree);
      return ids;
    }
    const currentNode = drillPath[drillPath.length - 1];
    return new Set(getAllDescendantSuiteIds(currentNode.suite.id, fullTree));
  }, [drillPath, fullTree]);

  // Test cases in scope for stats
  const scopedTestCases = useMemo(
    () => testCases.filter(tc => scopedSuiteIds.has(tc.suite_id)),
    [testCases, scopedSuiteIds]
  );

  const stats = useMemo(() => calculateStats(scopedTestCases), [scopedTestCases]);

  const handleDrillDown = (node: SuiteTreeNode) => {
    setDrillPath(prev => [...prev, node]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setDrillPath(prev => prev.slice(0, index + 1));
  };

  return (
    <div className="dashboard">
      {/* Breadcrumb */}
      <nav className="drill-breadcrumb" aria-label="Suite navigation">
        <button
          className={`drill-breadcrumb-item ${drillPath.length === 0 ? 'active' : ''}`}
          onClick={() => setDrillPath([])}
        >
          {projectTitle}
        </button>
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
      </nav>

      {/* Stats for current scope */}
      <AutomationOverviewWidget stats={stats} />

      {/* Suite cards at current level */}
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

      {/* Test case list for current scope */}
      <TestCaseList
        testCases={scopedTestCases}
        suiteTree={currentNodes.length > 0 ? currentNodes : fullTree}
        projectCode={projectCode}
      />
    </div>
  );
}
