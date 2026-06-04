import { useEffect, useMemo, useState } from 'react';
import { CloudRain, CloudSun, RefreshCw, ShieldAlert, TriangleAlert, Sun, Cloud, Droplets, Zap, ArrowRight, Activity, Info } from 'lucide-react';
import { getAdminGridIntelligence } from '../../api/client';
import GridIntelligenceAreaChart from '../../components/GridIntelligenceAreaChart';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import { generateScenario } from '../../utils/gridScenarios';

function moneylessKwh(value) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;
}

function percent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function wholePercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function malaysiaDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function hourLabel(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: 'numeric',
    hour12: true
  }).format(new Date(value));
}

function riskTheme(risk) {
  if (risk === 'Low') {
    return {
      panel: 'from-emerald-500/18 via-slate-900/80 to-teal-950/45 border-emerald-400/25 shadow-[0_0_42px_rgba(16,185,129,0.10)]',
      icon: 'text-emerald-300',
      value: 'text-emerald-200',
      divider: 'border-emerald-300/15',
      color: '#10b981'
    };
  }
  if (risk === 'Medium') {
    return {
      panel: 'from-amber-400/18 via-slate-900/80 to-amber-950/35 border-amber-300/25 shadow-[0_0_42px_rgba(251,191,36,0.10)]',
      icon: 'text-amber-300',
      value: 'text-amber-100',
      divider: 'border-amber-300/15',
      color: '#f59e0b'
    };
  }
  return {
    panel: 'from-rose-500/20 via-slate-900/82 to-amber-950/35 border-rose-400/30 shadow-[0_0_48px_rgba(251,113,133,0.12)]',
    icon: 'text-rose-300',
    value: 'text-rose-100',
    divider: 'border-rose-300/15',
    color: '#f43f5e'
  };
}

function ScenarioDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const options = [
    { id: 'live', label: 'Live Data' },
    { id: 'sunny', label: 'Sim: Sunny Day' },
    { id: 'rainy', label: 'Sim: Rainy Day' },
    { id: 'variable', label: 'Sim: Variable Weather' }
  ];
  
  const current = options.find(o => o.id === value);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-semibold rounded-md px-3 py-1.5 outline-none transition-colors w-44"
        type="button"
      >
        {current?.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-44 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                type="button"
                className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${value === opt.id ? 'bg-teal-500/20 text-teal-300' : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GaugeRing({ value, max = 100, color, size = 64, strokeWidth = 6, children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(value, max) / max) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full drop-shadow-md">
        <circle
          className="text-slate-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`animate-gauge transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function AdminGridIntelligence() {
  const [liveData, setLiveData] = useState(null);
  const [scenario, setScenario] = useState('live');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadGridIntelligence() {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminGridIntelligence();
      setLiveData(result);
    } catch (err) {
      setError(err.message || 'Unable to load Grid Intelligence advisory.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGridIntelligence();
    const interval = window.setInterval(loadGridIntelligence, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const data = useMemo(() => {
    return generateScenario(liveData, scenario);
  }, [liveData, scenario]);

  const chartData = useMemo(() => (
    (data?.hourly_forecast || []).slice(0, 12).map((row) => ({
      time: hourLabel(row.time),
      fullTime: malaysiaDateTime(row.time),
      solarSupply: row.forecasted_solar_supply_kwh,
      consumerDemand: row.forecasted_consumer_demand_kwh,
      tnbFallback: row.recommended_tnb_fallback_kwh,
      rainProbability: row.rain_probability,
      cloudCover: row.cloud_cover,
      solarFactor: row.solar_factor,
      solarCoverage: row.solar_coverage_percent,
      fallbackPercent: row.fallback_percent,
      riskLevel: row.risk_level
    }))
  ), [data]);

  if (!data) {
    return (
      <DashboardCard eyebrow="Grid Intelligence" title="Weather-based solar advisory">
        <div className="auth-error">
          {loading
            ? 'Loading weather-based grid balancing advisory...'
            : error || 'Unable to load Grid Intelligence advisory.'}
          {!loading && (
            <div className="action-row" style={{ marginTop: 12 }}>
              <button className="primary-button" onClick={loadGridIntelligence} type="button">
                <RefreshCw size={16} /> Retry Forecast
              </button>
            </div>
          )}
        </div>
      </DashboardCard>
    );
  }

  const { current_hour: currentHour, summary } = data;
  const activeRiskTheme = riskTheme(summary.risk_level);
  
  // Calculate flow percentages
  const supplyMax = Math.max(summary.base_prosumer_supply_kwh, summary.forecasted_consumer_demand_kwh, 1);
  const matchedWidth = Math.max(5, (summary.matched_energy_kwh / supplyMax) * 100);
  const shortfallWidth = Math.max(5, (summary.expected_shortfall_kwh / summary.forecasted_consumer_demand_kwh) * 100);
  const surplusWidth = Math.max(5, (summary.expected_surplus_kwh / summary.forecasted_solar_supply_kwh) * 100);

  return (
    <div className="page-stack">
      <DashboardCard
        action={
          <div className="flex items-center gap-3">
            <ScenarioDropdown value={scenario} onChange={setScenario} />
            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-800 px-2 py-1.5 rounded-md">
              <Activity size={14} className="text-teal-400 pulse-slow" />
              Live Sync
            </span>
            <StatusBadge tone={data.source === 'fallback' ? 'warning' : 'success'}>
              {data.source === 'fallback' ? 'Fallback weather' : 'Open-Meteo API'}
            </StatusBadge>
          </div>
        }
        eyebrow="Grid Intelligence"
        title="Weather-based solar forecasting and TNB fallback advisory"
      >
        <p className="microcopy stagger-1">
          SolarMate Grid Intelligence forecasts distributed prosumer solar generation using weather data and platform
          energy data, then provides advisory recommendations for grid balancing. It is utility-side decision support,
          not direct TNB grid control.
        </p>
        
        {error && <div className="auth-error">Unable to refresh advisory: {error}</div>}
        
        <div className="flex flex-col gap-6 mt-6">
          {/* TIER 1: THE HERO STATUS PANEL with GAUGE */}
          <div className={`stagger-2 relative overflow-hidden flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl w-full border bg-gradient-to-br ${activeRiskTheme.panel}`}>
            <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-white/5 blur-3xl pulse-slow" />
            
            <div className={`relative flex items-center gap-6 pr-6 md:border-r ${activeRiskTheme.divider}`}>
              <GaugeRing 
                value={summary.solar_coverage_percent} 
                max={100} 
                color={activeRiskTheme.color} 
                size={110} 
                strokeWidth={8}
              >
                <div className="flex flex-col items-center">
                  <span className={`text-2xl font-bold leading-none ${activeRiskTheme.value}`}>{percent(summary.solar_coverage_percent)}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400/80 mt-1 font-semibold">Coverage</span>
                </div>
              </GaugeRing>
              
              <div className="flex flex-col shrink-0">
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-1">Grid Risk</span>
                <div className="flex items-center gap-2">
                  <TriangleAlert className={activeRiskTheme.icon} size={28} />
                  <strong className={`text-3xl font-bold ${activeRiskTheme.value}`}>
                    {summary.risk_level}
                  </strong>
                </div>
              </div>
            </div>
            
            <div className="relative flex flex-col flex-1">
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-2">
                <ShieldAlert size={16} /> Recommendation
              </span>
              <p className="text-slate-200 text-lg leading-snug">{summary.recommendation}</p>
            </div>
          </div>

          {/* TIER 2: ENERGY FLOW WATERFALL (NEW) */}
          <div className="stagger-3 relative overflow-hidden flex flex-col p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-700/50 shadow-lg">
            <span className="relative text-slate-300 text-sm font-semibold uppercase tracking-wider flex items-center gap-2 mb-6">
              <Zap size={16} className="text-teal-400" /> Live Energy Flow & Balance
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-slate-500">Base Prosumer Capacity</span>
                <strong className="text-2xl text-slate-200">{moneylessKwh(summary.base_prosumer_supply_kwh)}</strong>
              </div>
              
              {/* Flow Path */}
              <div className="hidden md:flex items-center justify-center relative">
                <div className="absolute w-full h-[2px] bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-4 h-full bg-teal-400/80 blur-[2px] rounded-full animate-particle shadow-[0_0_8px_#2dd4bf]"></div>
                  <div className="w-4 h-full bg-teal-400/80 blur-[2px] rounded-full animate-particle particle-delay-1 shadow-[0_0_8px_#2dd4bf]"></div>
                </div>
                <div className="z-10 bg-slate-900 px-3 py-1 border border-slate-700 rounded-full flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Sun size={12} className="text-amber-400" /> x {currentHour.solar_factor.toFixed(2)} factor
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex flex-col gap-2 md:items-end">
                <span className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1.5">
                  <CloudSun size={14} className="text-amber-300"/> Forecasted Supply
                </span>
                <strong className="text-3xl text-amber-300 font-bold">{moneylessKwh(summary.forecasted_solar_supply_kwh)}</strong>
              </div>
            </div>
            
            {/* Breakdown Bar */}
            <div className="mt-8 flex flex-col gap-3">
              <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                <span>Energy Breakdown vs Demand ({moneylessKwh(summary.forecasted_consumer_demand_kwh)})</span>
              </div>
              
              {/* The actual stacked bar */}
              <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-800/50 shadow-inner">
                <div 
                  className="bg-emerald-500 h-full relative group transition-all duration-1000 ease-out" 
                  style={{ width: `${matchedWidth}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div 
                  className="bg-sky-500 h-full relative group transition-all duration-1000 ease-out border-l border-slate-900" 
                  style={{ width: `${shortfallWidth}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                {summary.expected_surplus_kwh > 0 && (
                  <div 
                    className="bg-amber-400 h-full relative group transition-all duration-1000 ease-out border-l border-slate-900" 
                    style={{ width: `${surplusWidth}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                )}
              </div>
              
              {/* Legend for breakdown */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mt-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                  <span className="text-slate-300">Matched: <strong className="text-white">{moneylessKwh(summary.matched_energy_kwh)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]" />
                  <span className="text-slate-300">TNB Fallback: <strong className="text-white">{moneylessKwh(summary.expected_shortfall_kwh)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                  <span className="text-slate-300">Surplus: <strong className="text-white">{moneylessKwh(summary.expected_surplus_kwh)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* TIER 3: ENVIRONMENTAL TELEMETRY WITH GAUGES */}
          <div className="stagger-4 flex flex-col p-5 rounded-2xl bg-gradient-to-r from-slate-900/80 via-cyan-950/25 to-slate-900/80 border border-slate-700/50 shadow-lg">
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                <Cloud size={14} /> Environmental Telemetry
              </span>
              {currentHour.weather_condition && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {currentHour.weather_condition}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="flex flex-col items-center justify-center text-center">
                <GaugeRing value={currentHour.rain_probability} max={100} color="#38bdf8" size={56} strokeWidth={4}>
                  <CloudRain className="text-sky-300" size={16} />
                </GaugeRing>
                <strong className="text-sky-100 text-sm mt-3">{wholePercent(currentHour.rain_probability)}</strong>
                <span className="text-slate-500 text-[11px] uppercase font-semibold mt-1">Rain Prob</span>
              </div>
              
              <div className="flex flex-col items-center justify-center text-center">
                <GaugeRing value={currentHour.solar_factor * 100} max={100} color="#fbbf24" size={56} strokeWidth={4}>
                  <Sun className="text-amber-300" size={16} />
                </GaugeRing>
                <strong className="text-amber-100 text-sm mt-3">{percent(currentHour.solar_factor * 100)}</strong>
                <span className="text-slate-500 text-[11px] uppercase font-semibold mt-1">Solar Potential</span>
              </div>
              
              <div className="flex flex-col items-center justify-center text-center">
                <GaugeRing value={Math.min(currentHour.shortwave_radiation, 1000)} max={1000} color="#fde047" size={56} strokeWidth={4}>
                  <Sun className="text-yellow-300" size={16} />
                </GaugeRing>
                <strong className="text-yellow-100 text-sm mt-3">{currentHour.shortwave_radiation.toLocaleString()} W/m²</strong>
                <span className="text-slate-500 text-[11px] uppercase font-semibold mt-1">Shortwave Rad</span>
              </div>
              
              <div className="flex flex-col items-center justify-center text-center">
                <GaugeRing value={currentHour.cloud_cover} max={100} color="#67e8f9" size={56} strokeWidth={4}>
                  <Cloud className="text-cyan-300" size={16} />
                </GaugeRing>
                <strong className="text-cyan-100 text-sm mt-3">{wholePercent(currentHour.cloud_cover)}</strong>
                <span className="text-slate-500 text-[11px] uppercase font-semibold mt-1">Cloud Cover</span>
              </div>
              
              <div className="flex flex-col items-center justify-center text-center">
                <GaugeRing value={currentHour.rain_mm} max={10} color="#93c5fd" size={56} strokeWidth={4}>
                  <Droplets className="text-blue-300" size={16} />
                </GaugeRing>
                <strong className="text-blue-100 text-sm mt-3">{currentHour.rain_mm.toFixed(2)} mm</strong>
                <span className="text-slate-500 text-[11px] uppercase font-semibold mt-1">Rain Amount</span>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-slate-500 text-right flex justify-end gap-3 mt-1 items-center">
            <span>Location: {data.location}</span>
            <span>·</span>
            <span>Last updated {malaysiaDateTime(data.generated_at)}</span>
          </div>
        </div>
        
        <div className="action-row mt-6 border-t border-slate-200/50 pt-5">
          <button className="secondary-button hover:bg-slate-50 transition-colors" onClick={loadGridIntelligence} type="button">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> 
            {loading ? 'Refreshing...' : 'Refresh Advisory'}
          </button>
          <span className="microcopy flex items-center gap-1">
            <Info size={14}/> Auto-refreshes every 5 mins
          </span>
        </div>
      </DashboardCard>

      <DashboardCard eyebrow="Hourly forecast" title="Hourly Grid Balancing Forecast">
        <GridIntelligenceAreaChart data={chartData} height={380} />
        <p className="microcopy mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <strong>How this works:</strong> The advisory uses Open-Meteo hourly cloud, rain, and solar radiation data to estimate prosumer solar supply changes and the TNB fallback requirement. Risk is benchmarked by green energy fulfilment: Low at 75%+ solar coverage, Medium at 50-74.9%, and High below 50%.
        </p>
      </DashboardCard>
    </div>
  );
}
