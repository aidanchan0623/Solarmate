import DashboardCard from '../../components/DashboardCard';

export default function SettlementBreakdown({ creditedEnergy, settlement }) {
  return (
    <DashboardCard eyebrow="Settlement" title="Settlement breakdown">
      <details className="settlement-details">
        <summary>Show settlement breakdown</summary>
        <div className="summary-metrics compact">
          <div>
            <span>Prosumer payout</span>
            <strong>RM{settlement.prosumerPayout.toFixed(2)}</strong>
          </div>
          <div>
            <span>Grid toll / CAC</span>
            <strong>RM{settlement.gridToll.toFixed(2)}</strong>
          </div>
          <div>
            <span>SolarMate revenue</span>
            <strong>RM{settlement.platformRevenue.toFixed(2)}</strong>
          </div>
        </div>
      </details>
    </DashboardCard>
  );
}
