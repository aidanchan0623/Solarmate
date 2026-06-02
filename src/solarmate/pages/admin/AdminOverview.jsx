import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle, DollarSign, Users } from 'lucide-react';
import DataTable from '../../components/DataTable';
import HorizontalBarChart from '../../components/HorizontalBarChart';
import { getAdminOverview, getAdminWalletTransactions } from '../../api/client';
import StyledSelect from '../../components/StyledSelect';

const transactionColumns = [
  { key: 'created_at', label: 'Date', render: (row) => malaysiaDateTime(row.created_at) },
  { key: 'username', label: 'User' },
  { key: 'role', label: 'Role' },
  { key: 'transaction_type', label: 'Activity' },
  { key: 'amount', label: 'Amount', render: (row) => `RM${Number(row.amount || 0).toFixed(2)}` },
  { key: 'status', label: 'Status' }
];

const widgetCardClass = 'bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden';

const summaryThemeClass = {
  teal: {
    card: 'bg-gradient-to-br from-teal-50/80 via-white to-white border-teal-100/80',
    accent: 'bg-teal-500',
    glow: 'hover:shadow-[0_0_0_1px_rgba(45,212,191,0.35),0_16px_46px_rgba(45,212,191,0.32)]',
    halo: 'bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.22),transparent_62%)]'
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-50/90 via-white to-white border-amber-100/80',
    accent: 'bg-amber-500',
    glow: 'hover:shadow-[0_0_0_1px_rgba(251,146,60,0.35),0_16px_46px_rgba(251,146,60,0.3)]',
    halo: 'bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.22),transparent_62%)]'
  },
  emerald: {
    card: 'bg-gradient-to-br from-emerald-50/90 via-white to-white border-emerald-100/80',
    accent: 'bg-emerald-500',
    glow: 'hover:shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_16px_46px_rgba(52,211,153,0.32)]',
    halo: 'bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.22),transparent_62%)]'
  },
  cyan: {
    card: 'bg-gradient-to-br from-cyan-50/90 via-white to-white border-cyan-100/80',
    accent: 'bg-cyan-500',
    glow: 'hover:shadow-[0_0_0_1px_rgba(45,212,191,0.35),0_16px_46px_rgba(45,212,191,0.32)]',
    halo: 'bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.22),transparent_62%)]'
  },
  sky: {
    card: 'bg-gradient-to-br from-sky-50/90 via-white to-white border-sky-100/80',
    accent: 'bg-sky-500',
    glow: 'hover:shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_16px_46px_rgba(56,189,248,0.32)]',
    halo: 'bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.22),transparent_62%)]'
  },
  slate: {
    card: 'bg-gradient-to-br from-slate-50 via-white to-white border-slate-100',
    accent: 'bg-slate-400',
    glow: 'hover:shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_16px_46px_rgba(56,189,248,0.32)]',
    halo: 'bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.22),transparent_62%)]'
  }
};

function KpiCard({ icon: Icon, label, value, detail, tone = 'emerald' }) {
  const toneClass = tone === 'teal'
    ? 'border border-teal-300/30 bg-teal-400/15 text-teal-200 shadow-[0_0_22px_rgba(45,212,191,0.22)]'
    : 'border border-emerald-300/30 bg-emerald-400/15 text-emerald-200 shadow-[0_0_22px_rgba(52,211,153,0.22)]';
  const cardTintClass = tone === 'teal'
    ? 'bg-gradient-to-br from-teal-50/80 via-white to-white'
    : 'bg-gradient-to-br from-emerald-50/80 via-white to-white';

  return (
    <div className={`${widgetCardClass} ${cardTintClass} flex h-full min-h-[220px] flex-col justify-between p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-full p-2.5 ${toneClass}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">+12.5%</span>
      </div>
      <span className="mt-5 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <strong className="mt-2 block text-2xl font-bold tracking-normal text-slate-900 tabular-nums">{value}</strong>
      <small className="mt-1 block text-sm font-medium text-slate-500">{detail}</small>
    </div>
  );
}

function SummaryMetric({ accent = 'teal', label, value, detail }) {
  const theme = summaryThemeClass[accent] || summaryThemeClass.teal;

  return (
    <div className={`group relative overflow-hidden rounded-xl border p-5 shadow-[0_18px_48px_-36px_rgba(0,0,0,0.9)] transition-all duration-300 ease-in-out hover:-translate-y-1 ${theme.glow} ${theme.card}`}>
      <div className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${theme.halo}`} />
      <div className={`absolute inset-x-0 top-0 h-1 ${theme.accent}`} />
      <span className="relative block text-xs font-medium text-slate-500">{label}</span>
      <strong className="relative mt-2 block text-xl font-bold leading-tight text-slate-900 tabular-nums">{value}</strong>
      <small className="relative mt-1 block text-xs font-medium leading-relaxed text-slate-500">{detail}</small>
    </div>
  );
}

