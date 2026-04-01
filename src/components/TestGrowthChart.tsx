import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { TestCase } from '../types';

type Period = 'all' | 'month' | 'week' | 'day';

interface SnapshotEntry {
  date: string;
  suites: Record<string, [number, number]>;
}

interface Props {
  testCases: TestCase[];
  projectCode: string;
  scopedSuiteIds: Set<number>;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatBucketKey(key: string): string {
  const d = new Date(key);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function shiftDate(date: string, period: 'day' | 'week' | 'month', direction: number): string {
  const d = new Date(date);
  if (period === 'day') d.setDate(d.getDate() + direction);
  else if (period === 'week') d.setDate(d.getDate() + 7 * direction);
  else d.setMonth(d.getMonth() + direction);
  return toISODate(d);
}

function formatWindowLabel(start: string, end: string, period: 'day' | 'week' | 'month'): string {
  const s = new Date(start);
  const e = new Date(end);
  if (period === 'day') return s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const yr = e.getFullYear();
  return `${fmt(s)} – ${fmt(e)} ${yr}`;
}

// ── Snapshot-based data ──────────────────────────────────────────────────────

function aggregateSnapshot(entry: SnapshotEntry, suiteIds: Set<number>): { total: number; automated: number } {
  let total = 0;
  let automated = 0;
  for (const [sid, counts] of Object.entries(entry.suites)) {
    if (suiteIds.has(Number(sid))) {
      total += counts[0];
      automated += counts[1];
    }
  }
  return { total, automated };
}

function buildSnapshotChartData(
  snapshots: SnapshotEntry[],
  suiteIds: Set<number>,
  startDate: string,
  endDate: string,
) {
  let filtered = snapshots;
  if (startDate) filtered = filtered.filter(s => s.date >= startDate);
  if (endDate) filtered = filtered.filter(s => s.date <= endDate);
  if (filtered.length === 0) return { data: [], delta: null };

  const chartData = filtered.map(snap => {
    const agg = aggregateSnapshot(snap, suiteIds);
    return {
      label: formatBucketKey(snap.date),
      Total: agg.total,
      Automated: agg.automated,
      Manual: agg.total - agg.automated,
    };
  });

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const delta = {
    total: last.Total - first.Total,
    automated: last.Automated - first.Automated,
    manual: (last.Total - last.Automated) - (first.Total - first.Automated),
  };

  return { data: chartData, delta };
}

// ── created_at fallback ──────────────────────────────────────────────────────

function buildCreatedAtChartData(
  testCases: TestCase[],
  startDate: string,
  endDate: string,
) {
  const dated = testCases.filter(tc => tc.created_at);
  if (dated.length === 0) return { data: [], delta: null };

  const startMs = startDate ? new Date(startDate).getTime() : -Infinity;
  const endMs = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;

  let baseTotal = 0;
  let baseAutomated = 0;
  for (const tc of dated) {
    const t = new Date(tc.created_at!).getTime();
    if (t < startMs) {
      baseTotal += 1;
      if (tc.automation === 2) baseAutomated += 1;
    }
  }

  const counts: Record<string, { total: number; automated: number }> = {};
  for (const tc of dated) {
    const t = new Date(tc.created_at!).getTime();
    if (t >= startMs && t <= endMs) {
      const key = toISODate(new Date(tc.created_at!));
      if (!counts[key]) counts[key] = { total: 0, automated: 0 };
      counts[key].total += 1;
      if (tc.automation === 2) counts[key].automated += 1;
    }
  }

  const sorted = Object.keys(counts).sort();
  if (sorted.length === 0) return { data: [], delta: null };

  let cumTotal = baseTotal;
  let cumAutomated = baseAutomated;

  const chartData = sorted.map(key => {
    cumTotal += counts[key].total;
    cumAutomated += counts[key].automated;
    return {
      label: formatBucketKey(key),
      Total: cumTotal,
      Automated: cumAutomated,
      Manual: cumTotal - cumAutomated,
    };
  });

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const delta = {
    total: last.Total - first.Total,
    automated: last.Automated - first.Automated,
    manual: (last.Total - last.Automated) - (first.Total - first.Automated),
  };

  return { data: chartData, delta };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TestGrowthChart({ testCases, projectCode, scopedSuiteIds }: Props) {
  const [period, setPeriod] = useState<Period>('all');
  const [offset, setOffset] = useState(0);
  const [snapshots, setSnapshots] = useState<SnapshotEntry[] | null>(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    fetch(`${base}data/snapshots/${projectCode}.json`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setSnapshots(Array.isArray(data) && data.length > 0 ? data : null))
      .catch(() => setSnapshots(null));
  }, [projectCode]);

  const useSnapshots = snapshots !== null && snapshots.length > 1;

  const dataMax = useMemo(() => {
    if (useSnapshots) return snapshots![snapshots!.length - 1].date;
    const dated = testCases.filter(tc => tc.created_at).map(tc => tc.created_at!).sort();
    return dated.length > 0 ? toISODate(new Date(dated[dated.length - 1])) : toISODate(new Date());
  }, [useSnapshots, snapshots, testCases]);

  const dataMin = useMemo(() => {
    if (useSnapshots) return snapshots![0].date;
    const dated = testCases.filter(tc => tc.created_at).map(tc => tc.created_at!).sort();
    return dated.length > 0 ? toISODate(new Date(dated[0])) : toISODate(new Date());
  }, [useSnapshots, snapshots, testCases]);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    setOffset(0);
  }, []);

