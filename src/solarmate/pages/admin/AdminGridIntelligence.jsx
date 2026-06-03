import { useEffect, useMemo, useState } from 'react';
import { CloudRain, CloudSun, RefreshCw, ShieldAlert, TriangleAlert, Sun, Cloud, Droplets } from 'lucide-react';
import { getAdminGridIntelligence } from '../../api/client';
import CompactGroupedBarChart from '../../components/CompactGroupedBarChart';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';

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

function riskChartColor(risk) {
  if (risk === 'Low') return 'green';
  if (risk === 'Surplus Risk') return 'teal';
  return 'gold';
}

function riskTheme(risk) {
  if (risk === 'Low') {
    return {
      panel: 'from-emerald-500/18 via-slate-900/80 to-teal-950/45 border-emerald-400/25 shadow-[0_0_42px_rgba(16,185,129,0.10)]',
      icon: 'text-emerald-300',
      value: 'text-emerald-200',
      divider: 'border-emerald-300/15'
    };
  }
  if (risk === 'Surplus Risk') {
    return {
      panel: 'from-cyan-500/18 via-slate-900/80 to-teal-950/45 border-cyan-400/25 shadow-[0_0_42px_rgba(34,211,238,0.10)]',
      icon: 'text-cyan-300',
      value: 'text-cyan-100',
      divider: 'border-cyan-300/15'
    };
  }
  return {
    panel: 'from-rose-500/20 via-slate-900/82 to-amber-950/35 border-rose-400/30 shadow-[0_0_48px_rgba(251,113,133,0.12)]',
    icon: 'text-rose-300',
    value: 'text-rose-100',
    divider: 'border-rose-300/15'
  };
}

