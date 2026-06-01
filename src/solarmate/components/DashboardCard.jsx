export default function DashboardCard({ eyebrow, title, children, action, className = '' }) {
  return (
    <section className={`dashboard-card ${className}`}>
      {(eyebrow || title || action) && (
        <div className="card-heading">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
