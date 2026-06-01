import { useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import PackageCard from '../../components/PackageCard';
import SimulationInput from '../../components/SimulationInput';
import StatusBadge from '../../components/StatusBadge';
import { packagePlans } from '../../data/mockData';
import { checkProsumerEligibility } from '../../utils/calculations';

export default function ProsumerExportPlan() {
  const [selectedPlan, setSelectedPlan] = useState(packagePlans.prosumer[1]);
  const [estimatedSurplus, setEstimatedSurplus] = useState(380);
  const [checked, setChecked] = useState(false);
  const requiredSurplus = Number((selectedPlan.monthlyCommitment * 1.2).toFixed(1));
  const eligible = checkProsumerEligibility(estimatedSurplus, selectedPlan.monthlyCommitment);

  return (
    <div className="page-stack">
      <section className="package-grid">
        {packagePlans.prosumer.map((plan) => (
          <PackageCard
            key={plan.id}
            mode="prosumer"
            onSelect={(nextPlan) => {
              setSelectedPlan(nextPlan);
              setChecked(false);
            }}
            plan={plan}
            selected={selectedPlan.id === plan.id}
          />
        ))}
      </section>

      <DashboardCard eyebrow="Eligibility check" title="20% safety buffer">
        <div className="compact-simulation">
          <div>
            <span>Selected commitment</span>
            <strong>{selectedPlan.monthlyCommitment} kWh/month</strong>
            <p>Required estimated surplus: {requiredSurplus} kWh/month</p>
          </div>
          <SimulationInput
            label="Estimated monthly surplus"
            onChange={setEstimatedSurplus}
            suffix="kWh"
            value={estimatedSurplus}
          />
          <button className="primary-button" type="button" onClick={() => setChecked(true)}>
            Check eligibility
          </button>
        </div>
        {checked && (
          <div className={`result-panel ${eligible ? 'result-success' : 'result-warning'}`}>
            <StatusBadge tone={eligible ? 'success' : 'warning'}>
              {eligible ? 'Eligible' : 'Not recommended'}
            </StatusBadge>
            <strong>{eligible ? 'Estimated surplus supports this tier.' : 'Commitment may be too high.'}</strong>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
