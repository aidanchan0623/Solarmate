import { useEffect, useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';
import HorizontalBarChart from '../../components/HorizontalBarChart';
import StatusBadge from '../../components/StatusBadge';
import { getAdminOverview } from '../../api/client';
import { transactions } from '../../data/mockData';

const transactionColumns = [
  { key: 'id', label: 'Transaction ID' },
  { key: 'consumer', label: 'Consumer' },
  { key: 'creditedEnergy', label: 'Credited Energy' },
  {
    key: 'totalBill',
    label: 'Total Bill',
    render: (row) => `RM${row.totalBill.toFixed(2)}`
  },
  { key: 'paymentStatus', label: 'Payment Status' }
];

export default function AdminOverview() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadOverview() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    setLoading(true);
    setError('');
    try {
      const data = await getAdminOverview({ signal: controller.signal });
      setOverview(data);
    } catch (err) {
      console.error('Unable to load admin metrics', err);
      setOverview(null);
      setError(
        err.name === 'AbortError'
          ? 'Admin metrics request timed out. Please check that the FastAPI backend is running.'
          : err.message || 'Unable to load admin metrics. Please check that the FastAPI backend is running.'
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadOnce() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      setLoading(true);
      setError('');
      try {
        const data = await getAdminOverview({ signal: controller.signal });
        if (!cancelled) {
          setOverview(data);
          setError('');
        }
      } catch (err) {
        console.error('Unable to load admin metrics', err);
        if (!cancelled) {
          setOverview(null);
          setError(
            err.name === 'AbortError'
              ? 'Admin metrics request timed out. Please check that the FastAPI backend is running.'
              : err.message || 'Unable to load admin metrics. Please check that the FastAPI backend is running.'
          );
        }
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    }
    loadOnce();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-stack">
      {!overview && (
        <DashboardCard eyebrow="Network overview" title="SolarMate platform summary">
          {loading ? (
            <div className="auth-error">Loading database-backed admin metrics...</div>
          ) : (
            <div className="auth-error">
              {error || 'Unable to load admin metrics. Please check that the FastAPI backend is running.'}
              <div className="action-row" style={{ marginTop: 12 }}>
                <button className="primary-button" onClick={loadOverview} type="button">
                  Retry Loading Admin Metrics
                </button>
              </div>
            </div>
          )}
        </DashboardCard>
      )}
      {overview && (
      <>
      <DashboardCard
        action={
          <StatusBadge tone={overview.matching_rate >= 100 ? 'success' : 'warning'}>
            {overview.matching_rate.toFixed(1)}% matched
          </StatusBadge>
        }
        eyebrow="Network overview"
        title="SolarMate platform summary"
      >
        {error && <div className="auth-error">Unable to refresh database metrics: {error}</div>}
        <div className="summary-metrics">
          <div>
            <span>Total Users</span>
            <strong>{overview.total_users.toLocaleString()}</strong>
            <small>
              {overview.total_prosumers.toLocaleString()} prosumers / {overview.total_consumers.toLocaleString()} consumers
            </small>
          </div>
          <div>
            <span>Total Prosumer Supply</span>
            <strong>{overview.total_export_commitment.toLocaleString()} kWh</strong>
            <small>Monthly export commitments</small>
          </div>
          <div>
            <span>Total Consumer Demand</span>
            <strong>{overview.total_consumer_demand.toLocaleString()} kWh</strong>
            <small>Subscribed package allocation</small>
          </div>
          <div>
            <span>Matched Green Energy</span>
            <strong>{overview.matched_green_energy.toLocaleString()} kWh</strong>
            <small>min(supply, demand)</small>
          </div>
          <div>
            <span>Unmatched Supply</span>
            <strong>{overview.unmatched_supply.toLocaleString()} kWh</strong>
            <small>Remaining prosumer supply</small>
          </div>
          <div>
            <span>Unmatched Demand</span>
            <strong>{overview.unmatched_demand.toLocaleString()} kWh</strong>
            <small>Remaining consumer demand</small>
          </div>
          <div>
            <span>Consumer Savings</span>
            <strong>RM{overview.consumer_rate_based_savings.toLocaleString()}/month</strong>
            <small>Rate-based saving from credited energy</small>
          </div>
          <div>
            <span>SolarMate Revenue</span>
            <strong>RM{overview.solar_mate_revenue.toLocaleString()}/month</strong>
            <small>{overview.active_users.toLocaleString()} active users</small>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard eyebrow="Monthly Energy Matching" title="Supply, demand, and matched energy">
        <HorizontalBarChart
          items={[
            {
              label: 'Exported Energy',
              value: overview.total_export_commitment,
              color: 'teal',
              tooltipRows: [
                {
                  label: 'Energy amount',
                  value: `${overview.total_export_commitment.toLocaleString()} kWh`,
                  color: 'teal',
                  active: true
                }
              ],
              tooltipNote: 'Verified prosumer export available for matching.'
            },
            {
              label: 'Consumer Demand',
              value: overview.total_consumer_demand,
              color: 'gold',
              tooltipRows: [
                {
                  label: 'Subscribed demand',
                  value: `${overview.total_consumer_demand.toLocaleString()} kWh`,
                  color: 'gold',
                  active: true
                }
              ]
            },
            {
              label: 'Matched Energy',
              value: overview.matched_green_energy,
              color: 'green',
              tooltipRows: [
                {
                  label: 'Energy amount',
                  value: `${overview.matched_green_energy.toLocaleString()} kWh`,
                  color: 'green',
                  active: true
                }
              ],
              tooltipNote: `${overview.matching_rate.toFixed(1)}% of prosumer supply matched.`
            },
            {
              label: 'Unmatched Supply',
              value: overview.unmatched_supply,
              color: 'grey',
              tooltipRows: [
                {
                  label: 'Unmatched supply',
                  value: `${overview.unmatched_supply.toLocaleString()} kWh`,
                  color: 'grey',
                  active: true
                }
              ]
            },
            {
              label: 'Unmatched Demand',
              value: overview.unmatched_demand,
              color: 'blueGrey',
              tooltipRows: [
                {
                  label: 'Unmatched demand',
                  value: `${overview.unmatched_demand.toLocaleString()} kWh`,
                  color: 'blueGrey',
                  active: true
                }
              ]
            }
          ]}
          valueSuffix=" kWh"
        />
      </DashboardCard>

      <DashboardCard eyebrow="Recent transactions" title="Latest billing activity">
        <DataTable columns={transactionColumns} rows={transactions.slice(0, 5)} />
      </DashboardCard>
      </>
      )}
    </div>
  );
}
