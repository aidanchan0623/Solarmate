import { useEffect, useMemo, useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';
import CompactGroupedBarChart from '../../components/CompactGroupedBarChart';
import { getAdminOverview } from '../../api/client';
import { adminMetrics, revenueByMonth } from '../../data/mockData';
import { PLATFORM_SPREAD_RATE, calculatePlatformRevenue } from '../../utils/calculations';

const columns = [
  { key: 'month', label: 'Month' },
  { key: 'matchedKwh', label: 'Matched kWh' },
  {
    key: 'revenue',
    label: 'Revenue',
    render: (row) => `RM${row.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
];

export default function AdminRevenue() {
  const [overview, setOverview] = useState({
    matched_green_energy: adminMetrics.totalMatchedEnergy,
    solar_mate_revenue: adminMetrics.totalSolarMateRevenue
  });
  const [error, setError] = useState('');

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

  const scaledRevenueByMonth = useMemo(() => {
    const lastMock = revenueByMonth[revenueByMonth.length - 1];
    const revenueScale = lastMock.revenue ? overview.solar_mate_revenue / lastMock.revenue : 1;
    const energyScale = lastMock.matchedKwh ? overview.matched_green_energy / lastMock.matchedKwh : 1;
    return revenueByMonth.map((row) => ({
      ...row,
      matchedKwh: Math.round(row.matchedKwh * energyScale),
      revenue: Number((row.revenue * revenueScale).toFixed(2))
    }));
  }, [overview]);

  return (
    <div className="page-stack">
      <DashboardCard eyebrow="Revenue" title="Platform spread performance">
        {error && <div className="auth-error">Using fallback revenue metrics: {error}</div>}
        <div className="summary-metrics compact">
          <div>
            <span>Platform spread revenue</span>
            <strong>
              RM{calculatePlatformRevenue(overview.matched_green_energy).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </strong>
          </div>
          <div>
            <span>Revenue per kWh</span>
            <strong>RM{PLATFORM_SPREAD_RATE.toFixed(2)}</strong>
          </div>
          <div>
            <span>Total matched energy</span>
            <strong>{overview.matched_green_energy.toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Projected monthly revenue</span>
            <strong>
              RM{overview.solar_mate_revenue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </strong>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard eyebrow="Trend" title="Monthly SolarMate revenue">
        <CompactGroupedBarChart
          data={scaledRevenueByMonth}
          series={[{ key: 'revenue', label: 'SolarMate revenue', color: 'teal' }]}
          tooltipExtra={(item) => [
            {
              label: 'Matched energy',
              value: `${item.matchedKwh.toLocaleString()} kWh`,
              color: 'gold'
            }
          ]}
          valuePrefix="RM"
          xKey="month"
        />
        <DataTable columns={columns} rows={scaledRevenueByMonth} />
      </DashboardCard>
    </div>
  );
}
