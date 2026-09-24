export default function StatCard({
  label,
  value,
  icon,
  tone = 'violet',
  hint,
  delay = 0,
}) {
  const toneClass = `stat-${tone}`;
  return (
    <div
      className={`stat-card ${toneClass}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="stat-icon">{icon}</span>
      <div className="stat-body">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </div>
  );
}