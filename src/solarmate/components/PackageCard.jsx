import { CheckCircle2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function PackageCard({ plan, mode = 'consumer', selected, onSelect }) {
  const rateLabel = mode === 'prosumer' ? 'Buy-back rate' : 'Consumer rate';
  const allocationLabel = mode === 'prosumer' ? plan.commitment : plan.allocation;

  return (
    <article className={`package-card ${plan.recommended ? 'is-recommended' : ''} ${selected ? 'is-selected' : ''}`}>
      <div className="package-header">
        <div>
          <p className="eyebrow">{plan.label}</p>
          <h3>{plan.name}</h3>
        </div>
        {plan.recommended && <StatusBadge tone="gold">Recommended</StatusBadge>}
      </div>
      <strong className="package-allocation">{allocationLabel}</strong>
      <p>{plan.suitableFor}</p>
      <div className="package-facts">
        <span>{rateLabel}: <strong>RM{plan.rate.toFixed(2)}/kWh</strong></span>
        {plan.expectedPayout && <span>Expected monthly earning: <strong>{plan.expectedPayout}</strong></span>}
        {plan.monthlyCost && <span>Monthly SolarMate cost: <strong>RM{plan.monthlyCost.toFixed(2)}</strong></span>}
        {plan.availability && <span>Availability: <strong>{plan.availability}</strong></span>}
      </div>
      {onSelect && (
        <button className="secondary-button" type="button" onClick={() => onSelect(plan)}>
          <CheckCircle2 size={17} />
          Select plan
        </button>
      )}
    </article>
  );
}
