import { useEffect, useState } from 'react';
import { getAdminMonthlyExportRecords } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';

const columns = [
  { key: 'month', label: 'Month' },
  {
    key: 'prosumer_supply_kwh',
    label: 'Total Prosumer Supply',
    render: (row) => `${row.prosumer_supply_kwh.toLocaleString()} kWh`
  },
  {
    key: 'consumer_demand_kwh',
    label: 'Total Consumer Demand',
    render: (row) => `${row.consumer_demand_kwh.toLocaleString()} kWh`
  },
  {
    key: 'matched_energy_kwh',
    label: 'Matched Energy',
    render: (row) => `${row.matched_energy_kwh.toLocaleString()} kWh`
  },
  {
    key: 'unmatched_supply_kwh',
    label: 'Unmatched Supply',
    render: (row) => `${row.unmatched_supply_kwh.toLocaleString()} kWh`
  },
  {
    key: 'unmatched_demand_kwh',
    label: 'Unmatched Demand',
    render: (row) => `${row.unmatched_demand_kwh.toLocaleString()} kWh`
  },
  {
    key: 'sold_to_solarmate_kwh',
    label: 'Sold to SolarMate',
    render: (row) => `${row.sold_to_solarmate_kwh.toLocaleString()} kWh`
  },
  {
    key: 'solar_atap_excess_kwh',
    label: 'Solar ATAP Excess',
    render: (row) => `${row.solar_atap_excess_kwh.toLocaleString()} kWh`
  },
  {
    key: 'total_prosumer_payout',
    label: 'Total Prosumer Payout',
    render: (row) => `RM${row.total_prosumer_payout.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  },
  { key: 'status', label: 'Status' }
];

export default function AdminExportHistory() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    getAdminMonthlyExportRecords()
      .then((data) => {
        if (!isMounted) return;
        setRows(data);
        setError('');
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Unable to load monthly export records from backend.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const latest = rows[rows.length - 1];

  return (
    <div className="page-stack">
      <DashboardCard eyebrow="Monthly export records" title="Platform export and matching records">
        <p className="microcopy">
          Platform monthly records are aggregated from prosumer export and consumer demand data.
          Matched energy is calculated as min(prosumer supply, consumer demand).
        </p>
        {error && <div className="auth-error">{error}</div>}
        {latest && (
          <div className="summary-metrics compact">
            <div>
              <span>Latest month</span>
              <strong>{latest.month}</strong>
            </div>
            <div>
              <span>Matched energy</span>
              <strong>{latest.matched_energy_kwh.toLocaleString()} kWh</strong>
            </div>
            <div>
              <span>Unmatched supply</span>
              <strong>{latest.unmatched_supply_kwh.toLocaleString()} kWh</strong>
            </div>
            <div>
              <span>Prosumer payout</span>
              <strong>RM{latest.total_prosumer_payout.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</strong>
            </div>
          </div>
        )}
      </DashboardCard>

      <DashboardCard eyebrow="Records" title="January to May platform records">
        <DataTable columns={columns} rows={rows} />
      </DashboardCard>
    </div>
  );
}
