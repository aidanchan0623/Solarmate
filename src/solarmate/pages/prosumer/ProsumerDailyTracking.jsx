import { useEffect, useState } from 'react';
import { getProsumerDailyExport, getProsumerEspLive, getTodayMeterReadings } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import CompactGroupedBarChart from '../../components/CompactGroupedBarChart';
import StatusBadge from '../../components/StatusBadge';
import { PROSUMER_BUYBACK_RATE, calculateProsumerEarnings } from '../../utils/calculations';

function formatDateLabel(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function statusTone(status) {
  if (status === 'Online') return 'success';
  if (status === 'No Data') return 'warning';
  return 'neutral';
}

export default function ProsumerDailyTracking({ prosumer, user }) {
  const [records, setRecords] = useState([]);
  const [meterReadings, setMeterReadings] = useState([]);
  const [espLive, setEspLive] = useState(null);
  const [error, setError] = useState('');
  const [espError, setEspError] = useState('');
  const hasEspDevice = Boolean(prosumer.deviceId) || user?.username === 'prosumeresp';
  const deviceId = prosumer.deviceId || 'ESP32_SOLARMATE_001';

  useEffect(() => {
    if (hasEspDevice) return undefined;
    let cancelled = false;
    async function loadRecords() {
      try {
        const data = await getProsumerDailyExport({ limit: 7 });
        if (!cancelled) setRecords(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    loadRecords();
    return () => {
      cancelled = true;
    };
  }, [hasEspDevice]);

  useEffect(() => {
    if (!hasEspDevice) return undefined;
    let cancelled = false;

    async function loadEspLive() {
      try {
        const data = await getProsumerEspLive();
        if (!cancelled) {
          setEspLive(data);
          setEspError('');
        }
      } catch (err) {
        if (!cancelled) setEspError(err.message);
      }
    }

    async function loadMeterReadings() {
      try {
        const data = await getTodayMeterReadings(deviceId);
        if (!cancelled) {
          setMeterReadings(data);
          setEspError('');
        }
      } catch (err) {
        if (!cancelled) setEspError(err.message);
      }
    }

    loadEspLive();
    loadMeterReadings();
    const liveInterval = window.setInterval(loadEspLive, 3000);
    const chartInterval = window.setInterval(loadMeterReadings, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(liveInterval);
      window.clearInterval(chartInterval);
    };
  }, [deviceId, hasEspDevice]);

  if (hasEspDevice) {
    const espChartData = meterReadings.map((row) => ({
      time: row.time,
      powerW: row.power_w,
      scaledEnergyKwh: row.scaled_energy_kwh
    }));

    return (
      <div className="page-stack">
        <DashboardCard
          action={<StatusBadge tone={statusTone(espLive?.device_status)}>{espLive?.device_status || 'Loading'}</StatusBadge>}
          eyebrow="ESP32 live meter"
          title="Today's live export"
        >
          <p className="microcopy">
            Live ESP32 readings update every few seconds. Prototype hardware readings are scaled for dashboard demonstration.
          </p>
          {espError && <div className="auth-error">Unable to load ESP32 readings: {espError}</div>}
          <div className="summary-metrics compact">
            <div>
              <span>Voltage</span>
              <strong>{(espLive?.voltage_v ?? 0).toLocaleString()} V</strong>
            </div>
            <div>
              <span>Current</span>
              <strong>{(espLive?.current_a ?? 0).toLocaleString()} A</strong>
            </div>
            <div>
              <span>Live Power</span>
              <strong>{(espLive?.power_w ?? 0).toLocaleString()} W</strong>
            </div>
            <div>
              <span>Real Energy Today</span>
              <strong>{(espLive?.energy_wh ?? 0).toLocaleString()} Wh</strong>
            </div>
            <div>
              <span>Demo-Scaled Export</span>
              <strong>{(espLive?.scaled_energy_kwh ?? 0).toLocaleString()} kWh</strong>
            </div>
            <div>
              <span>Estimated Earning Today</span>
              <strong>RM{(espLive?.estimated_earnings_today ?? 0).toFixed(2)}</strong>
            </div>
          </div>
          <p className="microcopy">
            Last update: {espLive?.last_update ? new Date(espLive.last_update).toLocaleString() : 'No reading received yet'}.
          </p>
        </DashboardCard>

        <DashboardCard eyebrow="ESP32 readings" title="Today's Live Prototype Chart">
          {espChartData.length > 0 ? (
            <CompactGroupedBarChart
              className="rounded-2xl border border-amber-100/40 bg-gradient-to-br from-amber-50/60 via-emerald-50/30 to-teal-50/40 p-4 backdrop-blur-sm mt-4"
              data={espChartData}
              series={[
                { key: 'scaledEnergyKwh', label: 'Demo export kWh', color: 'teal' },
                { key: 'powerW', label: 'Power W', color: 'gold' }
              ]}
              tooltipItems={(item) => {
                const reading = meterReadings.find((row) => row.time === item.time);
                return [
                  { label: 'Voltage', value: `${reading?.voltage_v ?? 0} V`, color: 'mutedBlue' },
                  { label: 'Current', value: `${reading?.current_a ?? 0} A`, color: 'blueGrey' },
                  { label: 'Power', value: `${reading?.power_w ?? 0} W`, color: 'gold' },
                  { label: 'Real energy', value: `${reading?.energy_wh ?? 0} Wh`, color: 'green' },
                  { label: 'Demo export', value: `${reading?.scaled_energy_kwh ?? 0} kWh`, color: 'teal', active: true }
                ];
              }}
              xKey="time"
            />
          ) : (
            <div className="auth-error">No ESP32 readings received today. Post a reading to /api/meter/reading to begin the live chart.</div>
          )}
          <p className="microcopy">Demo-scaled export uses ESP energy Wh x 2.0 for presentation-friendly kWh.</p>
        </DashboardCard>
      </div>
    );
  }

  const latest = records[records.length - 1];
  const chartData = records.map((row) => ({
    date: formatDateLabel(row.date),
    generatedKwh: row.generated_kwh,
    localConsumptionKwh: row.local_consumption_kwh,
    exportedKwh: row.exported_kwh
  }));

  return (
    <div className="page-stack">
      <DashboardCard eyebrow="Today" title="Daily export performance">
        {error && <div className="auth-error">Unable to load daily export records: {error}</div>}
        <p className="microcopy">
          Daily records come from the same backend dataset used to calculate monthly export history.
          Current plan: {prosumer.selectedPlan}, {prosumer.monthlyExportCommitment.toLocaleString()} kWh/month.
        </p>
        <div className="summary-metrics">
          <div>
            <span>Generated energy</span>
            <strong>{(latest?.generated_kwh ?? 0).toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Local consumption</span>
            <strong>{(latest?.local_consumption_kwh ?? 0).toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Exported energy</span>
            <strong>{(latest?.exported_kwh ?? 0).toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Estimated daily earning</span>
            <strong>RM{calculateProsumerEarnings(latest?.exported_kwh ?? 0).toFixed(2)}</strong>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard eyebrow="Past 7 days" title="Past 7 Days Energy Breakdown">
        <CompactGroupedBarChart
          className="rounded-2xl border border-amber-100/40 bg-gradient-to-br from-amber-50/60 via-emerald-50/30 to-teal-50/40 p-4 backdrop-blur-sm mt-4"
          data={chartData}
          series={[
            { key: 'generatedKwh', label: 'Generated', color: 'gold' },
            { key: 'localConsumptionKwh', label: 'Local consumption', color: 'blueGrey' },
            { key: 'exportedKwh', label: 'Exported', color: 'teal' }
          ]}
          tooltipExtra={(item) => [
            {
              label: 'Estimated earning',
              value: `RM${calculateProsumerEarnings(item.exportedKwh).toFixed(2)}`,
              color: 'gold'
            }
          ]}
          valueSuffix=" kWh"
          xKey="date"
        />
        <p className="microcopy">Exported energy is converted into payout at RM{PROSUMER_BUYBACK_RATE.toFixed(2)}/kWh within quota.</p>
      </DashboardCard>
    </div>
  );
}