export default function AdminGridIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadGridIntelligence() {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminGridIntelligence();
      setData(result);
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

  return (
    <div className="page-stack">
      <DashboardCard
        action={<StatusBadge tone={data.source === 'fallback' ? 'warning' : 'success'}>
          {data.source === 'fallback' ? 'Fallback weather' : 'Open-Meteo live'}
        </StatusBadge>}
        eyebrow="Grid Intelligence"
        title="Weather-based solar forecasting and TNB fallback advisory"
      >
        <p className="microcopy">
          SolarMate Grid Intelligence forecasts distributed prosumer solar generation using weather data and platform
          energy data, then provides advisory recommendations for grid balancing. It is utility-side decision support,
          not direct TNB grid control.
        </p>
        {error && <div className="auth-error">Unable to refresh advisory: {error}</div>}
        <div className="flex flex-col gap-6 mt-4">
          {/* TIER 1: THE HERO STATUS PANEL */}
          <div className={`relative overflow-hidden flex flex-col md:flex-row items-start md:items-center p-6 rounded-2xl w-full border bg-gradient-to-br ${activeRiskTheme.panel}`}>
            <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-white/5 blur-3xl" />
            <div className={`relative flex flex-col pr-6 md:border-r shrink-0 ${activeRiskTheme.divider}`}>
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-1">Grid Risk Level</span>
              <div className="flex items-center gap-2">
                <TriangleAlert className={activeRiskTheme.icon} size={28} />
                <strong className={`text-3xl font-bold ${activeRiskTheme.value}`}>
                  {summary.risk_level}
                </strong>
              </div>
            </div>
            <div className="relative flex flex-col mt-4 md:mt-0 md:pl-6 flex-1">
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-2">
                <ShieldAlert size={16} /> Recommendation
              </span>
              <p className="text-slate-200 text-lg">{summary.recommendation}</p>
            </div>
          </div>

          {/* TIER 2: PRIMARY ENERGY METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative overflow-hidden flex flex-col p-6 rounded-2xl bg-gradient-to-br from-amber-300/16 via-slate-900/60 to-slate-950 border border-amber-300/20 shadow-[0_0_38px_rgba(251,191,36,0.08)]">
              <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-amber-300/10 blur-3xl" />
              <span className="relative text-amber-100 text-sm font-semibold uppercase tracking-wider flex items-center gap-2 mb-2">
                <CloudSun size={16} /> Forecasted Solar Supply
              </span>
              <strong className="relative text-4xl font-bold text-white mb-1">{moneylessKwh(summary.forecasted_solar_supply_kwh)}</strong>
              <small className="relative text-amber-100/60">Base: {moneylessKwh(summary.base_prosumer_supply_kwh)}</small>
            </div>
            <div className="relative overflow-hidden flex flex-col p-6 rounded-2xl bg-gradient-to-br from-sky-400/16 via-slate-900/60 to-slate-950 border border-sky-300/20 shadow-[0_0_38px_rgba(56,189,248,0.08)]">
              <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-sky-300/10 blur-3xl" />
              <span className="relative text-sky-100 text-sm font-semibold uppercase tracking-wider mb-2">
                Required TNB Fallback
              </span>
              <strong className="relative text-4xl font-bold text-white mb-1">{moneylessKwh(summary.recommended_tnb_fallback_kwh)}</strong>
              <small className="relative text-sky-100/60">Advisory fallback supply</small>
            </div>
          </div>

          {/* TIER 3: ENVIRONMENTAL TELEMETRY */}
          <div className="flex flex-col p-4 rounded-2xl bg-gradient-to-r from-slate-900/50 via-cyan-950/18 to-slate-900/50 border border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-200 mb-3 px-2">Environmental Factors</span>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex flex-col items-center justify-center text-center px-2">
                <CloudRain className="text-sky-300 mb-1" size={20} />
                <strong className="text-sky-100 text-sm">{wholePercent(currentHour.rain_probability)}</strong>
                <span className="text-slate-500 text-xs">Rain Prob</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center px-2 border-white/5 md:border-l">
                <Sun className="text-amber-300 mb-1" size={20} />
                <strong className="text-amber-100 text-sm">{percent(currentHour.solar_factor * 100)}</strong>
                <span className="text-slate-500 text-xs">Solar Potential</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center px-2 border-white/5 md:border-l">
                <Sun className="text-yellow-300 mb-1" size={20} />
                <strong className="text-yellow-100 text-sm">{currentHour.shortwave_radiation.toLocaleString()} W/m²</strong>
                <span className="text-slate-500 text-xs">Shortwave Rad</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center px-2 border-white/5 md:border-l">
                <Cloud className="text-cyan-300 mb-1" size={20} />
                <strong className="text-cyan-100 text-sm">{wholePercent(currentHour.cloud_cover)}</strong>
                <span className="text-slate-500 text-xs">Cloud Cover</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center px-2 border-white/5 md:border-l">
                <Droplets className="text-blue-300 mb-1" size={20} />
                <strong className="text-blue-100 text-sm">{currentHour.rain_mm.toFixed(2)} mm</strong>
                <span className="text-slate-500 text-xs">Rain Amount</span>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-slate-500 text-right mt-2">
            Location: {data.location} · Last updated {malaysiaDateTime(data.generated_at)} · Malaysia time / UTC+8
          </div>
        </div>
        <div className="action-row" style={{ marginTop: 16 }}>
          <button className="secondary-button" onClick={loadGridIntelligence} type="button">
            <RefreshCw size={16} /> Refresh Advisory
          </button>
          <span className="microcopy">Auto-refreshes every 5 minutes in Malaysia time.</span>
        </div>
      </DashboardCard>

      <DashboardCard eyebrow="Hourly forecast" title="Hourly Grid Balancing Forecast">
        <CompactGroupedBarChart
          data={chartData}
          emptyMessage="No hourly forecast rows are available."
          height={320}
          series={[
            { key: 'solarSupply', label: 'Forecasted Solar Supply', color: 'teal' },
            { key: 'consumerDemand', label: 'Consumer Demand', color: 'mutedBlue' },
            { key: 'tnbFallback', label: 'Required TNB Fallback', color: 'gold' }
          ]}
          tooltipExtra={(item) => [
            { label: 'Cloud cover', value: percent(item.cloudCover), color: 'blueGrey' },
            { label: 'Rain probability', value: percent(item.rainProbability), color: 'gold' },
            { label: 'Solar potential', value: percent(item.solarFactor * 100), color: 'green' },
            { label: 'Risk level', value: item.riskLevel, color: riskChartColor(item.riskLevel) }
          ]}
          tooltipTitle={(item) => item.fullTime}
          valueSuffix=" kWh"
          xKey="time"
        />
        <p className="microcopy">
          The advisory uses Open-Meteo hourly cloud, rain, and solar radiation data to estimate prosumer solar supply
          changes and the TNB fallback requirement.
        </p>
      </DashboardCard>
    </div>
  );
}
