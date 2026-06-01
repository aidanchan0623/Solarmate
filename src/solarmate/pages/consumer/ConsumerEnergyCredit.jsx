import { useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import { energyCreditSimulation } from '../../data/mockData';
import {
  calculateAllocationRatio,
  calculateConsumerSavings,
  calculateCreditedEnergy,
  calculateImportedEnergy
} from '../../utils/calculations';

export default function ConsumerEnergyCredit() {
  const [showDetails, setShowDetails] = useState(false);
  const packageAllocation = energyCreditSimulation.consumerPackageAllocation;
  const creditedEnergy = energyCreditSimulation.creditedEnergy;
  const remainingCredit = Math.max(packageAllocation - creditedEnergy, 0);
  const importedEnergy = calculateImportedEnergy(energyCreditSimulation.totalConsumerUsage, creditedEnergy);
  const savings = calculateConsumerSavings(energyCreditSimulation.totalConsumerUsage, creditedEnergy);
  const allocationRatio = calculateAllocationRatio(
    energyCreditSimulation.totalAvailableProsumerExport,
    energyCreditSimulation.totalSubscribedConsumerDemand
  );
  const ratioCredit = calculateCreditedEnergy(packageAllocation, allocationRatio);

  return (
    <div className="page-stack">
      <DashboardCard eyebrow="Energy credit" title="SolarMate credit for this month">
        <p className="microcopy">
          SolarMate credits verified local solar energy to your account. Any remaining usage is supplied by TNB.
        </p>
        <div className="summary-metrics">
          <div>
            <span>Selected Package</span>
            <strong>Business, {packageAllocation.toLocaleString()} kWh/month</strong>
          </div>
          <div>
            <span>Green Energy Credited</span>
            <strong>{creditedEnergy} kWh</strong>
          </div>
          <div>
            <span>Remaining SolarMate credit</span>
            <strong>{remainingCredit} kWh</strong>
          </div>
          <div>
            <span>TNB Supplied Energy</span>
            <strong>{importedEnergy} kWh</strong>
          </div>
          <div>
            <span>Estimated Bill Saving</span>
            <strong>RM{savings.savings.toFixed(2)}</strong>
          </div>
        </div>
        <button className="secondary-button" type="button" onClick={() => setShowDetails((value) => !value)}>
          {showDetails ? 'Hide allocation details' : 'Show allocation details'}
        </button>
        {showDetails && (
          <div className="formula-panel subtle-panel">
            <StatusBadge tone="gold">Advanced</StatusBadge>
            <span>Allocation ratio: {(allocationRatio * 100).toFixed(1)}%</span>
            <strong>Ratio-based credit preview: {ratioCredit} kWh</strong>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
