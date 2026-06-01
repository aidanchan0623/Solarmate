import { useEffect, useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';
import CompactGroupedBarChart from '../../components/CompactGroupedBarChart';
import StatusBadge from '../../components/StatusBadge';
import { getAdminOverview } from '../../api/client';
import { adminMetrics } from '../../data/mockData';
import { calculateMatchedRate } from '../../utils/calculations';

const columns = [
  { key: 'label', label: 'Metric' },
  { key: 'value', label: 'Value' },
  { key: 'note', label: 'Notes' }
];

function fallbackOverview() {
  return {
    total_export_commitment: adminMetrics.totalExportedEnergy,
    matched_green_energy: adminMetrics.totalMatchedEnergy,
    total_consumer_demand: adminMetrics.totalConsumerDemand,
    unmatched_supply: adminMetrics.unmatchedSupply,
    unmatched_demand: adminMetrics.unmatchedDemand,
    matching_rate: adminMetrics.matchingRate
  };
}

export default function AdminSupplyDemand() {
  const [overview, setOverview] = useState(fallbackOverview);
  const [error, setError] = useState('');
  const matchingRate =
    overview.matching_rate ?? calculateMatchedRate(overview.matched_green_energy, overview.total_export_commitment);

  useEffect(() => {
    let cancelled = false;
    async function loadOverview() {
      try {
        const data = await getAdminOverview();
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    loadOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = [
    {
      label: 'Prosumer supply',
      value: `${overview.total_export_commitment.toLocaleString()} kWh`,
      note: 'Latest monthly export supply'
    },
    {
      label: 'Consumer demand',
      value: `${overview.total_consumer_demand.toLocaleString()} kWh`,
      note: 'Latest green-credit demand'
    },
    {
      label: 'Matched energy',
      value: `${overview.matched_green_energy.toLocaleString()} kWh`,
      note: 'min(supply, demand)'
    },
    {
      label: 'Matching rate',
      value: `${matchingRate.toFixed(1)}%`,
      note: 'Matched energy divided by prosumer supply'
    },
    {
      label: 'Unmatched supply',
      value: `${overview.unmatched_supply.toLocaleString()} kWh`,
      note: 'Available supply after matching'
    },
    {
      label: 'Unmatched demand',
      value: `${overview.unmatched_demand.toLocaleString()} kWh`,
      note: 'Demand not covered by SolarMate supply'
    }
  ];

  return (
    <div className="page-stack">
      <DashboardCard
        action={
          <StatusBadge tone={matchingRate >= 100 ? 'success' : 'warning'}>
            {matchingRate.toFixed(1)}% matched
          </StatusBadge>
        }
        eyebrow="Supply & demand"
        title="Database-based matching summary"
      >
        {error && <div className="auth-error">Using fallback metrics: {error}</div>}
        <div className="summary-metrics compact">
          <div>
            <span>Prosumer Supply</span>
            <strong>{overview.total_export_commitment.toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Consumer Demand</span>
            <strong>{overview.total_consumer_demand.toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Matched Energy</span>
            <strong>{overview.matched_green_energy.toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Unmatched Supply</span>
            <strong>{overview.unmatched_supply.toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Unmatched Demand</span>
            <strong>{overview.unmatched_demand.toLocaleString()} kWh</strong>
          </div>
        </div>
        <CompactGroupedBarChart
          data={[
            {
              label: 'Current',
              exported: overview.total_export_commitment,
              demand: overview.total_consumer_demand,
              matched: overview.matched_green_energy,
              unmatchedSupply: overview.unmatched_supply,
              unmatchedDemand: overview.unmatched_demand
            }
          ]}
          series={[
            { key: 'exported', label: 'Exported Energy', color: 'teal' },
            { key: 'demand', label: 'Consumer Demand', color: 'mutedBlue' },
            { key: 'matched', label: 'Matched Energy', color: 'green' },
            { key: 'unmatchedSupply', label: 'Unmatched Supply', color: 'gold' },
            { key: 'unmatchedDemand', label: 'Unmatched Demand', color: 'blueGrey' }
          ]}
          tooltipExtra={() => [
            {
              label: 'Matching rate',
              value: `${matchingRate.toFixed(1)}%`,
              color: 'green'
            }
          ]}
          valueSuffix=" kWh"
          xKey="label"
        />
      </DashboardCard>

      <DashboardCard eyebrow="Matching details" title="Prototype allocation summary">
        <DataTable columns={columns} rows={rows} />
      </DashboardCard>
    </div>
  );
}
