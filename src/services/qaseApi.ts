import type {
  TestCase,
  TestSuite,
  QaseResponse,
  DashboardStats,
  SuiteTreeNode,
  TestCaseDetail,
} from "../types";

const QASE_API_BASE = "https://api.qase.io/v1";
const PROJECT_CODE = "MA";

// CORS proxy URL - set via environment variable or use default Cloudflare Worker
// User can deploy cloudflare-worker.js to their own Cloudflare Worker
const CORS_PROXY = import.meta.env.VITE_CORS_PROXY_URL || "";

function getApiToken(): string {
  const token = localStorage.getItem("qase_api_token");
  if (!token) {
    throw new Error("No API token found. Please login first.");
  }
  return token;
}

async function fetchQase<T>(endpoint: string): Promise<T> {
  const token = getApiToken();
  const targetUrl = `${QASE_API_BASE}${endpoint}`;

  let response: Response;

  if (CORS_PROXY) {
    // Use CORS proxy (Cloudflare Worker)
    const proxyUrl = `${CORS_PROXY}?url=${encodeURIComponent(targetUrl)}&token=${encodeURIComponent(token)}`;
    response = await fetch(proxyUrl);
  } else {
    // Try direct call first (will fail if CORS is blocked)
    try {
      response = await fetch(targetUrl, {
        headers: {
          Token: token,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      // If CORS error, throw a helpful message
      if (error instanceof TypeError && error.message.includes("CORS")) {
        throw new Error(
          "CORS error: Please set up a CORS proxy. See README.md for instructions on deploying the Cloudflare Worker."
        );
      }
      throw error;
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Token is invalid, clear it
      localStorage.removeItem("qase_api_token");
      throw new Error("Invalid API token. Please login again.");
    }
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getAllTestCases(): Promise<TestCase[]> {
  const allCases: TestCase[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchQase<QaseResponse<TestCase>>(
      `/case/${PROJECT_CODE}?limit=${limit}&offset=${offset}`
    );

    if (response.status && response.result) {
      allCases.push(...response.result.entities);
      const total = response.result.total;
      offset += limit;
      hasMore = offset < total;
    } else {
      hasMore = false;
    }
  }

  return allCases;
}

export async function getAllTestSuites(
  testCases: TestCase[],
  requiredSuiteIds: number[] = []
): Promise<TestSuite[]> {
  // Get unique suite IDs from test cases
  const uniqueSuiteIds = Array.from(
    new Set(testCases.map((tc) => tc.suite_id))
  );

  // Add required suite IDs (like parent suites that might not have direct test cases)
  requiredSuiteIds.forEach((id) => {
    if (!uniqueSuiteIds.includes(id)) {
      uniqueSuiteIds.push(id);
    }
  });

  const suites: TestSuite[] = [];
  const fetchedSuiteIds = new Set<number>();

  // Fetch suites in parallel batches to speed things up
  const batchSize = 10;

  // Function to fetch a suite and its parents recursively
  const fetchSuiteAndParents = async (
    suiteId: number
  ): Promise<TestSuite[]> => {
    if (fetchedSuiteIds.has(suiteId)) {
      return [];
    }

    try {
      const response = await fetchQase<{
        status: boolean;
        result: TestSuite;
      }>(`/suite/${PROJECT_CODE}/${suiteId}`);

      if (response.status && response.result) {
        const suite = response.result;
        fetchedSuiteIds.add(suiteId);
        const result: TestSuite[] = [suite];

        // If this suite has a parent, fetch the parent too
        if (suite.parent_id) {
          const parents = await fetchSuiteAndParents(suite.parent_id);
          result.push(...parents);
        }

        return result;
      }
      return [];
    } catch (error) {
      console.error(`Error fetching suite ${suiteId}:`, error);
      // Create a placeholder suite if we can't fetch it
      // Don't add to fetchedSuiteIds so we can try again if needed
      // But still return a placeholder so the tree can be built
      return [
        {
          id: suiteId,
          title: `Suite ${suiteId}`,
          parent_id: undefined, // Will be set from test cases if available
        } as TestSuite,
      ];
    }
  };

  // Fetch all suites and their parents
  for (let i = 0; i < uniqueSuiteIds.length; i += batchSize) {
    const batch = uniqueSuiteIds.slice(i, i + batchSize);
    const batchPromises = batch.map((suiteId) => fetchSuiteAndParents(suiteId));
    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach((suiteList) => {
      suiteList.forEach((suite) => {
        if (!suites.find((s) => s.id === suite.id)) {
          suites.push(suite);
        }
      });
    });
  }

  return suites;
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
  // This ensures parent suites like suite 96 are included in the tree
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
export function getProgressAISuiteIds(suiteTree: SuiteTreeNode[]): Set<number> {
  const suiteIds = new Set<number>();

  const findProgressAI = (nodes: SuiteTreeNode[]): SuiteTreeNode | null => {
    for (const node of nodes) {
      if (node.suite.id === 96) {
        return node;
      }
      const found = findProgressAI(node.children);
      if (found) return found;
    }
    return null;
  };

  const progressAINode = findProgressAI(suiteTree);
  if (progressAINode) {
    // Add the Progress AI suite and all its descendants
    const collectIds = (node: SuiteTreeNode) => {
      suiteIds.add(node.suite.id);
      node.children.forEach(collectIds);
    };
    collectIds(progressAINode);
  }

  return suiteIds;
}

// Get only the children of a suite tree node (exclude the root)
export function getChildrenOnly(suiteTree: SuiteTreeNode[]): SuiteTreeNode[] {
  // If the tree has Progress AI as root, return only its children
  const progressAINode = suiteTree.find((node) => node.suite.id === 96);
  if (progressAINode) {
    return progressAINode.children;
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

export async function getTestCaseDetail(
  caseId: number
): Promise<TestCaseDetail | null> {
  try {
    const response = await fetchQase<{
      status: boolean;
      result: TestCaseDetail;
    }>(`/case/${PROJECT_CODE}/${caseId}`);

    if (response.status && response.result) {
      return response.result;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching test case ${caseId}:`, error);
    return null;
  }
}
