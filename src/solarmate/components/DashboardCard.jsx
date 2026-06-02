export default function DashboardCard({ eyebrow, title, children, action, className = '' }) {
  return (
    <section
      className={`dashboard-card rounded-2xl border border-white/70 bg-white/75 shadow-xl shadow-slate-200/60 backdrop-blur-xl ${className}`}
    >
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
