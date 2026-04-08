export interface QaseProject {
  code: string;
  title: string;
  description?: string;
  counts?: {
    cases: number;
    suites: number;
  };
}

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
  created_at: string | null;
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

export interface TestRunStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  invalid: number;
  retest: number;
  in_progress: number;
  untested: number;
  known_defect?: number;
}

export interface TestRun {
  id: number;
  title: string;
  description?: string;
  status: number; // 0=active, 1=complete, 2=abort, 3=review
  start_time: string | null;
  end_time: string | null;
  time_spent: number;
  stats: TestRunStats;
  environment?: { title: string; slug: string } | null;
  milestone?: { title: string } | null;
  tags?: { title: string }[];
}

export interface SuiteTestCounts {
  date: string;
  suiteId: string;
  total: number;
  automated: number;
  manual: number;
}

export interface TestResult {
  hash: string;
  case_id: number;
  run_id: number;
  status: string; // 'passed' | 'failed' | 'blocked' | 'skipped' | 'invalid' | 'in_progress' | 'passed-with-comment'
  time_spent_ms: number | null;
  comment: string | null;
  author_uuid: string;
  end_time: string | null;
}