function MatchRadial({ rate, matchedEnergy }) {
  const percent = Math.max(0, Math.min(rate, 100));
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className={`${widgetCardClass} flex h-full min-h-[360px] flex-col p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Matched Energy</p>
          <h3 className="mt-1 text-lg font-bold text-white">Supply Match Rate</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">Matched energy divided by total prosumer supply.</p>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-2 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.22)]">
          <CheckCircle size={20} />
        </div>
      </div>
      <div className="grid flex-1 place-items-center py-8">
        <div className="relative grid h-60 w-60 place-items-center rounded-full">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
            <defs>
              <linearGradient id="matchRateGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <filter id="matchRateGlow" x="-35%" y="-35%" width="170%" height="170%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle
              cx="100"
              cy="100"
              fill="transparent"
              r={radius}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="24"
            />
            <circle
              cx="100"
              cy="100"
              fill="transparent"
              filter="url(#matchRateGlow)"
              r={radius}
              stroke="url(#matchRateGradient)"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              strokeWidth="24"
            />
          </svg>
          <div className="relative text-center">
            <strong className="block text-4xl font-bold text-white tracking-tight">{rate.toFixed(1)}%</strong>
            <span className="mt-1 block text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Supply matched</span>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-white/5 bg-slate-800/50 p-4">
        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Energy cleared</span>
        <strong className="mt-1 block text-xl font-bold text-white tabular-nums">{matchedEnergy.toLocaleString()} kWh</strong>
      </div>
    </div>
  );
}

function malaysiaDateTime(value) {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function AdminOverview({ user }) {
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState('month');
  const adminName = user?.full_name || user?.name || user?.username || 'admin';
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString('default', { month: 'long' }).toUpperCase();
  const currentDay = currentDate.getDate();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthElapsedPercentage = (currentDay / daysInMonth) * 100;

  async function loadOverview() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    setLoading(true);
    setError('');
    try {
      const [data, transactionData] = await Promise.all([
        getAdminOverview({ signal: controller.signal }),
        getAdminWalletTransactions()
      ]);
      setOverview(data);
      setTransactions(transactionData);
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
        const [data, transactionData] = await Promise.all([
          getAdminOverview({ signal: controller.signal }),
          getAdminWalletTransactions()
        ]);
        if (!cancelled) {
          setOverview(data);
          setTransactions(transactionData);
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
    <div className="grid grid-cols-12 gap-6">
      {!overview && (
        <section className={`${widgetCardClass} col-span-12 p-6`}>
          {loading ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 font-semibold text-amber-700">
              Loading database-backed admin metrics...
            </div>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 font-semibold text-amber-700">
              {error || 'Unable to load admin metrics. Please check that the FastAPI backend is running.'}
              <div className="mt-4">
                <button
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                  onClick={loadOverview}
                  type="button"
                >
                  Retry Loading Admin Metrics
                </button>
              </div>
            </div>
          )}
        </section>
      )}
      {overview && (
        <>
          <section className={`${widgetCardClass} col-span-12 h-full lg:col-span-8`}>
            <div className="relative h-full min-h-[220px] overflow-hidden bg-gradient-to-br from-teal-50 to-emerald-50 p-8">
              <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl" />
              <div className="absolute bottom-0 right-16 h-24 w-24 rounded-full bg-teal-200/40 blur-2xl" />
              <div className="relative max-w-2xl">
                <span className="inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-600">
                  Cyber Emerald Control
                </span>
                <h2 className="mt-5 text-3xl font-bold tracking-normal text-slate-900">
                  Welcome back, {adminName}
                </h2>
                <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-slate-500">
                  System matching efficiency is up 4.2% today. Review your network health.
                </p>
                <button className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700" type="button">
                  Review Network Health
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </section>

          <div className="col-span-6 h-full lg:col-span-2">
            <KpiCard
              detail={`${overview.total_prosumers.toLocaleString()} / ${overview.total_consumers.toLocaleString()}`}
              icon={Users}
              label="Total Users"
              tone="emerald"
              value={overview.total_users.toLocaleString()}
            />
          </div>

          <div className="col-span-6 h-full lg:col-span-2">
            <KpiCard
              detail={`${overview.active_users.toLocaleString()} active users`}
              icon={DollarSign}
              label="Revenue"
              tone="teal"
              value={`RM${overview.solar_mate_revenue.toLocaleString()}`}
            />
          </div>

          <section className={`${widgetCardClass} col-span-12 p-6`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Network Overview</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">SolarMate platform summary</h3>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                {overview.matching_rate.toFixed(1)}% matched
              </span>
            </div>
            {error && (
              <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                Unable to refresh database metrics: {error}
              </div>
            )}
            <div className="mb-5 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-teal-600">{currentMonthName} platform progress</span>
                  <strong className="mt-1 block text-sm font-semibold text-slate-800">
                    Day {currentDay} of {daysInMonth} — {monthElapsedPercentage.toFixed(1)}% elapsed
                  </strong>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  Live calendar window
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                  style={{ width: `${Math.min(monthElapsedPercentage, 100)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryMetric
                accent="sky"
                detail={`${overview.total_prosumers.toLocaleString()} prosumers / ${overview.total_consumers.toLocaleString()} consumers`}
                label="Total Users"
                value={overview.total_users.toLocaleString()}
              />
              <SummaryMetric
                accent="teal"
                detail="Latest monthly export supply"
                label="Total Prosumer Supply"
                value={`${overview.total_export_commitment.toLocaleString()} kWh`}
              />
              <SummaryMetric
                accent="amber"
                detail="Latest green-credit demand"
                label="Total Consumer Demand"
                value={`${overview.total_consumer_demand.toLocaleString()} kWh`}
              />
              <SummaryMetric
                accent="emerald"
                detail="min(supply, demand)"
                label="Matched Green Energy"
                value={`${overview.matched_green_energy.toLocaleString()} kWh`}
              />
              <SummaryMetric
                accent="cyan"
                detail="Remaining prosumer supply"
                label="Unmatched Supply"
                value={`${overview.unmatched_supply.toLocaleString()} kWh`}
              />
              <SummaryMetric
                accent="sky"
                detail="Remaining consumer demand"
                label="Unmatched Demand"
                value={`${overview.unmatched_demand.toLocaleString()} kWh`}
              />
              <SummaryMetric
                accent="amber"
                detail="Rate-based saving from credited energy"
                label="Consumer Savings"
                value={`RM${overview.consumer_rate_based_savings.toLocaleString()}/month`}
              />
              <SummaryMetric
                accent="emerald"
                detail={`${overview.active_users.toLocaleString()} active users`}
                label="SolarMate Revenue"
                value={`RM${overview.solar_mate_revenue.toLocaleString()}/month`}
              />
            </div>
          </section>

          <section className={`${widgetCardClass} col-span-12 h-auto min-h-fit overflow-visible lg:col-span-8 p-6`}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly Energy Matching</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Exported vs Demand</h3>
              </div>
              <StyledSelect
                className="w-32"
                onChange={(val) => setChartPeriod(val)}
                options={[
                  { value: 'year', label: 'Year' },
                  { value: 'month', label: 'Month' },
                ]}
                value={chartPeriod}
                variant="light"
              />
            </div>
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
          </section>

          <div className="col-span-12 lg:col-span-4">
            <MatchRadial rate={overview.matching_rate} matchedEnergy={overview.matched_green_energy} />
          </div>

          <section className={`${widgetCardClass} col-span-12 p-6`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent Transactions</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Latest Billing Activity</h3>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                {transactions.slice(0, 10).length} latest
              </span>
            </div>
            <DataTable columns={transactionColumns} rows={transactions.slice(0, 10)} />
          </section>
        </>
      )}
    </div>
  );
}
