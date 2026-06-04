import { useEffect, useMemo, useState } from 'react';
import { BatteryCharging, Download, Leaf, Zap } from 'lucide-react';
import {
  getConsumerLiveMeter,
  getConsumerMonthlyUsageHistory,
  getConsumerStatement
} from '../../api/client';
import CompactGroupedBarChart from '../../components/CompactGroupedBarChart';
import DashboardCard from '../../components/DashboardCard';
import StatementModal from '../../components/StatementModal';
import { calculateConsumerSavings } from '../../utils/calculations';

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

function KpiCard({
  label,
  value,
  accent = 'from-teal-500 to-emerald-400',
  icon: Icon,
  iconClass = 'text-teal-600 bg-teal-50',
  tint = 'from-teal-50/80 via-white to-emerald-50/80'
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-teal-100/50 bg-gradient-to-br ${tint} p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md backdrop-blur-sm`}>
      <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${accent}`} />
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-teal-200/40 blur-3xl mix-blend-multiply transition-opacity duration-300 group-hover:opacity-70" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-emerald-200/40 blur-3xl mix-blend-multiply transition-opacity duration-300 group-hover:opacity-70" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-teal-800/80">{label}</span>
          <strong className="mt-3 block text-2xl font-black tracking-tight text-teal-950 tabular-nums">{value}</strong>
        </div>
        {Icon && (
          <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-105 ${iconClass}`}>
            <Icon size={20} strokeWidth={2.5} />
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
    <div className="mt-6 overflow-hidden rounded-2xl border border-teal-100/50 bg-white/80 shadow-sm backdrop-blur-sm">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-b border-teal-100/50 bg-teal-50/50 text-xs font-bold uppercase tracking-wider text-teal-800/80">
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
    return { total, green, tnb };
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
    saved: row.actual_saving_percentage,
    status: row.payment_status,
    isCurrentMonth: Boolean(currentMonth?.month_key && row.month_key === currentMonth.month_key)
  }));

  async function openStatement() {
    if (!currentMonth) return;
    setStatement(await getConsumerStatement(currentMonth.month_key));
  }

  return (
    <div className="page-stack">
      <div className="inline-flex w-fit rounded-full border border-teal-100 bg-white/80 p-1 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.5)] backdrop-blur">
        {['weekly', 'monthly'].map((item) => (
          <button
            className={`px-5 py-2 text-sm font-semibold transition-colors ${
              view === item
                ? 'bg-gradient-to-r from-teal-600 to-emerald-500 text-white rounded-full shadow-[0_10px_24px_-18px_rgba(16,185,129,0.9)]'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-full'
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <KpiCard
                accent="from-cyan-400 to-teal-500"
                icon={BatteryCharging}
                iconClass="bg-teal-100/80 text-teal-700"
                label="Total Usage"
                tint="from-teal-50 via-cyan-50/60 to-emerald-50/80"
                value={`${kwh(weeklySummary.total)} kWh`}
              />
              <KpiCard
                accent="from-emerald-400 to-lime-300"
                icon={Leaf}
                iconClass="bg-emerald-100/80 text-emerald-700"
                label="Green Credit Used"
                tint="from-emerald-50 via-teal-50/60 to-lime-50/60"
                value={`${kwh(weeklySummary.green)} kWh`}
              />
              <KpiCard
                accent="from-amber-400 to-orange-500"
                icon={Zap}
                iconClass="bg-amber-100/80 text-amber-700"
                label="TNB Import"
                tint="from-amber-50 via-orange-50/50 to-slate-50/80"
                value={`${kwh(weeklySummary.tnb)} kWh`}
              />
            </div>
          </DashboardCard>

          <DashboardCard eyebrow="Weekly chart" title="Green Credit and TNB Import by Day">
            <CompactGroupedBarChart
              barSize={30}
              className="rounded-2xl border border-teal-100/40 bg-gradient-to-br from-teal-50/60 via-emerald-50/30 to-cyan-50/40 p-4 backdrop-blur-sm"
              data={weeklyChartData}
              height={300}
              series={[
                { key: 'greenCredit', label: 'Green credit used', color: 'teal' },
                { key: 'tnbImport', label: 'TNB import', color: 'orange' }
              ]}
              tooltipExtra={(item) => [
                { label: 'Total usage', value: `${kwh(item.totalUsage)} kWh`, color: 'gold' },
                {
                  label: 'Estimated saving',
                  value: money(calculateConsumerSavings(item.totalUsage, item.greenCredit).savings),
                  color: 'green'
                }
              ]}
              tooltipTitle={(item) => item.fullDate}
              valueSuffix=" kWh"
              useGradientBars
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <KpiCard
                accent="from-cyan-400 to-teal-500"
                icon={BatteryCharging}
                iconClass="bg-teal-100/80 text-teal-700"
                label="Total Usage"
                tint="from-teal-50 via-cyan-50/60 to-emerald-50/80"
                value={`${kwh(currentMonth?.total_usage_kwh)} kWh`}
              />
              <KpiCard
                accent="from-emerald-400 to-lime-300"
                icon={Leaf}
                iconClass="bg-emerald-100/80 text-emerald-700"
                label="Green Credit Used"
                tint="from-emerald-50 via-teal-50/60 to-lime-50/60"
                value={`${kwh(currentMonth?.green_credit_kwh)} kWh`}
              />
              <KpiCard
                accent="from-amber-400 to-orange-500"
                icon={Zap}
                iconClass="bg-amber-100/80 text-amber-700"
                label="TNB Import"
                tint="from-amber-50 via-orange-50/50 to-slate-50/80"
                value={`${kwh(currentMonth?.tnb_import_kwh)} kWh`}
              />
            </div>
          </DashboardCard>

          <DashboardCard eyebrow="Monthly chart" title="Monthly Usage by Source">
            <CompactGroupedBarChart
              barRadius={10}
              barSize={54}
              className="consumer-monthly-usage-chart rounded-2xl border border-teal-100/40 bg-gradient-to-br from-teal-50/60 via-emerald-50/30 to-cyan-50/40 p-4 backdrop-blur-sm"
              data={monthlyChartData}
              height={320}
              highlightKey="isCurrentMonth"
              highlightLabel="In Progress"
              maxBarSize={62}
              roundedStacked
              series={[
                { key: 'greenCredit', label: 'Green credit', color: 'teal' },
                { key: 'tnbImport', label: 'TNB import', color: 'orange' }
              ]}
              stacked
              tooltipExtra={(item) => [
                { label: 'Total usage', value: `${kwh(item.totalUsage)} kWh`, color: 'gold' },
                { label: 'Bill', value: money(item.bill), color: 'green' },
                { label: 'Saved', value: `${Number(item.saved || 0).toFixed(2)}%`, color: 'teal' },
                ...(item.status ? [{ label: 'Status', value: item.status, color: item.isCurrentMonth ? 'amber' : 'blueGrey' }] : [])
              ]}
              tooltipTitle={(item) => item.fullMonth}
              valueSuffix=" kWh"
              useGradientBars
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
