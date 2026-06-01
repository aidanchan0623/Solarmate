export default function StatCard({ label, value, suffix, help, tone = 'teal', icon: Icon }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-topline">
        <span>{label}</span>
        {Icon && <Icon size={19} />}
      </div>
      <strong>
        {value}
        {suffix && <small>{suffix}</small>}
      </strong>
      {help && <p>{help}</p>}
    </article>
  );
}
