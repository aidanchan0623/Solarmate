import { useEffect, useState } from 'react';
import { Activity, ArrowDownUp, BatteryCharging, CircleGauge, Zap } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import DataTable from '../../components/DataTable';
import { getAdminOverview } from '../../api/client';
import { adminMetrics } from '../../data/mockData';
import { calculateMatchedRate } from '../../utils/calculations';

const columns = [
  { key: 'label', label: 'Metric' },
  { key: 'value', label: 'Value' },
  { key: 'note', label: 'Notes' }
];
const SUPPLY_DEMAND_CACHE_KEY = 'solarmate-admin-supply-demand-overview';

let supplyDemandCache = null;

function readSupplyDemandCache() {
  if (supplyDemandCache) return supplyDemandCache;
  if (typeof window === 'undefined') return null;

  try {
    const cached = JSON.parse(window.sessionStorage.getItem(SUPPLY_DEMAND_CACHE_KEY) || 'null');
    supplyDemandCache = cached;
    return cached;
  } catch {
    return null;
  }
}

function writeSupplyDemandCache(data) {
  if (!data) return;
  supplyDemandCache = data;

  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SUPPLY_DEMAND_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Memory cache still prevents repeat flicker inside this tab.
  }
}

function fallbackOverview() {
  return {
    total_export_commitment: adminMetrics.totalExportedEnergy,
    matched_green_energy: adminMetrics.totalMatchedEnergy,
    total_consumer_demand: adminMetrics.totalConsumerDemand,
    unmatched_supply: adminMetrics.unmatchedSupply,
    unmatched_demand: adminMetrics.unmatchedDemand,
    matching_rate: adminMetrics.matchingRate
  };
}

function formatKwh(value) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;
}

const summaryThemes = {
  supply: {
    accent: 'from-teal-500 to-cyan-400',
    icon: 'bg-teal-50 text-teal-600 ring-teal-100',
    badge: 'bg-teal-50 text-teal-700 border-teal-100'
  },
  demand: {
    accent: 'from-amber-500 to-yellow-400',
    icon: 'bg-amber-50 text-amber-600 ring-amber-100',
    badge: 'bg-amber-50 text-amber-700 border-amber-100'
  },
  matched: {
    accent: 'from-emerald-500 to-lime-400',
    icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100'
  },
  supplyGap: {
    accent: 'from-sky-500 to-teal-400',
    icon: 'bg-sky-50 text-sky-600 ring-sky-100',
    badge: 'bg-sky-50 text-sky-700 border-sky-100'
  },
  demandGap: {
    accent: 'from-violet-500 to-indigo-400',
    icon: 'bg-violet-50 text-violet-600 ring-violet-100',
    badge: 'bg-violet-50 text-violet-700 border-violet-100'
  }
};

