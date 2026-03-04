import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { TestRun } from '../types';

interface Props {
  runs: TestRun[];
}

function formatMs(ms: number): string {
  if (!ms) return '0s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { title, duration, date } = payload[0].payload;
  return (
    <div style={{
      background: '#282A36', border: '1px solid #44475A', borderRadius: 6,
      padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ color: '#F8F8F2', fontWeight: 600, margin: '0 0 4px' }}>{title}</p>
      <p style={{ color: '#6272A4', margin: '0 0 2px' }}>{date}</p>
      <p style={{ color: '#8BE9FD', margin: 0 }}>{formatMs(duration)}</p>
    </div>
  );
}

export default function RunDurationChart({ runs }: Props) {
  const data = runs
    .filter(r => r.time_spent > 0 && r.start_time)
    .slice()
    .reverse() // oldest → newest left to right
    .map(r => ({
      date: formatDate(r.start_time!),
      title: r.title,
      duration: r.time_spent,
    }));

  if (data.length < 2) return null;

  return (
    <div className="growth-chart-card">
      <h3 className="growth-chart-title">Run Duration Over Time</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,114,164,0.2)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6272A4', fontSize: 11 }}
            axisLine={{ stroke: '#44475A' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatMs}
            tick={{ fill: '#6272A4', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(98,114,164,0.1)' }} />
          <Bar dataKey="duration" fill="#BD93F9" radius={[3, 3, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
