export interface TestCase {
  id: number;
  title: string;
  automation: number; // 0 = manual, 2 = automated
  status: number;
  priority: number;
  severity: number;
  type: number;
  behavior: number;
  suite_id: number;
}

export interface TestSuite {
  id: number;
  title: string;
  description?: string;
  parent_id?: number;
}

export interface SuiteTreeNode {
  suite: TestSuite;
  children: SuiteTreeNode[];
  testCount: number;
  allDescendantTestCount: number; // Includes tests from all children
}

export interface QaseResponse<T> {
  status: boolean;
  result: {
    entities: T[];
    total: number;
    filtered: number;
  };
}

export interface DashboardStats {
  totalTests: number;
  automatedTests: number;
  manualTests: number;
  automationPercentage: number;
  byStatus: Record<number, number>;
  byPriority: Record<number, number>;
  bySeverity: Record<number, number>;
  byType: Record<number, number>;
}

export interface TestStep {
  position: number;
  action: string;
  expected_result: string;
  data?: string;
  attachments?: any[];
}

export interface TestCaseDetail extends TestCase {
  description?: string;
  preconditions?: string;
  postconditions?: string;
  steps?: TestStep[];
}

