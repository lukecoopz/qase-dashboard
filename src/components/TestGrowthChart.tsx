import { useMemo, useState } from 'react';
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

type Interval = 'month' | 'week' | 'day';

interface Props {
  testCases: TestCase[];
}

function getWeekStart(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function toBucketKey(dateStr: string, interval: Interval): string {
  const d = new Date(dateStr);
  if (interval === 'month') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }
  if (interval === 'week') {
    const ws = getWeekStart(d);
    return `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`;
  }
  // day
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatBucketKey(key: string, interval: Interval): string {
  const d = new Date(key);
  if (interval === 'month') return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  if (interval === 'week') return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function TestGrowthChart({ testCases }: Props) {
  const [interval, setInterval] = useState<Interval>('month');

  const { data, delta } = useMemo(() => {
    const dated = testCases.filter(tc => tc.created_at);
    if (dated.length === 0) return { data: [], delta: null };

    const counts: Record<string, { total: number; automated: number }> = {};
    for (const tc of dated) {
      const key = toBucketKey(tc.created_at!, interval);
      if (!counts[key]) counts[key] = { total: 0, automated: 0 };
      counts[key].total += 1;
      if (tc.automation === 2) counts[key].automated += 1;
    }

    const sorted = Object.keys(counts).sort();
    let cumTotal = 0;
    let cumAutomated = 0;

    const chartData = sorted.map(key => {
      cumTotal += counts[key].total;
      cumAutomated += counts[key].automated;
      return {
        label: formatBucketKey(key, interval),
        Total: cumTotal,
        Automated: cumAutomated,
        Manual: cumTotal - cumAutomated,
      };
    });

    const lastKey = sorted[sorted.length - 1];
    const lastCounts = counts[lastKey];
    const periodDelta = {
      total: lastCounts.total,
      automated: lastCounts.automated,
      manual: lastCounts.total - lastCounts.automated,
    };

    return { data: chartData, delta: periodDelta };
  }, [testCases, interval]);

  if (data.length < 2) return null;

  return (
    <div className="growth-chart-card">
      <div className="growth-chart-header">
        <div className="growth-chart-title-row">
          <h3 className="growth-chart-title">Test Case Growth</h3>
          {delta && (
            <div className="growth-chart-deltas">
              <span className="growth-delta-badge growth-delta-total" title="Total added this period">
                +{delta.total} total
              </span>
              <span className="growth-delta-badge growth-delta-automated" title="Automated added this period">
                +{delta.automated} automated
              </span>
              <span className="growth-delta-badge growth-delta-manual" title="Manual added this period">
                +{delta.manual} manual
              </span>
            </div>
          )}
        </div>
        <div className="growth-chart-intervals">
          {(['day', 'week', 'month'] as Interval[]).map(iv => (
            <button
              key={iv}
              className={`growth-interval-btn ${interval === iv ? 'active' : ''}`}
              onClick={() => setInterval(iv)}
            >
              {iv.charAt(0).toUpperCase() + iv.slice(1)}
            </button>
          ))}
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
