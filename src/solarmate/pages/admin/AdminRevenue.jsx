import { useEffect, useMemo, useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import CompactGroupedBarChart from '../../components/CompactGroupedBarChart';
import { getAdminMonthlyExportRecords, getAdminOverview } from '../../api/client';
import { adminMetrics } from '../../data/mockData';
import { PLATFORM_SPREAD_RATE, calculatePlatformRevenue } from '../../utils/calculations';
import { Activity, CircleDollarSign, TrendingUp, Zap } from 'lucide-react';

const REVENUE_OVERVIEW_CACHE_KEY = 'solarmate-admin-revenue-overview';
const MONTHLY_EXPORT_CACHE_KEY = 'solarmate-admin-monthly-export-records';

let revenueOverviewCache = null;
let revenueMonthlyRecordsCache = null;

function readCache(key, memoryValue) {
  if (memoryValue) return memoryValue;
  if (typeof window === 'undefined') return null;

  try {
    return JSON.parse(window.sessionStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  if (!value || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Memory cache still helps during the current tab session.
  }
}

function readRevenueOverviewCache() {
  revenueOverviewCache = readCache(REVENUE_OVERVIEW_CACHE_KEY, revenueOverviewCache);
  return revenueOverviewCache;
}

function readMonthlyRecordsCache() {
  revenueMonthlyRecordsCache = readCache(MONTHLY_EXPORT_CACHE_KEY, revenueMonthlyRecordsCache);
  return Array.isArray(revenueMonthlyRecordsCache) ? revenueMonthlyRecordsCache : [];
}

function writeRevenueOverviewCache(data) {
  revenueOverviewCache = data;
  writeCache(REVENUE_OVERVIEW_CACHE_KEY, data);
}

function writeMonthlyRecordsCache(data) {
  if (!Array.isArray(data)) return;
  revenueMonthlyRecordsCache = data;
  writeCache(MONTHLY_EXPORT_CACHE_KEY, data);
}

function RevenueInsight({ label, value, detail, tone = 'teal', icon: Icon = Activity }) {
  const tones = {
    teal: {
      card: 'border-teal-400/20 bg-gradient-to-br from-teal-400/14 to-slate-900/40 hover:shadow-[0_0_34px_rgba(45,212,191,0.18)]',
      icon: 'border-teal-300/20 bg-teal-300/10 text-teal-200'
    },
    amber: {
      card: 'border-amber-300/20 bg-gradient-to-br from-amber-300/14 to-slate-900/40 hover:shadow-[0_0_34px_rgba(251,191,36,0.16)]',
      icon: 'border-amber-200/20 bg-amber-300/10 text-amber-200'
    },
    sky: {
      card: 'border-sky-400/20 bg-gradient-to-br from-sky-400/14 to-slate-900/40 hover:shadow-[0_0_34px_rgba(56,189,248,0.16)]',
      icon: 'border-sky-300/20 bg-sky-300/10 text-sky-200'
    }
  };
  const theme = tones[tone] || tones.teal;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 ${theme.card}`}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-24 w-24 rounded-full bg-white/5 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
          <strong className="mt-2 block text-2xl font-bold tracking-tight text-white tabular-nums">{value}</strong>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${theme.icon}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-2 text-xs font-medium text-slate-400">{detail}</p>
    </div>
  );
}

function RevenueTrendTable({ rows }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-teal-950/25 shadow-[0_18px_60px_-42px_rgba(0,0,0,0.95)]">
      <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-teal-300/10 bg-gradient-to-r from-teal-400/12 via-slate-800/40 to-sky-400/10 px-5 py-4 text-xs font-bold uppercase tracking-wider text-teal-100">
        <span>Month</span>
        <span>Matched kWh</span>
        <span>Revenue</span>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((row, index) => (
          <div
            className="grid grid-cols-[1fr_1fr_1fr] items-center px-5 py-4 text-sm transition-colors hover:bg-teal-300/5"
            key={row.fullMonth || row.month}
          >
            <span className="font-medium text-slate-200">{row.month}</span>
            <span className="text-slate-400 tabular-nums">{row.matchedKwh.toLocaleString()} kWh</span>
            <span className="inline-flex w-fit items-center rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 font-bold text-emerald-100 tabular-nums">
              RM{row.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {index === 0 && <span className="sr-only">Latest row</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminRevenue() {
  const [overview, setOverview] = useState({
    matched_green_energy: readRevenueOverviewCache()?.matched_green_energy ?? adminMetrics.totalMatchedEnergy,
    solar_mate_revenue: readRevenueOverviewCache()?.solar_mate_revenue ?? adminMetrics.totalSolarMateRevenue
  });
  const [monthlyRecords, setMonthlyRecords] = useState(() => readMonthlyRecordsCache());
  const [error, setError] = useState('');
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(() => readMonthlyRecordsCache().length < 2);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const data = await getAdminOverview();
        if (!cancelled) {
          setOverview(data);
          writeRevenueOverviewCache(data);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    async function loadMonthlyRecords() {
      if (monthlyRecords.length < 2) setIsLoadingRevenue(true);
      try {
        const records = await getAdminMonthlyExportRecords();
        if (!cancelled) {
          setMonthlyRecords(records);
          writeMonthlyRecordsCache(records);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoadingRevenue(false);
      }
    }

    loadOverview();
    loadMonthlyRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  const scaledRevenueByMonth = useMemo(() => {
    if (monthlyRecords.length) {
      return monthlyRecords.map((row) => ({
        month: row.month.split(' ')[0],
        fullMonth: row.month,
        matchedKwh: Math.round(row.matched_energy_kwh || 0),
        revenue: Number((row.solar_mate_revenue || 0).toFixed(2))
      }));
    }
    return [{
      month: 'Current',
      fullMonth: 'Current month',
      matchedKwh: Math.round(overview.matched_green_energy || 0),
      revenue: Number((overview.solar_mate_revenue || 0).toFixed(2))
    }];
  }, [monthlyRecords, overview]);

  const platformRevenue = calculatePlatformRevenue(overview.matched_green_energy);

  return (
    <div className="page-stack">
      <DashboardCard eyebrow="Revenue" title="Platform spread performance">
        {error && <div className="auth-error">Using fallback revenue metrics: {error}</div>}
        <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_82%_20%,rgba(45,212,191,0.22),transparent_32%),linear-gradient(135deg,#020617_0%,#0f172a_48%,#042f2e_100%)] p-6 shadow-[0_28px_90px_-54px_rgba(0,0,0,0.98)]">
          <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="pointer-events-none absolute right-8 top-8 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative grid gap-7 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-200">
                  Platform spread revenue
                </span>
                <span className="rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-1 text-xs font-semibold text-emerald-100">
                  Live month projection
                </span>
              </div>
              <div className="mt-5 flex flex-wrap items-end gap-4">
                <strong className="block text-6xl font-black tracking-tight text-white tabular-nums">
                  RM{platformRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </strong>
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
                  <TrendingUp size={14} />
                  Matched energy monetized
                </span>
              </div>
              <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-slate-400">
                Matched energy x RM{PLATFORM_SPREAD_RATE.toFixed(2)} per kWh.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <RevenueInsight
                  detail="Credited energy volume"
                  icon={Zap}
                  label="Matched energy"
                  tone="teal"
                  value={`${overview.matched_green_energy.toLocaleString()} kWh`}
                />
                <RevenueInsight
                  detail="Latest monthly run-rate"
                  icon={CircleDollarSign}
                  label="Projected monthly"
                  tone="sky"
                  value={`RM${overview.solar_mate_revenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}`}
                />
              </div>
              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/35 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-semibold text-slate-300">
                    Revenue = matched kWh x RM{PLATFORM_SPREAD_RATE.toFixed(2)}
                  </p>
                  <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-teal-300/20 bg-teal-300/10 px-4 py-2 text-sm font-bold text-teal-100">
                    <CircleDollarSign size={16} />
                    RM{platformRevenue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="relative min-h-[340px] overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px]" />
              <div className="relative flex h-full flex-col items-center justify-center">
                <div className="relative grid h-60 w-60 place-items-center rounded-full bg-[conic-gradient(from_220deg,#facc15_0_22%,rgba(250,204,21,0.08)_22%_100%)] p-1 shadow-[0_0_70px_rgba(20,184,166,0.14)]">
                  <div className="grid h-full w-full place-items-center rounded-full border border-white/10 bg-slate-950/80">
                    <div className="text-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-amber-200">Spread rate</span>
                      <strong className="mt-2 block text-5xl font-black text-white tabular-nums">RM{PLATFORM_SPREAD_RATE.toFixed(2)}</strong>
                      <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">per kWh</span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid w-full grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rate basis</p>
                    <p className="mt-1 text-sm font-bold text-slate-100">Operator spread</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cycle</p>
                    <p className="mt-1 text-sm font-bold text-slate-100">Current month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard eyebrow="Trend" title="Monthly SolarMate revenue">
        <CompactGroupedBarChart
          className="bg-gradient-to-br from-slate-950/70 via-slate-900/70 to-teal-950/35 shadow-inner shadow-black/20"
          data={scaledRevenueByMonth}
          isLoading={isLoadingRevenue}
          maxBarSize={48}
          minDataPoints={2}
          series={[{ key: 'revenue', label: 'SolarMate revenue', color: 'teal' }]}
          tooltipExtra={(item) => [
            {
              label: 'Matched energy',
              value: `${item.matchedKwh.toLocaleString()} kWh`,
              color: 'gold'
            }
          ]}
          tooltipTitle={(item) => item.fullMonth}
          useGradientBars
          valuePrefix="RM"
          xKey="month"
        />
        {isLoadingRevenue && monthlyRecords.length < 2 ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
            {[0, 1, 2].map((item) => (
              <div className="h-10 animate-pulse rounded-xl bg-slate-800/60" key={item} />
            ))}
          </div>
        ) : (
          <RevenueTrendTable rows={scaledRevenueByMonth} />
        )}
      </DashboardCard>
    </div>
  );
}
