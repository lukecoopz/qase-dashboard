import { useMemo } from 'react';
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

interface Props {
  testCases: TestCase[];
}

function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthKey(key: string): string {
  const [year, month] = key.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export default function TestGrowthChart({ testCases }: Props) {
  const data = useMemo(() => {
    const dated = testCases.filter(tc => tc.created_at);

    if (dated.length === 0) return [];

    // Count new cases per month
    const monthCounts: Record<string, { total: number; automated: number }> = {};
    for (const tc of dated) {
      const key = toMonthKey(tc.created_at!);
      if (!monthCounts[key]) monthCounts[key] = { total: 0, automated: 0 };
      monthCounts[key].total += 1;
      if (tc.automation === 2) monthCounts[key].automated += 1;
    }

    // Sort months and accumulate
    const sorted = Object.keys(monthCounts).sort();
    let cumTotal = 0;
    let cumAutomated = 0;

    return sorted.map(key => {
      cumTotal += monthCounts[key].total;
      cumAutomated += monthCounts[key].automated;
      return {
        month: formatMonthKey(key),
        Total: cumTotal,
        Automated: cumAutomated,
      };
    });
  }, [testCases]);

  if (data.length < 2) return null;

  return (
    <div className="growth-chart-card">
      <h3 className="growth-chart-title">Test Case Growth</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,114,164,0.2)" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#6272A4', fontSize: 11 }}
            axisLine={{ stroke: '#44475A' }}
            tickLine={false}
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
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#6272A4', paddingTop: 8 }}
          />
          <Line
            type="monotone"
            dataKey="Total"
            stroke="#8BE9FD"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="Automated"
            stroke="#50FA7B"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
