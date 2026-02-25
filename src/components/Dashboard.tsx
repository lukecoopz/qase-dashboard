import { useState, useMemo } from 'react';
import type { TestSuite, TestCase, SuiteTreeNode } from '../types';
import { calculateStats, buildSuiteTree, filterSuiteTreeByRoot, getProgressAISuiteIds, getChildrenOnly } from '../services/qaseApi';
import AutomationOverviewWidget from './AutomationOverviewWidget';
import SuiteFilter from './SuiteFilter';
import TestCaseList from './TestCaseList';

interface DashboardProps {
  suites: TestSuite[];
  testCases: TestCase[];
}

export default function Dashboard({ suites, testCases }: DashboardProps) {
  const [selectedSuiteIds, setSelectedSuiteIds] = useState<Set<number>>(new Set());
  const ROOT_SUITE_ID = 9;

  // Build suite tree and filter to the configured root suite group
  const { suiteTree, progressAITestCases } = useMemo(() => {
    const fullTree = buildSuiteTree(suites, testCases);
    // Filter to only show root suite (ID: 9) and its children
    const filtered = filterSuiteTreeByRoot(fullTree, ROOT_SUITE_ID);
    
    // If suite 9 not found, try to find it by searching for children that have parent_id = 9
    let progressAITree = filtered;
    if (filtered.length === 0) {
      // Find all suites that are children of suite 9
      const progressAIChildren = fullTree.flatMap(node => {
        const findChildrenOfRoot = (n: SuiteTreeNode): SuiteTreeNode[] => {
          if (n.suite.parent_id === ROOT_SUITE_ID) {
            return [n];
          }
          return n.children.flatMap(findChildrenOfRoot);
        };
        return findChildrenOfRoot(node);
      });
      
      // If we found children of 9, create a parent node for it
      if (progressAIChildren.length > 0) {
        const progressAINode: SuiteTreeNode = {
          suite: {
            id: ROOT_SUITE_ID,
            title: 'PAS (Root)',
            parent_id: undefined,
          },
          children: progressAIChildren,
          testCount: 0,
          allDescendantTestCount: progressAIChildren.reduce((sum, child) => sum + child.allDescendantTestCount, 0),
        };
        progressAITree = [progressAINode];
      }
    }
    
    // Get all suite IDs that belong to the configured root (including children)
    const progressAISuiteIds = getProgressAISuiteIds(
      progressAITree.length > 0 ? progressAITree : fullTree,
      ROOT_SUITE_ID
    );
    
    // Filter test cases to only configured-root suites
    const progressAITestCases = testCases.filter(tc => progressAISuiteIds.has(tc.suite_id));
    
    // Get only children (exclude the top-level root node)
    const childrenOnly = getChildrenOnly(progressAITree, ROOT_SUITE_ID);
    
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

      <AutomationOverviewWidget stats={filteredStats} />

      <TestCaseList testCases={filteredCases} suiteTree={suiteTree} />
    </div>
  );
}

