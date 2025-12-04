interface DistributionChartProps {
  title: string;
  data: Record<number, number>;
  color: string;
}

const LABEL_MAPS: Record<string, Record<number, string>> = {
  'By Status': {
    0: 'Actual',
    1: 'Draft',
    2: 'Deprecated',
  },
  'By Priority': {
    0: 'Unknown',
    1: 'Critical',
    2: 'High',
    3: 'Medium',
    4: 'Low',
    5: 'Trivial',
  },
  'By Severity': {
    1: 'Critical',
    2: 'Major',
    3: 'Normal',
    4: 'Minor',
    5: 'Trivial',
  },
  'By Type': {
    1: 'Functional',
    2: 'Integration',
    3: 'UI/UX',
    4: 'API',
    5: 'Performance',
    6: 'Security',
    7: 'Smoke',
    8: 'Regression',
  },
};

export default function DistributionChart({ title, data, color }: DistributionChartProps) {
  const entries = Object.entries(data)
    .map(([key, value]) => ({
      key: parseInt(key),
      value,
      label: LABEL_MAPS[title]?.[parseInt(key)] || `Unknown (${key})`,
    }))
    .sort((a, b) => b.value - a.value);

  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const maxValue = Math.max(...entries.map(e => e.value), 1);

  if (entries.length === 0) {
    return (
      <div className="chart-card">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-empty">No data available</div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-content">
        {entries.map((entry) => {
          const percentage = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          const barWidth = maxValue > 0 ? (entry.value / maxValue) * 100 : 0;

          return (
            <div key={entry.key} className="chart-item">
              <div className="chart-label-row">
                <span className="chart-label">{entry.label}</span>
                <span className="chart-count">{entry.value}</span>
              </div>
              <div className="chart-bar-container">
                <div
                  className="chart-bar"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <div className="chart-percentage">{percentage}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
