import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  getConsumerLiveMeter,
  getConsumerMonthlyUsageHistory,
  getConsumerStatement
} from '../../api/client';
import CompactGroupedBarChart from '../../components/CompactGroupedBarChart';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';
import StatementModal from '../../components/StatementModal';
import { SOLARMATE_RATE, TNB_PEAK_TOTAL_RATE } from '../../utils/calculations';

const columns = [
  { key: 'month', label: 'Month' },
  { key: 'total_usage_kwh', label: 'Total Usage', render: (row) => `${row.total_usage_kwh.toLocaleString()} kWh` },
  { key: 'green_credit_kwh', label: 'Green Credit', render: (row) => `${row.green_credit_kwh.toLocaleString()} kWh` },
  { key: 'tnb_import_kwh', label: 'TNB Import', render: (row) => `${row.tnb_import_kwh.toLocaleString()} kWh` },
  { key: 'total_bill', label: 'Bill', render: (row) => `RM${row.total_bill.toFixed(2)}` },
  { key: 'actual_saving_percentage', label: 'Saved', render: (row) => `${row.actual_saving_percentage.toFixed(2)}%` },
  { key: 'payment_status', label: 'Status' }
];

function formatShortDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function kwh(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function money(value) {
  return `RM${Number(value || 0).toFixed(2)}`;
}

export default function ConsumerUsageConsumption({ consumer }) {
  const [view, setView] = useState('weekly');
  const [meter, setMeter] = useState(null);
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getConsumerLiveMeter(),
      getConsumerMonthlyUsageHistory()
    ])
      .then(([meterData, historyData]) => {
        if (!mounted) return;
        setMeter(meterData);
        setMonthlyRows(historyData);
        setError('');
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Unable to load usage and consumption data.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const weeklyRows = meter?.records || [];
  const weeklySummary = useMemo(() => {
    const total = weeklyRows.reduce((sum, row) => sum + row.total_usage_kwh, 0);
    const green = weeklyRows.reduce((sum, row) => sum + row.green_credit_kwh, 0);
    const tnb = weeklyRows.reduce((sum, row) => sum + row.tnb_import_kwh, 0);
    const saving = green * (TNB_PEAK_TOTAL_RATE - SOLARMATE_RATE);
    return { total, green, tnb, saving };
  }, [weeklyRows]);

  const currentMonth = monthlyRows[monthlyRows.length - 1];

  const weeklyChartData = weeklyRows.map((row) => ({
    date: formatShortDate(row.date),
    fullDate: row.date,
    greenCredit: row.green_credit_kwh,
    tnbImport: row.tnb_import_kwh,
    totalUsage: row.total_usage_kwh
  }));

  const monthlyChartData = monthlyRows.map((row) => ({
    month: row.month.slice(0, 3),
    fullMonth: row.month,
    greenCredit: row.green_credit_kwh,
    tnbImport: row.tnb_import_kwh,
    totalUsage: row.total_usage_kwh,
    bill: row.total_bill,
    saved: row.actual_saving_percentage
  }));

  async function openStatement() {
    if (!currentMonth) return;
    setStatement(await getConsumerStatement(currentMonth.month_key));
  }

  return (
    <div className="page-stack">
      <div className="view-tabs">
        {['weekly', 'monthly'].map((item) => (
          <button
            className={view === item ? 'active' : ''}
            key={item}
            onClick={() => setView(item)}
            type="button"
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {error && <div className="auth-error">{error}</div>}

      {view === 'weekly' && (
        <>
          <DashboardCard eyebrow="Weekly consumption" title="This Week's Usage and Green Credit">
            <p className="microcopy">
              Weekly values are summed from daily meter records. Total usage equals green credit plus TNB import.
            </p>
            <div className="summary-metrics compact important-metrics">
              <div className="metric-emphasis"><span>Energy Used This Week</span><strong>{kwh(weeklySummary.total)} kWh</strong></div>
              <div><span>Green Credit Used This Week</span><strong>{kwh(weeklySummary.green)} kWh</strong></div>
              <div><span>TNB Import This Week</span><strong>{kwh(weeklySummary.tnb)} kWh</strong></div>
              <div className="metric-emphasis"><span>Estimated Saving This Week</span><strong>{money(weeklySummary.saving)}</strong></div>
            </div>
          </DashboardCard>

          <DashboardCard eyebrow="Weekly chart" title="Green Credit and TNB Import by Day">
            <CompactGroupedBarChart
              data={weeklyChartData}
              height={300}
              series={[
                { key: 'greenCredit', label: 'Green credit used', color: 'teal' },
                { key: 'tnbImport', label: 'TNB import', color: 'blueGrey' }
              ]}
              tooltipExtra={(item) => [
                { label: 'Total usage', value: `${kwh(item.totalUsage)} kWh`, color: 'gold' }
              ]}
              tooltipTitle={(item) => item.fullDate}
              valueSuffix=" kWh"
              xKey="date"
            />
          </DashboardCard>
        </>
      )}

      {view === 'monthly' && (
        <>
          <DashboardCard
            action={<button className="secondary-button" type="button" onClick={openStatement}><Download size={16} /> Download Statement</button>}
            eyebrow="Monthly consumption"
            title="Current Month Usage and Bill"
          >
            <p className="microcopy">
              Monthly values are calculated from daily meter records and use the same totals as billing.
            </p>
            <div className="summary-metrics compact important-metrics">
              <div><span>Total Usage This Month</span><strong>{kwh(currentMonth?.total_usage_kwh)} kWh</strong></div>
              <div><span>Green Credit Used This Month</span><strong>{kwh(currentMonth?.green_credit_kwh)} kWh</strong></div>
              <div><span>TNB Import This Month</span><strong>{kwh(currentMonth?.tnb_import_kwh)} kWh</strong></div>
              <div className="metric-emphasis bill-emphasis"><span>Current Month Bill</span><strong>{money(currentMonth?.total_bill)}</strong></div>
              <div><span>Percentage Saved</span><strong>{(currentMonth?.actual_saving_percentage ?? 0).toFixed(2)}%</strong></div>
            </div>
          </DashboardCard>

          <DashboardCard eyebrow="Monthly chart" title="Monthly Usage by Source">
            <CompactGroupedBarChart
              data={monthlyChartData}
              height={300}
              series={[
                { key: 'greenCredit', label: 'Green credit', color: 'teal' },
                { key: 'tnbImport', label: 'TNB import', color: 'blueGrey' }
              ]}
              stacked
              tooltipExtra={(item) => [
                { label: 'Total usage', value: `${kwh(item.totalUsage)} kWh`, color: 'gold' },
                { label: 'Bill', value: money(item.bill), color: 'green' },
                { label: 'Saved', value: `${Number(item.saved || 0).toFixed(2)}%`, color: 'teal' }
              ]}
              tooltipTitle={(item) => item.fullMonth}
              valueSuffix=" kWh"
              xKey="month"
            />
            <DataTable columns={columns} rows={monthlyRows} />
          </DashboardCard>
        </>
      )}

      <StatementModal data={statement} onClose={() => setStatement(null)} open={Boolean(statement)} type="consumer" />
    </div>
  );
}
