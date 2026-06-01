import { useEffect, useState } from 'react';
import { getConsumerLiveMeter } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import CompactGroupedBarChart from '../../components/CompactGroupedBarChart';

function formatShortDate(value) {
  const [, month, day] = String(value).split('-');
  if (!month || !day) return value;
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ConsumerLiveMeter({ consumer }) {
  const [meter, setMeter] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    getConsumerLiveMeter()
      .then((data) => {
        if (!isMounted) return;
        setMeter(data);
        setError('');
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Unable to load smart meter records from backend.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const chartData = (meter?.records || []).map((row) => ({
    date: formatShortDate(row.date),
    fullDate: row.date,
    greenCredit: row.green_credit_kwh,
    tnbImport: row.tnb_import_kwh,
    totalUsage: row.total_usage_kwh
  }));

  return (
    <div className="page-stack">
      <DashboardCard eyebrow="Live smart meter" title="Today's energy use">
        <p className="microcopy">
          Monthly values are calculated from daily meter records. Current package:
          {' '}{consumer.selectedPackage}, {consumer.monthlyGreenAllocation.toLocaleString()} kWh/month.
        </p>
        {error && <div className="auth-error">{error}</div>}
        <div className="summary-metrics">
          <div>
            <span>Current load</span>
            <strong>{(meter?.current_load_power || 0).toFixed(1)} kW</strong>
          </div>
          <div>
            <span>Energy used today</span>
            <strong>{(meter?.energy_used_today || 0).toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Green credit used today</span>
            <strong>{(meter?.green_credit_used_today || 0).toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>TNB import today</span>
            <strong>{(meter?.tnb_import_today || 0).toLocaleString()} kWh</strong>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard eyebrow="Recent meter records" title="Daily Usage Breakdown">
        <CompactGroupedBarChart
          data={chartData}
          series={[
            { key: 'greenCredit', label: 'Green credit', color: 'teal' },
            { key: 'tnbImport', label: 'TNB import', color: 'blueGrey' }
          ]}
          tooltipExtra={(item) => [
            {
              label: 'Total usage',
              value: `${item.totalUsage} kWh`,
              color: 'gold'
            }
          ]}
          tooltipTitle={(item) => item.fullDate}
          valueSuffix=" kWh"
          xKey="date"
        />
        <p className="microcopy">These same daily records are summed into monthly usage history and billing.</p>
      </DashboardCard>
    </div>
  );
}
