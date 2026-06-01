import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

function money(value) {
  return `RM${Number(value || 0).toFixed(2)}`;
}

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="chart-tooltip recharts-tooltip-card">
      <strong>{label}</strong>
      <div className="chart-tooltip-body">
        <span className="is-active"><i style={{ background: '#27a1ad' }} /><span>Demo export</span><b>{row.scaled_energy_kwh} kWh</b></span>
        <span><i style={{ background: '#f2c94c' }} /><span>Power</span><b>{row.power_w} W</b></span>
        <span><i style={{ background: '#6e93ad' }} /><span>Voltage</span><b>{row.voltage_v} V</b></span>
        <span><i style={{ background: '#8da0a8' }} /><span>Current</span><b>{row.current_a} A</b></span>
        <span><i style={{ background: '#1c9a65' }} /><span>Real energy</span><b>{row.energy_wh} Wh</b></span>
        <span><i style={{ background: '#f2c94c' }} /><span>Estimated earning</span><b>{money(row.estimated_earning)}</b></span>
      </div>
    </div>
  );
}

export default function EspLiveAreaChart({ data }) {
  return (
    <div className="chart-panel recharts-panel">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 18, right: 20, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="espExportGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#27a1ad" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#27a1ad" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#dcebed" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#597078', fontSize: 12 }} tickLine={false} minTickGap={22} />
          <YAxis tick={{ fill: '#597078', fontSize: 12 }} tickLine={false} width={48} />
          <Tooltip content={<TooltipContent />} />
          <Legend />
          <Area
            dataKey="scaled_energy_kwh"
            fill="url(#espExportGradient)"
            name="Demo export kWh"
            stroke="#27a1ad"
            strokeWidth={3}
            type="monotone"
          />
          <Line
            dataKey="power_w"
            dot={false}
            name="Power W"
            stroke="#f2c94c"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
