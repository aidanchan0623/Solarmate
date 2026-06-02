import { useEffect, useMemo, useState } from 'react';
import { CloudRain, CloudSun, RefreshCw, ShieldAlert, Zap } from 'lucide-react';
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

function riskTone(risk) {
  if (risk === 'Low') return 'success';
  if (risk === 'Surplus Risk') return 'neutral';
  return 'warning';
}

function riskChartColor(risk) {
  if (risk === 'Low') return 'green';
  if (risk === 'Surplus Risk') return 'teal';
  return 'gold';
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
        <div className="summary-metrics compact important-metrics">
          <div>
            <span>Weather Condition</span>
            <strong>{currentHour.weather_condition}</strong>
            <small>{data.location}</small>
          </div>
          <div>
            <span>Solar Factor</span>
            <strong>{percent(currentHour.solar_factor * 100)}</strong>
            <small>Weather-adjusted solar strength</small>
          </div>
          <div className="metric-emphasis">
            <span>Forecasted Solar Supply</span>
            <strong>{moneylessKwh(summary.forecasted_solar_supply_kwh)}</strong>
            <small>Base: {moneylessKwh(summary.base_prosumer_supply_kwh)}</small>
          </div>
          <div>
            <span>Consumer Green Demand</span>
            <strong>{moneylessKwh(summary.forecasted_consumer_demand_kwh)}</strong>
            <small>Active package demand</small>
          </div>
          <div className="metric-emphasis">
            <span>Required TNB Fallback</span>
            <strong>{moneylessKwh(summary.recommended_tnb_fallback_kwh)}</strong>
            <small>Advisory fallback supply</small>
          </div>
          <div>
            <span>Grid Risk Level</span>
            <strong>{summary.risk_level}</strong>
            <small>Updated {malaysiaDateTime(data.generated_at)}</small>
          </div>
        </div>
        <div className="action-row" style={{ marginTop: 16 }}>
          <button className="secondary-button" onClick={loadGridIntelligence} type="button">
            <RefreshCw size={16} /> Refresh Advisory
          </button>
          <span className="microcopy">Auto-refreshes every 5 minutes in Malaysia time.</span>
        </div>
      </DashboardCard>

      <DashboardCard
        action={<StatusBadge tone={riskTone(summary.risk_level)}>{summary.risk_level}</StatusBadge>}
        eyebrow="Recommended action"
        title="Grid balancing advisory"
      >
        <div className="summary-layout">
          <div className="summary-main">
            <div className="formula-panel">
              <strong><ShieldAlert size={18} /> Recommended action</strong>
              <p>{summary.recommendation}</p>
            </div>
            <div className="summary-metrics compact">
              <div>
                <span>Matched Energy</span>
                <strong>{moneylessKwh(summary.matched_energy_kwh)}</strong>
              </div>
              <div>
                <span>Solar Shortfall</span>
                <strong>{moneylessKwh(summary.expected_shortfall_kwh)}</strong>
              </div>
              <div>
                <span>Solar Surplus</span>
                <strong>{moneylessKwh(summary.expected_surplus_kwh)}</strong>
              </div>
            </div>
          </div>
          <div className="summary-side">
            <div>
              <span><CloudSun size={16} /> Shortwave radiation</span>
              <strong>{currentHour.shortwave_radiation.toLocaleString()} W/m2</strong>
            </div>
            <div>
              <span><CloudRain size={16} /> Rain probability</span>
              <strong>{percent(currentHour.rain_probability)}</strong>
            </div>
            <div>
              <span>Cloud cover</span>
              <strong>{percent(currentHour.cloud_cover)}</strong>
            </div>
            <div>
              <span>Rain amount</span>
              <strong>{currentHour.rain_mm.toFixed(2)} mm</strong>
            </div>
          </div>
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
            { label: 'Solar factor', value: percent(item.solarFactor * 100), color: 'green' },
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