  const { windowStart, windowEnd } = useMemo(() => {
    if (period === 'all') return { windowStart: '', windowEnd: '' };
    const today = toISODate(new Date());
    const end = shiftDate(today > dataMax ? dataMax : today, period, offset);
    const start = shiftDate(end, period, -1);
    const adjustedStart = toISODate(new Date(new Date(start).getTime() + 86400000));
    return { windowStart: adjustedStart, windowEnd: end };
  }, [period, offset, dataMax]);

  const canGoForward = useMemo(() => {
    if (period === 'all') return false;
    return offset < 0;
  }, [period, offset]);

  const canGoBack = useMemo(() => {
    if (period === 'all') return false;
    const nextStart = shiftDate(windowStart, period, -1);
    return nextStart >= dataMin;
  }, [period, windowStart, dataMin]);

  const { data, delta } = useMemo(() => {
    const effectiveStart = period === 'all' ? '' : windowStart;
    const effectiveEnd = period === 'all' ? '' : windowEnd;
    if (useSnapshots) {
      return buildSnapshotChartData(snapshots!, scopedSuiteIds, effectiveStart, effectiveEnd);
    }
    return buildCreatedAtChartData(testCases, effectiveStart, effectiveEnd);
  }, [useSnapshots, snapshots, scopedSuiteIds, testCases, period, windowStart, windowEnd]);

  const hasEnoughData = useSnapshots
    ? (snapshots?.length ?? 0) >= 2
    : testCases.filter(tc => tc.created_at).length >= 2;

  if (!hasEnoughData) return null;

  return (
    <div className="growth-chart-card">
      <div className="growth-chart-header">
        <div className="growth-chart-title-row">
          <h3 className="growth-chart-title">Test Case Growth</h3>
          {delta && (
            <div className="growth-chart-deltas">
              <span className="growth-delta-badge growth-delta-total">
                {delta.total >= 0 ? '+' : ''}{delta.total} total
              </span>
              <span className="growth-delta-badge growth-delta-automated">
                {delta.automated >= 0 ? '+' : ''}{delta.automated} automated
              </span>
              <span className="growth-delta-badge growth-delta-manual">
                {delta.manual >= 0 ? '+' : ''}{delta.manual} manual
              </span>
            </div>
          )}
        </div>
        <div className="growth-chart-controls">
          {period !== 'all' && (
            <div className="growth-nav">
              <button
                className="growth-nav-btn"
                onClick={() => setOffset(o => o - 1)}
                disabled={!canGoBack}
                aria-label="Previous period"
              >‹</button>
              <span className="growth-nav-label">
                {formatWindowLabel(windowStart, windowEnd, period)}
              </span>
              <button
                className="growth-nav-btn"
                onClick={() => setOffset(o => o + 1)}
                disabled={!canGoForward}
                aria-label="Next period"
              >›</button>
            </div>
          )}
          <div className="growth-chart-intervals">
            {(['all', 'day', 'week', 'month'] as Period[]).map(p => (
              <button
                key={p}
                className={`growth-interval-btn ${period === p ? 'active' : ''}`}
                onClick={() => handlePeriodChange(p)}
              >
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,114,164,0.2)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6272A4', fontSize: 11 }}
            axisLine={{ stroke: '#44475A' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#6272A4', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{ background: '#282A36', border: '1px solid #44475A', borderRadius: 6 }}
            labelStyle={{ color: '#F8F8F2', fontWeight: 600 }}
            itemStyle={{ color: '#F8F8F2' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#6272A4', paddingTop: 8 }} />
          <Line type="monotone" dataKey="Total" stroke="#8BE9FD" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="Automated" stroke="#50FA7B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="Manual" stroke="#FFB86C" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
