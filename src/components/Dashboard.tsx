import { useState, useMemo } from 'react';
import type { TestSuite, TestCase, SuiteTreeNode } from '../types';
import { calculateStats, buildSuiteTree, filterSuiteTreeByRoot, getProgressAISuiteIds, getChildrenOnly } from '../services/qaseApi';
import StatCard from './StatCard';
import DistributionChart from './DistributionChart';
import SuiteFilter from './SuiteFilter';
import TestCaseList from './TestCaseList';

interface DashboardProps {
  suites: TestSuite[];
  testCases: TestCase[];
}

export default function Dashboard({ suites, testCases }: DashboardProps) {
  const [selectedSuiteIds, setSelectedSuiteIds] = useState<Set<number>>(new Set());

  // Build suite tree and filter to Progress AI suite group
  const { suiteTree, progressAITestCases } = useMemo(() => {
    const fullTree = buildSuiteTree(suites, testCases);
    // Filter to only show Progress AI suite (ID: 96) and its children
    const filtered = filterSuiteTreeByRoot(fullTree, 96);
    
    // If suite 96 not found, try to find it by searching for children that have parent_id = 96
    let progressAITree = filtered;
    if (filtered.length === 0) {
      // Find all suites that are children of suite 96
      const progressAIChildren = fullTree.flatMap(node => {
        const findChildrenOf96 = (n: SuiteTreeNode): SuiteTreeNode[] => {
          if (n.suite.parent_id === 96) {
            return [n];
          }
          return n.children.flatMap(findChildrenOf96);
        };
        return findChildrenOf96(node);
      });
      
      // If we found children of 96, create a parent node for it
      if (progressAIChildren.length > 0) {
        const progressAINode: SuiteTreeNode = {
          suite: {
            id: 96,
            title: 'Progress AI',
            parent_id: undefined,
          },
          children: progressAIChildren,
          testCount: 0,
          allDescendantTestCount: progressAIChildren.reduce((sum, child) => sum + child.allDescendantTestCount, 0),
        };
        progressAITree = [progressAINode];
      }
    }
    
    // Get all suite IDs that belong to Progress AI (including children)
    const progressAISuiteIds = getProgressAISuiteIds(progressAITree.length > 0 ? progressAITree : fullTree);
    
    // Filter test cases to only Progress AI suites
    const progressAITestCases = testCases.filter(tc => progressAISuiteIds.has(tc.suite_id));
    
    // Get only children (exclude the top-level Progress AI node)
    const childrenOnly = getChildrenOnly(progressAITree);
    
    return {
      suiteTree: childrenOnly,
      progressAITestCases,
    };
  }, [suites, testCases]);

  // Filter test cases based on selected suites (default to all Progress AI if nothing selected)
  const filteredCases = useMemo(() => {
    if (selectedSuiteIds.size === 0) {
      return progressAITestCases; // Show all Progress AI tests by default
    }
    return progressAITestCases.filter((tc) => selectedSuiteIds.has(tc.suite_id));
  }, [progressAITestCases, selectedSuiteIds]);

  // Calculate stats (always from filtered cases, default is all Progress AI)
  const filteredStats = useMemo(() => {
    return calculateStats(filteredCases);
  }, [filteredCases]);

  return (
    <div className="dashboard">
      {suiteTree.length > 0 && (
        <SuiteFilter
          suiteTree={suiteTree}
          testCases={progressAITestCases}
          selectedSuiteIds={selectedSuiteIds}
          onSelectionChange={setSelectedSuiteIds}
        />
      )}

      <div className="stats-grid">
        <StatCard
          title="Total Tests"
          value={filteredStats.totalTests}
          icon="📊"
          color="#8BE9FD"
        />
        <StatCard
          title="Automated"
          value={filteredStats.automatedTests}
          subtitle={`${filteredStats.automationPercentage}%`}
          icon="🤖"
          color="#50FA7B"
        />
        <StatCard
          title="Manual"
          value={filteredStats.manualTests}
          subtitle={`${100 - filteredStats.automationPercentage}%`}
          icon="👤"
          color="#FFB86C"
        />
        <StatCard
          title="Automation Rate"
          value={`${filteredStats.automationPercentage}%`}
          icon="⚡"
          color="#BD93F9"
        />
      </div>

      <div className="charts-grid">
        <DistributionChart
          title="By Status"
          data={filteredStats.byStatus}
          color="#FF79C6"
        />
        <DistributionChart
          title="By Priority"
          data={filteredStats.byPriority}
          color="#8BE9FD"
        />
        <DistributionChart
          title="By Severity"
          data={filteredStats.bySeverity}
          color="#FF5555"
        />
        <DistributionChart
          title="By Type"
          data={filteredStats.byType}
          color="#F1FA8C"
        />
      </div>

      <TestCaseList testCases={filteredCases} suiteTree={suiteTree} />
    </div>
  );
}

