import { useEffect, useMemo, useState } from 'react';
import { BatteryCharging, Download, Leaf, PiggyBank, Receipt, Zap } from 'lucide-react';
import {
  getConsumerLiveMeter,
  getConsumerMonthlyUsageHistory,
  getConsumerStatement
} from '../../api/client';
import CompactGroupedBarChart from '../../components/CompactGroupedBarChart';
import DashboardCard from '../../components/DashboardCard';
import StatementModal from '../../components/StatementModal';
import { SOLARMATE_RATE, TNB_PEAK_TOTAL_RATE } from '../../utils/calculations';

function formatShortDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!year || !month || !day) return value;
  return `${labels[month - 1]} ${day}`;
}

function kwh(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function money(value) {
  return `RM${Number(value || 0).toFixed(2)}`;
}

function KpiCard({ label, value, accent = 'border-l-teal-400', icon: Icon, iconClass = 'text-teal-600 bg-teal-50' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 ${accent}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="block text-sm font-medium text-slate-500">{label}</span>
          <strong className="mt-2 block text-2xl font-bold text-slate-900 tabular-nums">{value}</strong>
        </div>
        {Icon && (
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
    </div>
  );
}

function PaymentStatusBadge({ status }) {
  const isPaid = status === 'Paid';
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
      isPaid
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-amber-200 bg-amber-50 text-amber-700'
    }`}>
      {status}
    </span>
  );
}

function MonthlyUsageTable({ rows }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_-42px_rgba(15,23,42,0.55)]">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <th className="px-5 py-4">Month</th>
            <th className="px-5 py-4">Total Usage</th>
            <th className="px-5 py-4">Green Credit</th>
            <th className="px-5 py-4">TNB Import</th>
            <th className="px-5 py-4">Bill</th>
            <th className="px-5 py-4">Saved</th>
            <th className="px-5 py-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-slate-100 transition-colors hover:bg-teal-50/30" key={row.month_key || row.month}>
              <td className="px-5 py-4 text-sm font-semibold text-slate-800">{row.month}</td>
              <td className="px-5 py-4 text-sm font-semibold text-slate-900 tabular-nums">{kwh(row.total_usage_kwh)} kWh</td>
              <td className="px-5 py-4 text-sm font-medium text-teal-700 tabular-nums">{kwh(row.green_credit_kwh)} kWh</td>
              <td className="px-5 py-4 text-sm font-medium text-slate-600 tabular-nums">{kwh(row.tnb_import_kwh)} kWh</td>
              <td className="px-5 py-4 text-sm font-bold text-slate-900 tabular-nums">{money(row.total_bill)}</td>
              <td className="px-5 py-4 text-sm font-semibold text-emerald-700 tabular-nums">{Number(row.actual_saving_percentage || 0).toFixed(2)}%</td>
              <td className="px-5 py-4"><PaymentStatusBadge status={row.payment_status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
      <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white p-1">
        {['weekly', 'monthly'].map((item) => (
          <button
            className={`px-5 py-2 text-sm font-semibold transition-colors ${
              view === item
                ? 'bg-emerald-600 text-white rounded-full'
                : 'text-slate-500 hover:text-slate-700'
            }`}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <KpiCard
                accent="border-l-teal-400"
                icon={BatteryCharging}
                iconClass="bg-teal-50 text-teal-600"
                label="Energy Used"
                value={`${kwh(weeklySummary.total)} kWh`}
              />
              <KpiCard
                accent="border-l-emerald-400"
                icon={Leaf}
                iconClass="bg-emerald-50 text-emerald-600"
                label="Green Credit"
                value={`${kwh(weeklySummary.green)} kWh`}
              />
              <KpiCard
                accent="border-l-sky-400"
                icon={Zap}
                iconClass="bg-sky-50 text-sky-600"
                label="TNB Import"
                value={`${kwh(weeklySummary.tnb)} kWh`}
              />
              <KpiCard
                accent="border-l-amber-400"
                icon={PiggyBank}
                iconClass="bg-amber-50 text-amber-600"
                label="Estimated Saving"
                value={money(weeklySummary.saving)}
              />
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mt-6">
              <KpiCard
                accent="border-l-teal-400"
                icon={BatteryCharging}
                iconClass="bg-teal-50 text-teal-600"
                label="Total Usage"
                value={`${kwh(currentMonth?.total_usage_kwh)} kWh`}
              />
              <KpiCard
                accent="border-l-emerald-400"
                icon={Leaf}
                iconClass="bg-emerald-50 text-emerald-600"
                label="Green Credit"
                value={`${kwh(currentMonth?.green_credit_kwh)} kWh`}
              />
              <KpiCard
                accent="border-l-sky-400"
                icon={Zap}
                iconClass="bg-sky-50 text-sky-600"
                label="TNB Import"
                value={`${kwh(currentMonth?.tnb_import_kwh)} kWh`}
              />
              <KpiCard
                accent="border-l-blue-400"
                icon={Receipt}
                iconClass="bg-blue-50 text-blue-600"
                label="Month Bill"
                value={money(currentMonth?.total_bill)}
              />
              <KpiCard
                accent="border-l-amber-400"
                icon={PiggyBank}
                iconClass="bg-amber-50 text-amber-600"
                label="Saved"
                value={`${(currentMonth?.actual_saving_percentage ?? 0).toFixed(2)}%`}
              />
            </div>
          </DashboardCard>

          <DashboardCard eyebrow="Monthly chart" title="Monthly Usage by Source">
            <CompactGroupedBarChart
              barSize={58}
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
            <MonthlyUsageTable rows={monthlyRows} />
          </DashboardCard>
        </>
      )}

      <StatementModal data={statement} onClose={() => setStatement(null)} open={Boolean(statement)} type="consumer" />
    </div>
  );
}
