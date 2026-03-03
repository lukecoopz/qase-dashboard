import type {
  TestCase,
  TestSuite,
  QaseResponse,
  DashboardStats,
  SuiteTreeNode,
  TestCaseDetail,
  QaseProject,
  TestRun,
  TestResult,
} from "../types";

const QASE_API_BASE = "https://qase-dashboard.lukecoopz.workers.dev";

function getToken(): string {
  const token = localStorage.getItem("qase_api_token");
  if (!token) throw new Error("No API token found. Please log in.");
  return token;
}

async function fetchQase<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${QASE_API_BASE}${endpoint}`, {
    headers: {
      Token: getToken(),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Fetches the first page to get the total, then fires all remaining pages in parallel.
async function fetchAllPaged<T>(
  endpoint: string,
  limit = 100
): Promise<T[]> {
  const sep = endpoint.includes("?") ? "&" : "?";
  const first = await fetchQase<QaseResponse<T>>(
    `${endpoint}${sep}limit=${limit}&offset=0`
  );
  if (!first.status || !first.result) return [];

  const all = [...first.result.entities];
  const total = first.result.total;
  if (total <= limit) return all;

  const remainingPages = Math.ceil((total - limit) / limit);
  const pages = await Promise.all(
    Array.from({ length: remainingPages }, (_, i) =>
      fetchQase<QaseResponse<T>>(
        `${endpoint}${sep}limit=${limit}&offset=${(i + 1) * limit}`
      )
    )
  );

  pages.forEach((page) => {
    if (page.status && page.result) all.push(...page.result.entities);
  });

  return all;
}

export async function getProjects(): Promise<QaseProject[]> {
  return fetchAllPaged<QaseProject>("/project");
}

export async function getAllTestCases(projectCode: string): Promise<TestCase[]> {
  return fetchAllPaged<TestCase>(`/case/${projectCode}`);
}

export async function getAllTestSuites(projectCode: string): Promise<TestSuite[]> {
  return fetchAllPaged<TestSuite>(`/suite/${projectCode}`);
}

// Build a tree structure from suites
export function buildSuiteTree(
  suites: TestSuite[],
  testCases: TestCase[]
): SuiteTreeNode[] {
  // If no suites, create nodes from test cases directly
  if (suites.length === 0) {
    const testCounts = new Map<number, number>();
    testCases.forEach((tc) => {
      testCounts.set(tc.suite_id, (testCounts.get(tc.suite_id) || 0) + 1);
    });

    const rootNodes: SuiteTreeNode[] = [];
    testCounts.forEach((count, suiteId) => {
      rootNodes.push({
        suite: {
          id: suiteId,
          title: `Suite ${suiteId}`,
        },
        children: [],
        testCount: count,
        allDescendantTestCount: count,
      });
    });
    return rootNodes.sort((a, b) => a.suite.title.localeCompare(b.suite.title));
  }

  const suiteMap = new Map<number, TestSuite>();
  suites.forEach((suite) => suiteMap.set(suite.id, suite));

  // Count tests per suite
  const testCounts = new Map<number, number>();
  testCases.forEach((tc) => {
    testCounts.set(tc.suite_id, (testCounts.get(tc.suite_id) || 0) + 1);
  });

  // Build nodes - include all suites (even if they don't have direct test cases)
  const nodeMap = new Map<number, SuiteTreeNode>();

  suites.forEach((suite) => {
    nodeMap.set(suite.id, {
      suite,
      children: [],
      testCount: testCounts.get(suite.id) || 0,
      allDescendantTestCount: testCounts.get(suite.id) || 0,
    });
  });

  // Include parent suites that might not have direct test cases
  // This ensures parent suites like suite 9 are included in the tree
  suites.forEach((suite) => {
    if (suite.parent_id && !nodeMap.has(suite.parent_id)) {
      nodeMap.set(suite.parent_id, {
        suite: {
          id: suite.parent_id,
          title: `Suite ${suite.parent_id}`,
          parent_id: undefined,
        },
        children: [],
        testCount: 0,
        allDescendantTestCount: 0,
      });
    }
  });

  // Build tree structure and calculate descendant counts
  const rootNodes: SuiteTreeNode[] = [];

  nodeMap.forEach((node) => {
    if (node.suite.parent_id && nodeMap.has(node.suite.parent_id)) {
      const parent = nodeMap.get(node.suite.parent_id)!;
      parent.children.push(node);
      // Sort children by title
      parent.children.sort((a: SuiteTreeNode, b: SuiteTreeNode) =>
        a.suite.title.localeCompare(b.suite.title)
      );
    } else {
      rootNodes.push(node);
    }
  });

  // Calculate all descendant test counts (bubble up from leaves)
  const calculateDescendantCounts = (node: SuiteTreeNode): number => {
    let total = node.testCount;
    node.children.forEach((child) => {
      total += calculateDescendantCounts(child);
    });
    node.allDescendantTestCount = total;
    return total;
  };

  rootNodes.forEach((node) => calculateDescendantCounts(node));

  // Sort root nodes by title
  rootNodes.sort((a, b) => a.suite.title.localeCompare(b.suite.title));

  return rootNodes;
}

// Filter suite tree to only show a specific root suite and its descendants
// Can filter by name (partial match) or by suite ID
export function filterSuiteTreeByRoot(
  suiteTree: SuiteTreeNode[],
  rootSuiteNameOrId: string | number
): SuiteTreeNode[] {
  const filtered = suiteTree.filter((node) => {
    if (typeof rootSuiteNameOrId === "number") {
      return node.suite.id === rootSuiteNameOrId;
    }
    return node.suite.title
      .toLowerCase()
      .includes(rootSuiteNameOrId.toLowerCase());
  });
  return filtered;
}

// Get all suite IDs that are descendants of a given suite (including the suite itself)
export function getProgressAISuiteIds(
  suiteTree: SuiteTreeNode[],
  rootSuiteId: number
): Set<number> {
  const suiteIds = new Set<number>();

  const findRoot = (nodes: SuiteTreeNode[]): SuiteTreeNode | null => {
    for (const node of nodes) {
      if (node.suite.id === rootSuiteId) {
        return node;
      }
      const found = findRoot(node.children);
      if (found) return found;
    }
    return null;
  };

  const rootNode = findRoot(suiteTree);
  if (rootNode) {
    // Add the root suite and all its descendants
    const collectIds = (node: SuiteTreeNode) => {
      suiteIds.add(node.suite.id);
      node.children.forEach(collectIds);
    };
    collectIds(rootNode);
  }

  return suiteIds;
}

// Get only the children of a suite tree node (exclude the root)
export function getChildrenOnly(
  suiteTree: SuiteTreeNode[],
  rootSuiteId: number
): SuiteTreeNode[] {
  // If the tree has a configured root, return only its children
  const rootNode = suiteTree.find((node) => node.suite.id === rootSuiteId);
  if (rootNode) {
    return rootNode.children;
  }
  return suiteTree;
}

// Get all descendant suite IDs (including the suite itself)
export function getAllDescendantSuiteIds(
  suiteId: number,
  suiteTree: SuiteTreeNode[]
): number[] {
  const findNode = (
    nodes: SuiteTreeNode[],
    id: number
  ): SuiteTreeNode | null => {
    for (const node of nodes) {
      if (node.suite.id === id) {
        return node;
      }
      const found = findNode(node.children, id);
      if (found) return found;
    }
    return null;
  };

  const node = findNode(suiteTree, suiteId);
  if (!node) return [suiteId];

  const result: number[] = [suiteId];
  const collectIds = (n: SuiteTreeNode) => {
    n.children.forEach((child: SuiteTreeNode) => {
      result.push(child.suite.id);
      collectIds(child);
    });
  };
  collectIds(node);
  return result;
}

export function calculateStats(testCases: TestCase[]): DashboardStats {
  const stats: DashboardStats = {
    totalTests: testCases.length,
    automatedTests: 0,
    manualTests: 0,
    automationPercentage: 0,
    byStatus: {},
    byPriority: {},
    bySeverity: {},
    byType: {},
  };

  testCases.forEach((testCase) => {
    // Count automation - 2 = automated, 0 = manual
    if (testCase.automation === 2) {
      stats.automatedTests++;
    } else {
      stats.manualTests++;
    }

    // Count by status
    stats.byStatus[testCase.status] =
      (stats.byStatus[testCase.status] || 0) + 1;

    // Count by priority
    stats.byPriority[testCase.priority] =
      (stats.byPriority[testCase.priority] || 0) + 1;

    // Count by severity
    stats.bySeverity[testCase.severity] =
      (stats.bySeverity[testCase.severity] || 0) + 1;

    // Count by type
    stats.byType[testCase.type] = (stats.byType[testCase.type] || 0) + 1;
  });

  stats.automationPercentage =
    stats.totalTests > 0
      ? Math.round((stats.automatedTests / stats.totalTests) * 100)
      : 0;

  return stats;
}

export async function getAllTestRuns(projectCode: string): Promise<TestRun[]> {
  const all = await fetchAllPaged<TestRun>(`/run/${projectCode}`, 100);
  return all.sort((a, b) => {
    const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
    const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
    return bTime - aTime;
  });
}

// The Qase v1 results API ignores filter[run_id] entirely and returns all project results.
// We fetch every page in parallel and filter client-side.
export async function getAllRunResults(
  projectCode: string,
  runId: number
): Promise<TestResult[]> {
  const all = await fetchAllPaged<TestResult>(`/result/${projectCode}`, 100);
  return all.filter(r => Number(r.run_id) === runId);
}

export async function getTestCaseDetail(
  projectCode: string,
  caseId: number
): Promise<TestCaseDetail | null> {
  try {
    const response = await fetchQase<{
      status: boolean;
      result: TestCaseDetail;
    }>(`/case/${projectCode}/${caseId}`);

    if (response.status && response.result) {
      return response.result;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching test case ${caseId}:`, error);
    return null;
  }
}