function TrendBadge({ children = '+4.2%', theme = summaryThemes.matched }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold leading-none shadow-sm ${theme.badge}`}>
      {children}
    </span>
  );
}

function SummaryCard({ title, value, trend = '+4.2%', icon: Icon, themeKey = 'matched' }) {
  const theme = summaryThemes[themeKey] || summaryThemes.matched;

  return (
    <div className="group relative flex min-h-[154px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${theme.accent}`} />
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100/70 blur-2xl transition-transform duration-300 group-hover:scale-125" />
      <div className="relative min-w-0 pr-16">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${theme.icon}`}>
            <Icon size={20} />
          </span>
          <span className="min-w-0 max-w-[128px] text-sm font-semibold leading-snug text-slate-600">{title}</span>
        </div>
      </div>
      <div className="absolute right-5 top-7 z-10">
        <TrendBadge theme={theme}>{trend}</TrendBadge>
      </div>
      <strong className="relative mt-5 block text-2xl font-bold tracking-normal text-slate-950 tabular-nums">{value}</strong>
    </div>
  );
}

function EnergyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>
      <div className="grid gap-1.5">
        {payload.map((entry) => (
          <div className="flex items-center gap-3 text-xs" key={entry.dataKey}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-slate-500">{entry.name}</span>
            <strong className="ml-auto text-slate-900">{formatKwh(entry.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEnergyDomain(data) {
  const values = data.flatMap((item) => [item.exported, item.demand, item.matched].map((value) => Number(value) || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const padding = range * 0.25;
  const step = 25000;
  const lower = Math.max(0, Math.floor((min - padding) / step) * step);
  const upper = Math.ceil((max + padding) / step) * step;

  return [lower, upper];
}

function PlatformEnergyChart({ data }) {
  const [timeframe, setTimeframe] = useState('Month');
  const latestPoint = data[data.length - 1] || { exported: 0, demand: 0, matched: 0 };
  const makePoint = (label, exported, demand, matched) => ({
    label,
    exported: latestPoint.exported * exported,
    demand: latestPoint.demand * demand,
    matched: latestPoint.matched * matched
  });
  const hourlyData = [
    makePoint('12am', 0.72, 0.68, 0.66),
    makePoint('4am', 0.58, 0.62, 0.56),
    makePoint('8am', 0.76, 0.74, 0.71),
    makePoint('12pm', 0.96, 0.9, 0.88),
    makePoint('4pm', 0.9, 0.94, 0.87),
    makePoint('8pm', 0.78, 0.84, 0.76)
  ];
  const dailyData = [
    makePoint('Mon', 0.78, 0.74, 0.72),
    makePoint('Tue', 0.86, 0.81, 0.8),
    makePoint('Wed', 0.9, 0.88, 0.85),
    makePoint('Thu', 0.84, 0.9, 0.83),
    makePoint('Fri', 0.94, 0.92, 0.89),
    makePoint('Sat', 0.88, 0.85, 0.82),
    makePoint('Sun', 1, 0.96, 0.93)
  ];
  const monthlyData = data;
  const chartData = timeframe === 'Day' ? hourlyData : timeframe === 'Week' ? dailyData : monthlyData;
  const yDomain = getEnergyDomain(chartData);
  const timeframes = ['Day', 'Week', 'Month'];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Supply & Demand</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Platform Energy Overview</h3>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-4">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {timeframes.map((item) => (
              <button
                className={`rounded-md px-3 py-1 text-sm font-medium transition-all ${
                  timeframe === item
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                }`}
                key={item}
                onClick={() => setTimeframe(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-teal-400" />Exported</span>
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-slate-400" />Demand</span>
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Matched</span>
          </div>
        </div>
      </div>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 18, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="colorExported" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMatched" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={yDomain}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickCount={5}
              tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              tickLine={false}
            />
            <Tooltip content={<EnergyTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
            <Area
              dataKey="exported"
              fill="url(#colorExported)"
              name="Exported Energy"
              stroke="#0d9488"
              strokeWidth={3}
              type="monotone"
            />
            <Area
              dataKey="demand"
              fill="url(#colorDemand)"
              name="Consumer Demand"
              stroke="#94a3b8"
              strokeWidth={3}
              type="monotone"
            />
            <Area
              dataKey="matched"
              fill="url(#colorMatched)"
              name="Matched Energy"
              stroke="#10b981"
              strokeWidth={3}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SupplyDemandSkeleton() {
  return (
    <div className="grid gap-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((item) => (
          <div
            className="min-h-[154px] animate-pulse rounded-2xl border border-white/10 bg-slate-900/60 p-6"
            key={item}
          >
            <div className="h-1 w-full rounded-full bg-slate-700/80" />
            <div className="mt-6 h-10 w-28 rounded bg-slate-800" />
            <div className="mt-8 h-7 w-36 rounded bg-slate-700/70" />
          </div>
        ))}
      </section>
      <div className="h-[430px] animate-pulse rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="h-4 w-32 rounded bg-teal-300/20" />
        <div className="mt-3 h-6 w-56 rounded bg-slate-700/70" />
        <div className="mt-10 h-[300px] rounded-xl bg-slate-950/35" />
      </div>
    </div>
  );
}

export default function AdminSupplyDemand() {
  const [overview, setOverview] = useState(() => readSupplyDemandCache());
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(() => !readSupplyDemandCache());
  const visibleOverview = overview;
  const matchingRate =
    visibleOverview?.matching_rate ?? calculateMatchedRate(visibleOverview?.matched_green_energy, visibleOverview?.total_export_commitment);

  useEffect(() => {
    let cancelled = false;
    async function loadOverview() {
      if (!overview) setIsLoading(true);
      try {
        const data = await getAdminOverview();
        if (!cancelled) {
          setOverview(data);
          writeSupplyDemandCache(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setOverview(fallbackOverview());
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading && !visibleOverview) {
    return <SupplyDemandSkeleton />;
  }

  if (!visibleOverview) return null;

  const rows = [
    {
      label: 'Prosumer supply',
      value: `${visibleOverview.total_export_commitment.toLocaleString()} kWh`,
      note: 'Latest monthly export supply'
    },
    {
      label: 'Consumer demand',
      value: `${visibleOverview.total_consumer_demand.toLocaleString()} kWh`,
      note: 'Latest green-credit demand'
    },
    {
      label: 'Matched energy',
      value: `${visibleOverview.matched_green_energy.toLocaleString()} kWh`,
      note: 'min(supply, demand)'
    },
    {
      label: 'Matching rate',
      value: `${matchingRate.toFixed(1)}%`,
      note: 'Matched energy divided by prosumer supply'
    },
    {
      label: 'Unmatched supply',
      value: `${visibleOverview.unmatched_supply.toLocaleString()} kWh`,
      note: 'Available supply after matching'
    },
    {
      label: 'Unmatched demand',
      value: `${visibleOverview.unmatched_demand.toLocaleString()} kWh`,
      note: 'Demand not covered by SolarMate supply'
    }
  ];

  const trendMultipliers = [
    { label: 'Jan', exported: 0.82, demand: 0.78, matched: 0.76 },
    { label: 'Feb', exported: 0.9, demand: 0.86, matched: 0.84 },
    { label: 'Mar', exported: 0.87, demand: 0.92, matched: 0.86 },
    { label: 'Apr', exported: 0.96, demand: 0.9, matched: 0.91 },
    { label: 'May', exported: 0.93, demand: 0.95, matched: 0.92 },
    { label: 'Jun', exported: 1, demand: 1, matched: 1 }
  ];

  const chartData = trendMultipliers.map((item) => ({
    label: item.label,
    exported: visibleOverview.total_export_commitment * item.exported,
    demand: visibleOverview.total_consumer_demand * item.demand,
    matched: visibleOverview.matched_green_energy * item.matched
  }));

  return (
    <div className="grid gap-6">
      {error && <div className="auth-error">Using fallback metrics: {error}</div>}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={Zap}
          themeKey="supply"
          title="Prosumer Supply"
          trend="+4.2%"
          value={formatKwh(visibleOverview.total_export_commitment)}
        />
        <SummaryCard
          icon={Activity}
          themeKey="demand"
          title="Consumer Demand"
          trend="+3.8%"
          value={formatKwh(visibleOverview.total_consumer_demand)}
        />
        <SummaryCard
          icon={BatteryCharging}
          themeKey="matched"
          title="Matched Energy"
          trend="+5.1%"
          value={formatKwh(visibleOverview.matched_green_energy)}
        />
        <SummaryCard
          icon={ArrowDownUp}
          themeKey="supplyGap"
          title="Unmatched Supply"
          trend="+1.4%"
          value={formatKwh(visibleOverview.unmatched_supply)}
        />
        <SummaryCard
          icon={CircleGauge}
          themeKey="demandGap"
          title="Unmatched Demand"
          trend={`${matchingRate.toFixed(1)}%`}
          value={formatKwh(visibleOverview.unmatched_demand)}
        />
      </section>

      <PlatformEnergyChart data={chartData} />

      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Matching details</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Prototype allocation summary</h3>
        </div>
        <DataTable columns={columns} rows={rows} />
      </section>
    </div>
  );
}
