import { useState, useEffect, useMemo } from 'react';
import type { TestRun, TestRunStats, TestResult, TestCase } from '../types';
import { getAllTestRuns, getAllRunResults } from '../services/qaseApi';

interface TestRunsViewProps {
  projectCode: string;
  testCases: TestCase[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const RUN_STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: 'In Progress', cls: 'run-status-active' },
  1: { label: 'Complete',    cls: 'run-status-complete' },
  2: { label: 'Aborted',     cls: 'run-status-aborted' },
  3: { label: 'In Review',   cls: 'run-status-review' },
};

const RESULT_COLOR: Record<string, string> = {
  passed:               '#50FA7B',
  'passed-with-comment':'#50FA7B',
  failed:               '#FF5555',
  blocked:              '#FFB86C',
  skipped:              '#6272A4',
  in_progress:          '#8BE9FD',
  retest:               '#BD93F9',
  invalid:              '#FF79C6',
  untested:             '#44475A',
  known_defect:         '#FF79C6',
};

// Ordered stat keys for bar + summary (excluding total)
const STAT_KEYS: { key: keyof import('../types').TestRunStats; label: string }[] = [
  { key: 'passed',      label: 'passed' },
  { key: 'failed',      label: 'failed' },
  { key: 'blocked',     label: 'blocked' },
  { key: 'in_progress', label: 'in progress' },
  { key: 'retest',      label: 'retest' },
  { key: 'invalid',     label: 'invalid' },
  { key: 'known_defect',label: 'known defect' },
  { key: 'skipped',     label: 'skipped' },
  { key: 'untested',    label: 'untested' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ');
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ResultBar({ stats }: { stats: TestRunStats }) {
  const total = stats.total || 1;
  const segments = STAT_KEYS
    .map(({ key, label }) => ({ key, label, value: stats[key] ?? 0, color: RESULT_COLOR[key] ?? '#6272A4' }))
    .filter(s => s.value > 0);

  return (
    <div className="run-result-bar-wrap">
      <div className="run-result-bar">
        {segments.map(seg => (
          <div
            key={seg.key}
            className="run-result-bar-seg"
            style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
            title={`${capitalize(seg.label)}: ${seg.value}`}
          />
        ))}
      </div>
      <div className="run-result-legend">
        {segments.map(seg => (
          <span key={seg.key} className="run-result-legend-item">
            <span className="run-result-legend-dot" style={{ background: seg.color }} />
            <span className="run-result-legend-label">{capitalize(seg.label)}</span>
            <span className="run-result-legend-count">{seg.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const NOT_PASSED_STATUSES = new Set(['failed', 'blocked', 'in_progress', 'retest', 'skipped', 'invalid', 'untested', 'known_defect']);
const STATUS_ORDER = ['failed', 'blocked', 'in_progress', 'retest', 'invalid', 'known_defect', 'skipped', 'untested', 'passed', 'passed-with-comment'];
const RESULTS_PAGE_SIZE = 50;

type ResultFilter = 'all' | 'not-passed';

function ResultsList({
  projectCode,
  runId,
  runStats,
  caseMap,
}: {
  projectCode: string;
  runId: number;
  runStats: TestRun['stats'];
  caseMap: Map<number, string>;
}) {
  const [filter, setFilter] = useState<ResultFilter>('not-passed');
  const [allResults, setAllResults] = useState<TestResult[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllRunResults(projectCode, runId)
      .then(data => {
        setAllResults(data);
        setLoading(false);
      })
      .catch(() => {
        setAllResults([]);
        setLoading(false);
      });
  }, [projectCode, runId]);

  const filtered = useMemo(() => {
    return filter === 'not-passed'
      ? allResults.filter(r => NOT_PASSED_STATUSES.has(r.status))
      : allResults;
  }, [allResults, filter]);

  // Reset page when filter changes
  useEffect(() => { setPage(0); }, [filter]);

  const totalPages = Math.ceil(filtered.length / RESULTS_PAGE_SIZE);
  const pageResults = filtered.slice(page * RESULTS_PAGE_SIZE, (page + 1) * RESULTS_PAGE_SIZE);

  // Derive not-passed count from run stats (available before fetch completes)
  const notPassedCount = runStats
    ? runStats.failed + runStats.blocked + runStats.in_progress + runStats.retest + runStats.skipped + runStats.invalid
    : null;

  return (
    <div className="run-results-panel">
      <div className="run-results-toolbar">
        <button
          className={`run-results-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All results
          {allResults.length > 0 && <span className="run-results-filter-count">{allResults.length}</span>}
        </button>
        <button
          className={`run-results-filter-btn ${filter === 'not-passed' ? 'active' : ''}`}
          onClick={() => setFilter('not-passed')}
        >
          Not passed
          {notPassedCount != null && notPassedCount > 0 && (
            <span className="run-results-filter-count run-results-filter-count-warn">
              {notPassedCount}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="run-results-loading">
          <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
          <span>Loading results...</span>
        </div>
      ) : pageResults.length === 0 ? (
        <p className="run-results-empty">
          {filter === 'not-passed' ? 'No failing results for this run.' : 'No results recorded yet.'}
        </p>
      ) : (
        <>
          <div className="run-results-list">
            {STATUS_ORDER.filter(s => pageResults.some(r => r.status === s)).map(status => {
              const group = pageResults.filter(r => r.status === status);
              return (
                <div key={status} className="run-results-group">
                  <div className="run-results-group-header">
                    <span
                      className="run-results-group-dot"
                      style={{ background: RESULT_COLOR[status] ?? '#6272A4' }}
                    />
                    <span className="run-results-group-label">{capitalize(status)}</span>
                    <span className="run-results-group-count">{group.length}</span>
                  </div>
                  <div className="run-results-items">
                    {group.map(result => (
                      <div key={result.hash} className="run-result-item">
                        <span
                          className="run-result-item-dot"
                          style={{ background: RESULT_COLOR[result.status] ?? '#6272A4' }}
                        />
                        <span className="run-result-item-case">
                          {caseMap.get(result.case_id)
                            ? <><span className="run-result-item-case-title">{caseMap.get(result.case_id)}</span><span className="run-result-item-case-id">#{result.case_id}</span></>
                            : <>#{result.case_id}</>
                          }
                        </span>
                        {result.time_spent_ms != null && result.time_spent_ms > 0 && (
                          <span className="run-result-item-time">{formatDuration(result.time_spent_ms)}</span>
                        )}
                        {result.comment && (
                          <span className="run-result-item-comment" title={result.comment}>
                            {result.comment.length > 80
                              ? result.comment.slice(0, 80) + '…'
                              : result.comment}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="runs-pagination">
              <button
                className="runs-page-btn"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
              >
                ← Prev
              </button>
              <span className="runs-page-info">{page + 1} / {totalPages}</span>
              <button
                className="runs-page-btn"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Run Card ─────────────────────────────────────────────────────────────────

function RunCard({
  run,
  projectCode,
  caseMap,
}: {
  run: TestRun;
  projectCode: string;
  caseMap: Map<number, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const runStatus = RUN_STATUS[run.status] ?? { label: 'Unknown', cls: '' };

  return (
    <div className="run-card">
      <button className="run-card-toggle" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}>
        <div className="run-card-header">
          <div className="run-card-title-row">
            <span className="run-card-title">{run.title}</span>
            <span className={`run-status-badge ${runStatus.cls}`}>{runStatus.label}</span>
          </div>
          <div className="run-card-meta">
            {run.environment && (
              <span className="run-meta-item run-meta-env">{run.environment.title}</span>
            )}
            {run.milestone && (
              <span className="run-meta-item run-meta-milestone">{run.milestone.title}</span>
            )}
            <span className="run-meta-item run-meta-date">
              Started: {formatDate(run.start_time)}
            </span>
            {run.end_time && (
              <span className="run-meta-item run-meta-date">
                Ended: {formatDate(run.end_time)}
              </span>
            )}
            {run.time_spent > 0 && (
              <span className="run-meta-item run-meta-duration">
                {formatDuration(run.time_spent)}
              </span>
            )}
          </div>
        </div>

        {run.stats && run.stats.total > 0 && (
          <div className="run-card-stats">
            <div className="run-stats-summary">
              <span className="run-stat-total">{run.stats.total} total</span>
              {STAT_KEYS.map(({ key, label }) => {
                const val = run.stats[key] ?? 0;
                return val > 0 ? (
                  <span key={key} className={`run-stat ${key.replace('_', '-')}`}>
                    {val} {label}
                  </span>
                ) : null;
              })}
            </div>
            <ResultBar stats={run.stats} />
          </div>
        )}

        <div className="run-card-expand-hint">
          <span>{expanded ? 'Hide' : 'Show'} results</span>
          <span className="run-card-expand-arrow" style={{ transform: expanded ? 'rotate(180deg)' : undefined }}>
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div className="run-card-results">
          <ResultsList
            projectCode={projectCode}
            runId={run.id}
            runStats={run.stats}
            caseMap={caseMap}
          />
        </div>
      )}
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function TestRunsView({ projectCode, testCases }: TestRunsViewProps) {
  const caseMap = useMemo(
    () => new Map(testCases.map(tc => [tc.id, tc.title])),
    [testCases]
  );

  const [allRuns, setAllRuns] = useState<TestRun[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPage(0);
    getAllTestRuns(projectCode)
      .then(data => {
        setAllRuns(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load test runs');
        setLoading(false);
      });
  }, [projectCode]);

  const totalPages = Math.ceil(allRuns.length / PAGE_SIZE);
  const runs = allRuns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="runs-list">
      {loading ? (
        <div className="runs-loading">
          <div className="spinner" />
          <p>Loading test runs...</p>
        </div>
      ) : error ? (
        <div className="runs-error"><p>Error: {error}</p></div>
      ) : runs.length === 0 ? (
        <div className="runs-empty"><p>No test runs found for this project.</p></div>
      ) : (
        <>
          {runs.map(run => (
            <RunCard key={run.id} run={run} projectCode={projectCode} caseMap={caseMap} />
          ))}

          {totalPages > 1 && (
            <div className="runs-pagination">
              <button
                className="runs-page-btn"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
              >
                ← Prev
              </button>
              <span className="runs-page-info">
                {page + 1} / {totalPages}
              </span>
              <button
                className="runs-page-btn"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
