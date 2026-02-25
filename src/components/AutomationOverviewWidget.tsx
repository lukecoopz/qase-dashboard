import type { DashboardStats } from '../types';

interface AutomationOverviewWidgetProps {
  stats: DashboardStats;
}

function clampPercentage(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export default function AutomationOverviewWidget({ stats }: AutomationOverviewWidgetProps) {
  const total = stats.totalTests;
  const automated = stats.automatedTests;
  const manual = stats.manualTests;

  const automatedPct = total > 0 ? clampPercentage(Math.round((automated / total) * 100)) : 0;
  const manualPct = total > 0 ? clampPercentage(100 - automatedPct) : 0;

  const pieBackground =
    total > 0
      ? `conic-gradient(#50FA7B 0 ${automatedPct}%, #FFB86C ${automatedPct}% 100%)`
      : `conic-gradient(rgba(98, 114, 164, 0.35) 0 100%)`;

  return (
    <div className="overview-widget" aria-label="Automation overview">
      <div className="overview-kpis">
        <div className="overview-kpi" style={{ ['--accent' as any]: '#8BE9FD' }}>
          <div className="overview-kpi-top">
            <div className="overview-kpi-icon" aria-hidden="true">📊</div>
            <div className="overview-kpi-title">Total Tests</div>
          </div>
          <div className="overview-kpi-value">{total}</div>
          <div className="overview-kpi-subtitle">Filtered selection</div>
        </div>

        <div className="overview-kpi" style={{ ['--accent' as any]: '#50FA7B' }}>
          <div className="overview-kpi-top">
            <div className="overview-kpi-icon" aria-hidden="true">🤖</div>
            <div className="overview-kpi-title">Automated</div>
          </div>
          <div className="overview-kpi-value">{automated}</div>
          <div className="overview-kpi-subtitle">{automatedPct}%</div>
        </div>

        <div className="overview-kpi" style={{ ['--accent' as any]: '#FFB86C' }}>
          <div className="overview-kpi-top">
            <div className="overview-kpi-icon" aria-hidden="true">👤</div>
            <div className="overview-kpi-title">Manual</div>
          </div>
          <div className="overview-kpi-value">{manual}</div>
          <div className="overview-kpi-subtitle">{manualPct}%</div>
        </div>

        <div className="overview-kpi" style={{ ['--accent' as any]: '#BD93F9' }}>
          <div className="overview-kpi-top">
            <div className="overview-kpi-icon" aria-hidden="true">⚡</div>
            <div className="overview-kpi-title">Automation Rate</div>
          </div>
          <div className="overview-kpi-value">{automatedPct}%</div>
          <div className="overview-kpi-subtitle">Automated / total</div>
        </div>
      </div>

      <div className="overview-pie-card">
        <div className="overview-pie-header">
          <div className="overview-pie-title">Automation split</div>
          <div className="overview-pie-total">Total: {total}</div>
        </div>

        <div className="overview-pie-wrap">
          <div className="overview-pie" style={{ background: pieBackground }}>
            <div className="overview-pie-center">
              <div className="overview-pie-center-value">{automatedPct}%</div>
              <div className="overview-pie-center-label">Automated</div>
            </div>
          </div>

          <div className="overview-pie-legend" aria-label="Pie chart legend">
            <div className="overview-legend-row">
              <span className="overview-legend-dot" style={{ backgroundColor: '#50FA7B' }} aria-hidden="true" />
              <span className="overview-legend-label">Automated</span>
              <span className="overview-legend-value">
                {automated} <span className="overview-legend-muted">({automatedPct}%)</span>
              </span>
            </div>
            <div className="overview-legend-row">
              <span className="overview-legend-dot" style={{ backgroundColor: '#FFB86C' }} aria-hidden="true" />
              <span className="overview-legend-label">Manual</span>
              <span className="overview-legend-value">
                {manual} <span className="overview-legend-muted">({manualPct}%)</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



