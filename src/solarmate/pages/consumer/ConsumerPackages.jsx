import { useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import PackageCard from '../../components/PackageCard';
import StatusBadge from '../../components/StatusBadge';
import { packagePlans } from '../../data/mockData';

export default function ConsumerPackages({ consumer }) {
  const [selectedPackage, setSelectedPackage] = useState(packagePlans.consumer[1]);

  return (
    <div className="page-stack">
      <section className="package-grid">
        {packagePlans.consumer.map((plan) => (
          <PackageCard
            key={plan.id}
            mode="consumer"
            onSelect={setSelectedPackage}
            plan={plan}
            selected={selectedPackage.id === plan.id}
          />
        ))}
      </section>
      <DashboardCard eyebrow="Selected package" title="Green energy subscription preview">
        <div className="settlement-line">
          <div>
            <span>Current account</span>
            <strong>{consumer.name}</strong>
          </div>
          <div>
            <span>Selected package</span>
            <strong>{selectedPackage.name}</strong>
          </div>
          <div>
            <span>Monthly allocation</span>
            <strong>{selectedPackage.monthlyAllocation.toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Monthly SolarMate cost</span>
            <strong>RM{selectedPackage.monthlyCost.toFixed(2)}</strong>
          </div>
          <StatusBadge tone={selectedPackage.recommended ? 'gold' : 'success'}>{selectedPackage.label}</StatusBadge>
        </div>
      </DashboardCard>
    </div>
  );
}
