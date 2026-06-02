import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { getAdminMonthlyExportRecords } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';

const chartPanelClass = 'rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.95)] backdrop-blur-xl';

function formatKwh(value) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;
}

function formatRm(value) {
  return `RM${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function axisKwh(value) {
  return `${Math.round(Number(value || 0) / 1000)}k`;
}

function axisRm(value) {
  return `RM${Math.round(Number(value || 0) / 1000)}k`;
}

function percentValue(value, total) {
  const denominator = Number(total || 0);
  if (!denominator) return 0;
  return (Number(value || 0) / denominator) * 100;
}

function statusColor(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('pending')) return '#f59e0b';
  if (normalized.includes('processing')) return '#60a5fa';
  if (normalized.includes('settled') || normalized.includes('successful') || normalized.includes('paid')) return '#10b981';
  return '#64748b';
}

function statusBadgeClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('pending')) return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  if (normalized.includes('processing')) return 'border-blue-400/30 bg-blue-400/10 text-blue-200';
  if (normalized.includes('settled') || normalized.includes('successful') || normalized.includes('paid')) {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }
  return 'border-slate-400/30 bg-slate-400/10 text-slate-200';
}

function DarkTooltip({ active, payload, label, valueFormatter = formatKwh }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-slate-200 shadow-2xl">
      <p className="mb-2 text-sm font-semibold text-white">{label}</p>
      <div className="grid gap-1.5">
        {payload.map((entry) => (
          <div className="flex items-center gap-3 text-xs" key={entry.dataKey}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-slate-400">{entry.name}</span>
            <strong className="ml-auto text-slate-100">{valueFormatter(entry.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllocationTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const items = [
    { color: '#14b8a6', label: 'Sold to SolarMate', value: row.soldToSolarMate },
    { color: '#8b5cf6', label: 'Solar ATAP Excess', value: row.solarAtapExcess },
    { color: '#f59e0b', label: 'Unmatched Demand', value: row.unmatchedDemand },
    { color: '#cbd5e1', label: 'Unmatched Supply', value: row.unmatchedSupply }
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-slate-200 shadow-[0_18px_45px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <p className="mb-2 text-sm font-semibold text-white">{label}</p>
      <div className="grid min-w-56 gap-1.5">
        {items.filter((item) => Number(item.value) > 0).map((item) => (
          <div className="flex items-center gap-3 text-xs" key={item.label}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-slate-400">{item.label}</span>
            <strong className="ml-auto text-slate-100">{formatKwh(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartHeader({ eyebrow, title, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-bold text-slate-50">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const allocationLegendItems = [
  { color: '#2dd4bf', label: 'Sold to SolarMate' },
  { color: '#8b5cf6', label: 'Solar ATAP Excess' },
  { color: '#f59e0b', label: 'Unmatched Demand' },
  { color: '#cbd5e1', label: 'Unmatched Supply' }
];

export default function AdminExportHistory() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    getAdminMonthlyExportRecords()
      .then((data) => {
        if (!isMounted) return;
        setRows(data);
        setError('');
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Unable to load monthly export records from backend.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const latest = rows[rows.length - 1];
  const chartRows = rows.map((row) => {
    const prosumerSupply = Number(row.prosumer_supply_kwh) || 0;
    const soldToSolarMate = Number(row.sold_to_solarmate_kwh) || 0;
    const solarAtapExcess = Number(row.solar_atap_excess_kwh) || 0;
    const unmatchedDemand = Number(row.unmatched_demand_kwh) || 0;
    const allocationTotal = Math.max(soldToSolarMate + solarAtapExcess + unmatchedDemand, prosumerSupply, 1);

    return {
      month: row.month,
      prosumerSupply,
      consumerDemand: Number(row.consumer_demand_kwh) || 0,
      matchedEnergy: Number(row.matched_energy_kwh) || 0,
      unmatchedSupply: Number(row.unmatched_supply_kwh) || 0,
      unmatchedDemand,
      soldToSolarMate,
      solarAtapExcess,
      soldToSolarMateShare: percentValue(soldToSolarMate, allocationTotal),
      solarAtapExcessShare: percentValue(solarAtapExcess, allocationTotal),
      unmatchedDemandShare: percentValue(unmatchedDemand, allocationTotal),
      unmatchedSupplyShare: percentValue(Number(row.unmatched_supply_kwh) || 0, allocationTotal),
      payout: Number(row.total_prosumer_payout) || 0,
      status: row.status || 'unknown'
    };
  });

  return (
    <div className="page-stack">
      <DashboardCard eyebrow="Monthly export records" title="Platform export and matching records">
        <p className="microcopy">
          Platform monthly records are aggregated from prosumer export and consumer demand data.
          Matched energy is calculated as min(prosumer supply, consumer demand).
        </p>
        {error && <div className="auth-error">{error}</div>}
        {latest && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 w-full">
            
            {/* Card 1: Latest Month (Blue Accent) */}
            <div className="flex flex-col p-5 bg-slate-900/80 border-x border-b border-slate-800 border-t-4 border-t-blue-500 rounded-xl shadow-lg">
              <p className="text-sm font-medium text-slate-400 mb-1">Latest month</p>
              <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{latest.month}</h3>
              <p className="text-xs text-slate-500 mt-2">Current billing cycle</p>
            </div>

            {/* Card 2: Matched Energy (Teal Accent) */}
            <div className="flex flex-col p-5 bg-slate-900/80 border-x border-b border-slate-800 border-t-4 border-t-teal-400 rounded-xl shadow-lg relative overflow-hidden">
              {/* Optional subtle glow matching the reference */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-teal-500/10 blur-xl rounded-full"></div>
              <p className="text-sm font-medium text-slate-400 mb-1 relative z-10">Matched energy</p>
              <h3 className="text-2xl font-bold text-slate-100 tracking-tight relative z-10">{latest.matched_energy_kwh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh</h3>
              <p className="text-xs text-slate-500 mt-2 relative z-10">min(supply, demand)</p>
            </div>

            {/* Card 3: Unmatched Supply (Orange Accent) */}
            <div className="flex flex-col p-5 bg-slate-900/80 border-x border-b border-slate-800 border-t-4 border-t-orange-500 rounded-xl shadow-lg">
              <p className="text-sm font-medium text-slate-400 mb-1">Unmatched supply</p>
              <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{latest.unmatched_supply_kwh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh</h3>
              <p className="text-xs text-slate-500 mt-2">Remaining prosumer supply</p>
            </div>

            {/* Card 4: Prosumer Payout (Emerald Accent) */}
            <div className="flex flex-col p-5 bg-slate-900/80 border-x border-b border-slate-800 border-t-4 border-t-emerald-500 rounded-xl shadow-lg">
              <p className="text-sm font-medium text-slate-400 mb-1">Prosumer payout</p>
              <h3 className="text-2xl font-bold text-slate-100 tracking-tight">RM{latest.total_prosumer_payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              <p className="text-xs text-slate-500 mt-2">Total credited payout</p>
            </div>

          </div>
        )}
      </DashboardCard>

      <section className="grid grid-cols-12 gap-6">
        <div className={`${chartPanelClass} col-span-12 xl:col-span-8`}>
          <ChartHeader eyebrow="Supply vs demand trend" title="Supply, Demand & Matched Energy">
            <span className="rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-200">
              Monthly kWh
            </span>
          </ChartHeader>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRows} margin={{ top: 18, right: 18, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="exportSupplyGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="consumerDemandGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="matchedEnergyGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={axisKwh}
                  tickLine={false}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ stroke: 'rgba(148,163,184,0.32)', strokeDasharray: '4 4' }} />
                <Legend iconType="circle" wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
                <Area
                  dataKey="prosumerSupply"
                  fill="url(#exportSupplyGlow)"
                  name="Total Prosumer Supply"
                  stroke="#2dd4bf"
                  strokeWidth={3}
                  type="monotone"
                />
                <Area
                  dataKey="matchedEnergy"
                  fill="url(#matchedEnergyGlow)"
                  name="Matched Energy"
                  stroke="#10b981"
                  strokeWidth={3}
                  type="monotone"
                />
                <Area
                  dataKey="consumerDemand"
                  fill="url(#consumerDemandGlow)"
                  name="Total Consumer Demand"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${chartPanelClass} col-span-12 xl:col-span-4`}>
          <ChartHeader eyebrow="Financial payouts" title="Prosumer Payouts">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              RM
            </span>
          </ChartHeader>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 18, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={axisRm}
                  tickLine={false}
                />
                <Tooltip content={<DarkTooltip valueFormatter={formatRm} />} cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
                <Bar
                  barSize={32}
                  dataKey="payout"
                  maxBarSize={40}
                  name="Total Prosumer Payout"
                  radius={[6, 6, 0, 0]}
                  style={{ filter: 'drop-shadow(0 0 14px rgba(16,185,129,0.38))' }}
                >
                  {chartRows.map((entry) => (
                    <Cell fill={statusColor(entry.status)} key={`${entry.month}-${entry.status}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {chartRows.map((entry) => (
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(entry.status)}`}
                key={`status-${entry.month}`}
              >
                <i className="h-2 w-2 rounded-full" style={{ background: statusColor(entry.status) }} />
                {entry.month}: {entry.status}
              </span>
            ))}
          </div>
        </div>

        <div className={`${chartPanelClass} col-span-12 relative overflow-hidden`}>
          <div className="pointer-events-none absolute inset-x-8 top-0 h-32 bg-[radial-gradient(circle_at_center,_rgba(45,212,191,0.14),_transparent_65%)]" />
          <ChartHeader eyebrow="Allocation efficiency" title="Energy Allocation Mix">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                Normalized share
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                Exact kWh in tooltip
              </span>
            </div>
          </ChartHeader>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            {allocationLegendItems.map((item) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3"
                key={item.label}
              >
                <span
                  className="h-3 w-3 rounded-full shadow-[0_0_16px_currentColor]"
                  style={{ background: item.color, color: item.color }}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-5 shadow-inner shadow-black/20">
            <div className="h-[390px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  barCategoryGap="10%"
                  barGap={10}
                  data={chartRows}
                  margin={{ top: 18, right: 26, left: 0, bottom: 12 }}
                >
                <defs>
                  <linearGradient id="soldShareGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="atapExcessGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="unmatchedDemandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.09)" strokeDasharray="3 6" />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  dy={8}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  tickFormatter={(value) => `${Math.round(value)}%`}
                  tickLine={false}
                />
                <Tooltip content={<AllocationTooltip />} cursor={{ fill: 'rgba(45,212,191,0.06)' }} />
                <Bar
                  dataKey="soldToSolarMateShare"
                  fill="url(#soldShareGradient)"
                  maxBarSize={120}
                  name="Sold to SolarMate"
                  radius={[0, 0, 0, 0]}
                  stackId="a"
                  style={{ filter: 'drop-shadow(0 0 12px rgba(45,212,191,0.22))' }}
                />
                <Bar
                  dataKey="solarAtapExcessShare"
                  fill="url(#atapExcessGradient)"
                  maxBarSize={120}
                  name="Solar ATAP Excess"
                  stackId="a"
                />
                <Bar
                  dataKey="unmatchedDemandShare"
                  fill="url(#unmatchedDemandGradient)"
                  maxBarSize={120}
                  name="Unmatched Demand"
                  radius={[6, 6, 0, 0]}
                  stackId="a"
                />
                <Line
                  dataKey="unmatchedSupplyShare"
                  activeDot={{ r: 6, fill: '#ffffff' }}
                  dot={{ r: 4, fill: '#0f172a', stroke: '#ffffff', strokeWidth: 2 }}
                  name="Unmatched Supply"
                  stroke="#cbd5e1"
                  strokeWidth={2}
                  type="monotone"
                />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-400">
            Stacked bars show each month as a share of total allocation so small excess and gap values remain visible; the tooltip keeps exact kWh values.
          </p>
        </div>
      </section>
    </div>
  );
}
