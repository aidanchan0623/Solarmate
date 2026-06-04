import { useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

function formatValue(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function riskColor(risk) {
  if (risk === 'Low') return '#10b981';
  if (risk === 'Medium') return '#f59e0b';
  return '#f43f5e';
}

function riskBg(risk) {
  if (risk === 'Low') return 'rgba(16,185,129,0.15)';
  if (risk === 'Medium') return 'rgba(245,158,11,0.15)';
  return 'rgba(244,63,94,0.15)';
}

function CustomTooltip({ active, payload, label, extraData }) {
  if (active && payload && payload.length) {
    const item = extraData.find(d => d.time === label) || {};

    return (
      <div className="bg-slate-950/98 border border-slate-700/80 p-5 rounded-2xl shadow-2xl min-w-[320px] backdrop-blur-xl">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-800">
          <strong className="text-slate-100 text-sm">{item.fullTime || label}</strong>
          <span
            className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full"
            style={{ color: riskColor(item.riskLevel), backgroundColor: riskBg(item.riskLevel) }}
          >
            {item.riskLevel} Risk
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Energy Metrics</div>
          {payload
            .filter(e => e.dataKey !== 'solarFactorPercent')
            .map((entry, index) => (
              <div key={`item-${index}`} className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 text-slate-300">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <span className="text-white font-mono font-medium text-xs">{formatValue(entry.value)} kWh</span>
              </div>
            ))}

          <div className="my-0.5 border-t border-slate-800/60" />

          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Weather Analysis</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Solar Factor</span>
              <span className="text-amber-300 font-mono font-medium">{(item.solarFactor * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cloud Cover</span>
              <span className="text-cyan-300 font-mono font-medium">{item.cloudCover}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Rain Prob</span>
              <span className="text-sky-300 font-mono font-medium">{item.rainProbability}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Coverage</span>
              <span className="text-emerald-400 font-mono font-medium">{item.solarCoverage}%</span>
            </div>
          </div>

          <div className="my-0.5 border-t border-slate-800/60" />

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">TNB Fallback Share</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${Math.min(item.fallbackPercent, 100)}%` }}
                />
              </div>
              <span className="text-amber-200 font-mono font-medium">{item.fallbackPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function CustomLegend({ payload }) {
  return (
    <div className="flex justify-center gap-5 mt-2 flex-wrap">
      {payload?.map((entry, index) => (
        <span key={`legend-${index}`} className="flex items-center gap-1.5 text-xs text-slate-400">
          <span
            className="w-3 h-[3px] rounded-full inline-block"
            style={{ backgroundColor: entry.color }}
          />
          {entry.value}
        </span>
      ))}
    </div>
  );
}

export default function GridIntelligenceAreaChart({ data, height = 400 }) {
  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map(d => ({
      ...d,
      solarFactorPercent: d.solarFactor * 100
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        No hourly forecast rows are available.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col relative" style={{ height: height + 42 }}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 25, right: 50, left: -10, bottom: 10 }}
        >
          <defs>
            <linearGradient id="gradSolar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradDemand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="gradFallback" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="energy"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v.toLocaleString()}
            label={{ value: 'kWh', position: 'top', offset: 10, fill: '#64748b', fontSize: 10 }}
          />
          <YAxis
            yAxisId="factor"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: '#f59e0b', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            label={{ value: 'Solar Factor', position: 'top', offset: 10, fill: '#f59e0b', fontSize: 10 }}
          />
          <Tooltip
            content={<CustomTooltip extraData={chartData} />}
            cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Legend content={<CustomLegend />} />

          <Area
            yAxisId="energy"
            type="monotone"
            dataKey="consumerDemand"
            name="Consumer Demand"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#gradDemand)"
          />
          <Area
            yAxisId="energy"
            type="monotone"
            dataKey="solarSupply"
            name="Forecasted Solar"
            stroke="#10b981"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#gradSolar)"
          />
          <Area
            yAxisId="energy"
            type="monotone"
            dataKey="tnbFallback"
            name="TNB Fallback"
            stroke="#f59e0b"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#gradFallback)"
          />
          <Line
            yAxisId="factor"
            type="monotone"
            dataKey="solarFactorPercent"
            name="Solar Factor %"
            stroke="#fbbf24"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 3, fill: '#fbbf24', stroke: '#0f172a', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: '#fde047', stroke: '#0f172a', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Risk Heatmap Strip */}
      <div className="mx-[40px] mr-[50px] mt-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Hourly Risk Level</span>
        </div>
        <div className="h-3 flex gap-[2px] rounded-md overflow-hidden">
          {chartData.map((item, i) => (
            <div
              key={i}
              className="flex-1 h-full relative group cursor-pointer transition-all hover:scale-y-150"
              style={{ backgroundColor: riskColor(item.riskLevel) }}
              title={`${item.time}: ${item.riskLevel} Risk`}
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors" />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-0.5">
          {chartData.map((item, i) => (
            <span key={i} className="text-[9px] text-slate-600 flex-1 text-center">{item.time}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
