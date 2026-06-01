import { useEffect, useState } from 'react';
import { getProsumerOverview } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import { calculateProsumerUpliftPercentage } from '../../utils/calculations';

export default function ProsumerOverview({ prosumer }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadOverview() {
      try {
        const data = await getProsumerOverview();
        if (!cancelled) {
          setOverview(data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  const data = overview;
  const upliftPercentage = calculateProsumerUpliftPercentage();

  return (
    <div className="page-stack">
      <DashboardCard
        action={data && <StatusBadge tone="success">{upliftPercentage.toFixed(1)}% higher than Solar ATAP</StatusBadge>}
        eyebrow="Prosumer overview"
        title={data?.display_name || prosumer.name}
      >
        <p className="microcopy">
          A quick view of this month&apos;s verified export, SolarMate quota, Solar ATAP excess, and earnings.
        </p>
        {error && <div className="auth-error">Unable to load backend overview: {error}</div>}
        {!data && (
          <div className="auth-error">
            {loading ? 'Loading monthly export totals from backend daily records...' : 'No backend daily export records loaded.'}
          </div>
        )}
        {data && (
          <>
            <div className="summary-title-row compact-title-row">
              <div>
                <span>Current Plan / Monthly Quota</span>
                <strong>{data.selected_export_plan}, {(data.export_commitment_kwh || 0).toLocaleString()} kWh/month</strong>
              </div>
              <StatusBadge tone="success">{prosumer.systemStatus}</StatusBadge>
            </div>

            <div className="summary-metrics compact">
              <div>
                <span>Actual Exported This Month</span>
                <strong>{data.exported_kwh.toLocaleString()} kWh</strong>
              </div>
              <div>
                <span>Sold to SolarMate</span>
                <strong>{data.solar_mate_kwh.toLocaleString()} kWh</strong>
              </div>
              <div>
                <span>Excess Sold to Solar ATAP</span>
                <strong>{data.solar_atap_kwh.toLocaleString()} kWh</strong>
              </div>
              <div>
                <span>Total Earnings</span>
                <strong>RM{data.total_earnings.toFixed(2)}</strong>
              </div>
              <div>
                <span>SolarMate Uplift vs Solar ATAP</span>
                <strong>{upliftPercentage.toFixed(1)}%</strong>
              </div>
            </div>
          </>
        )}
      </DashboardCard>
    </div>
  );
}
