import { useEffect, useState } from 'react';
import { getConsumerOverview } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';

export default function ConsumerOverview({ consumer }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getConsumerOverview()
      .then((data) => {
        if (!isMounted) return;
        setOverview(data);
        setError('');
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Unable to load consumer overview from backend.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const allocation = overview?.package_allocation_kwh || consumer.monthlyGreenAllocation || 0;
  const greenCredit = overview?.green_credit_kwh || 0;
  const remainingCredit = Math.max(allocation - greenCredit, 0);
  const creditProgress = allocation > 0 ? Math.min((greenCredit / allocation) * 100, 100) : 0;

  return (
    <DashboardCard
      action={overview && <StatusBadge tone={remainingCredit > 0 ? 'success' : 'warning'}>
        {remainingCredit > 0 ? 'Green credit available' : 'TNB fallback active'}
      </StatusBadge>}
      eyebrow="Consumer overview"
      title={overview?.business_name || consumer.name}
    >
      <p className="microcopy">
        Monthly values are calculated from daily meter records.
      </p>
      {error && <div className="auth-error">{error}</div>}
      {!overview && (
        <div className="auth-error">
          {loading ? 'Loading monthly usage totals from backend daily records...' : 'No backend daily usage records loaded.'}
        </div>
      )}
      {overview && (
        <>
          <div className="summary-title-row compact-title-row">
            <div>
              <span>Current Package</span>
              <strong>{overview.selected_package}, {allocation.toLocaleString()} kWh/month</strong>
            </div>
          </div>

          <div className="progress-block">
            <div>
              <span>Green Credit Used This Month</span>
              <strong>{greenCredit.toLocaleString()} / {allocation.toLocaleString()} kWh used</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${creditProgress}%` }} />
            </div>
          </div>

          <div className="summary-metrics compact">
            <div>
              <span>Green Credit Remaining</span>
              <strong>{remainingCredit.toLocaleString()} kWh</strong>
            </div>
            <div>
              <span>TNB Import This Month</span>
              <strong>{overview.tnb_import_kwh.toLocaleString()} kWh</strong>
            </div>
            <div>
              <span>Total Bill</span>
              <strong>RM{overview.total_bill.toFixed(2)}</strong>
            </div>
            <div>
              <span>Actual Bill Saving</span>
              <strong>{overview.actual_saving_percentage.toFixed(2)}%</strong>
            </div>
          </div>
        </>
      )}
    </DashboardCard>
  );
}
