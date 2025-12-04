interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color: string;
}

export default function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        {icon && <span className="stat-icon">{icon}</span>}
        <h3 className="stat-title">{title}</h3>
      </div>
      <div className="stat-value" style={{ color }}>
        {value}
      </div>
      {subtitle && (
        <div className="stat-subtitle">{subtitle}</div>
      )}
    </div>
  );
}
