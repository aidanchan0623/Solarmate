export default function StatusBadge({ children, tone = 'neutral' }) {
  return <span className={`status-badge badge-${tone}`}>{children}</span>;
}
