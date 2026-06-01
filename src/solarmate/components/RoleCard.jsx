import { ArrowRight } from 'lucide-react';

export default function RoleCard({ title, description, buttonLabel, icon: Icon, onClick, tone = 'teal' }) {
  return (
    <article className={`role-card role-${tone}`}>
      <div className="role-icon">
        <Icon size={28} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <button type="button" onClick={onClick}>
        <span>{buttonLabel}</span>
        <ArrowRight size={17} />
      </button>
    </article>
  );
}
