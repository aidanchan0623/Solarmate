import { useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import {
  getLatestMeterReading,
  getProsumerDailyExport,
  getProsumerMonthlyExportHistory,
  getProsumerStatement
} from '../../api/client';
import CompactGroupedBarChart from '../../components/CompactGroupedBarChart';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';
import StatementModal from '../../components/StatementModal';
import { PROSUMER_BUYBACK_RATE, SOLAR_ATAP_REFERENCE_RATE } from '../../utils/calculations';

const monthlyColumns = [
  { key: 'month', label: 'Month' },
  { key: 'actual_exported_kwh', label: 'Actual Exported', render: (row) => `${row.actual_exported_kwh.toLocaleString()} kWh` },
  { key: 'solar_mate_kwh', label: 'Sold to SolarMate', render: (row) => `${row.solar_mate_kwh.toLocaleString()} kWh` },
  { key: 'solar_atap_kwh', label: 'Solar ATAP Excess', render: (row) => `${row.solar_atap_kwh.toLocaleString()} kWh` },
  { key: 'total_earnings', label: 'Total Earnings', render: (row) => `RM${row.total_earnings.toFixed(2)}` },
  { key: 'status', label: 'Status' }
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MALAYSIA_TIME_ZONE = 'Asia/Kuala_Lumpur';

function formatDateLabel(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  if (!year || !month || !day) return dateString;
  return `${MONTH_LABELS[month - 1] || ''} ${day}`.trim();
}

function kwh(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function roundKwh(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function stableRatio(seedText) {
  const seed = Array.from(seedText || '').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 0.35 + (seed % 21) / 100;
}

const ESP_BASE_GENERATED_KWH = [24.4, 23.8, 25.1, 24.7, 26.2, 23.9, 25.5];
const ESP_MONTHLY_EXPORT_FACTORS = [0.92, 1.08, 0.96, 1.14];

function malaysiaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MALAYSIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day)
  };
}

function dateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function currentMalaysiaDateKey() {
  const { year, month, day } = malaysiaDateParts();
  return dateKey(year, month, day);
}

function monthKeyFromDate(dateString) {
  return dateString.slice(0, 7);
}

function currentMalaysiaMonthKey() {
  return monthKeyFromDate(currentMalaysiaDateKey());
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

function addMonths(monthKey, offset) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return dateKey(date.getFullYear(), date.getMonth() + 1, 1).slice(0, 7);
}

function addDays(dateString, offset) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  const date = new Date(year, month - 1, day + offset);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function makeEspEnergyRow(date, generatedKwh, seedText) {
  const generated = roundKwh(generatedKwh);
  const localConsumption = roundKwh(generated * stableRatio(seedText));
  const exported = roundKwh(Math.max(generated - localConsumption, 0));
  return {
    date,
    fullDate: formatDateLabel(date),
    generated_kwh: roundKwh(localConsumption + exported),
    local_consumption_kwh: localConsumption,
    exported_kwh: exported
  };
}

function buildEspBaseRows() {
  const todayKey = currentMalaysiaDateKey();
  const baseStartDate = addDays(todayKey, -(ESP_BASE_GENERATED_KWH.length - 1));
  return ESP_BASE_GENERATED_KWH.map((generatedKwh, index) => (
    makeEspEnergyRow(addDays(baseStartDate, index), generatedKwh, `esp-base-${baseStartDate}-${index}`)
  ));
}

function buildEspHistoricalMonths(quota) {
  const currentMonth = currentMalaysiaMonthKey();
  return ESP_MONTHLY_EXPORT_FACTORS.map((factor, index) => {
    const monthKey = addMonths(currentMonth, -(ESP_MONTHLY_EXPORT_FACTORS.length - index));
    const actualExported = roundKwh((quota || 500) * factor);
    const solarMateKWh = Math.min(actualExported, quota || actualExported);
    const solarAtapKWh = Math.max(actualExported - (quota || actualExported), 0);
    return {
      month: monthLabel(monthKey),
      month_key: monthKey,
      actual_exported_kwh: actualExported,
      solar_mate_kwh: roundKwh(solarMateKWh),
      solar_atap_kwh: roundKwh(solarAtapKWh),
      solar_mate_earnings: roundKwh(solarMateKWh * PROSUMER_BUYBACK_RATE),
      solar_atap_earnings: roundKwh(solarAtapKWh * SOLAR_ATAP_REFERENCE_RATE),
      total_earnings: roundKwh((solarMateKWh * PROSUMER_BUYBACK_RATE) + (solarAtapKWh * SOLAR_ATAP_REFERENCE_RATE)),
      status: 'Settled'
    };
  });
}

export default function ProsumerExports({ prosumer, user }) {
  const [view, setView] = useState('weekly');
  const [dailyRows, setDailyRows] = useState([]);
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [espRows, setEspRows] = useState(() => (Boolean(prosumer.deviceId) || user?.username === 'prosumeresp' ? buildEspBaseRows() : []));
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState('');
  const hasEspDevice = Boolean(prosumer.deviceId) || user?.username === 'prosumeresp';
  const deviceId = prosumer.deviceId || 'ESP32_SOLARMATE_001';
  const seenReadingRef = useRef(null);
  const espInitializedRef = useRef(false);
  const espNextDayOffsetRef = useRef(1);

  async function loadExportData() {
    if (hasEspDevice) return;
    const [daily, monthly] = await Promise.all([
      getProsumerDailyExport({ limit: 7 }),
      getProsumerMonthlyExportHistory()
    ]);
    setDailyRows(daily);
    setMonthlyRows(monthly);
    setError('');
  }

  useEffect(() => {
    if (hasEspDevice) return undefined;
    let cancelled = false;
    loadExportData().catch((err) => {
      if (!cancelled) setError(err.message || 'Unable to load export data.');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasEspDevice) return undefined;
    let cancelled = false;

    async function pollLatestEspReading() {
      try {
        const reading = await getLatestMeterReading(deviceId);
        if (cancelled) return;

        const readingKey = reading.last_update || '';
        if (!espInitializedRef.current) {
          espInitializedRef.current = true;
          seenReadingRef.current = readingKey || null;
          return;
        }
        if (!readingKey || seenReadingRef.current === readingKey) return;
        seenReadingRef.current = readingKey;

        const generated = roundKwh(reading.scaled_energy_kwh);
        if (generated <= 0) return;

        const date = addDays(currentMalaysiaDateKey(), espNextDayOffsetRef.current);
        espNextDayOffsetRef.current += 1;
        const espDayRow = makeEspEnergyRow(date, generated, `esp-${readingKey}-${generated}`);

        setEspRows((current) => [...current, espDayRow]);
        setError('');
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to refresh ESP live reading.');
      }
    }

    pollLatestEspReading();
    const interval = window.setInterval(() => {
      pollLatestEspReading();
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [deviceId, hasEspDevice]);

  const exportRows = hasEspDevice ? espRows.slice(-7) : dailyRows;

  const weeklySummary = useMemo(() => {
    const generated = exportRows.reduce((sum, row) => sum + row.generated_kwh, 0);
    const local = exportRows.reduce((sum, row) => sum + row.local_consumption_kwh, 0);
    const exported = exportRows.reduce((sum, row) => sum + row.exported_kwh, 0);
    const earnings = exported * PROSUMER_BUYBACK_RATE;
    const average = exportRows.length ? exported / exportRows.length : 0;
    const best = exportRows.reduce((bestRow, row) => (!bestRow || row.exported_kwh > bestRow.exported_kwh ? row : bestRow), null);
    return { generated, local, exported, earnings, average, best };
  }, [exportRows]);

  const quota = prosumer.monthlyExportCommitment || 0;
  const espCurrentMonthKey = currentMalaysiaMonthKey();
  const espHistoricalMonths = useMemo(() => buildEspHistoricalMonths(quota), [quota]);
  const espMonthlySplit = useMemo(() => {
    const actualExported = espRows
      .filter((row) => monthKeyFromDate(row.date) === espCurrentMonthKey)
      .reduce((sum, row) => sum + row.exported_kwh, 0);
    const solarMateKWh = Math.min(actualExported, quota);
    const solarAtapKWh = Math.max(actualExported - quota, 0);
    return {
      month: monthLabel(espCurrentMonthKey),
      month_key: espCurrentMonthKey,
      actual_exported_kwh: roundKwh(actualExported),
      solar_mate_kwh: roundKwh(solarMateKWh),
      solar_atap_kwh: roundKwh(solarAtapKWh),
      solar_mate_earnings: roundKwh(solarMateKWh * PROSUMER_BUYBACK_RATE),
      solar_atap_earnings: roundKwh(solarAtapKWh * SOLAR_ATAP_REFERENCE_RATE),
      total_earnings: roundKwh((solarMateKWh * PROSUMER_BUYBACK_RATE) + (solarAtapKWh * SOLAR_ATAP_REFERENCE_RATE)),
      status: 'Session only'
    };
  }, [espCurrentMonthKey, espRows, quota]);
  const currentMonth = hasEspDevice ? espMonthlySplit : monthlyRows[monthlyRows.length - 1];
  const quotaUsed = currentMonth && quota
    ? Math.min((currentMonth.solar_mate_kwh / quota) * 100, 100)
    : 0;

  const weeklyChartData = exportRows.map((row) => ({
    date: formatDateLabel(row.date),
    fullDate: hasEspDevice ? row.fullDate || formatDateLabel(row.date) : row.date,
    generatedKwh: row.generated_kwh,
    localConsumptionKwh: row.local_consumption_kwh,
    exportedKwh: row.exported_kwh
  }));

  const monthlyChartRows = hasEspDevice ? [...espHistoricalMonths, currentMonth] : monthlyRows;
  const monthlyChartData = monthlyChartRows.map((row) => ({
    month: row.month.slice(0, 3),
    fullMonth: row.month,
    solarMateKWh: row.solar_mate_kwh,
    solarAtapKWh: row.solar_atap_kwh,
    totalEarnings: row.total_earnings
  }));

  async function openStatement() {
    if (hasEspDevice) return;
    if (!currentMonth) return;
    setStatement(await getProsumerStatement(currentMonth.month_key));
  }

  return (
    <div className="page-stack">
      <div className="view-tabs">
        {['weekly', 'monthly'].map((item) => (
          <button
            className={view === item ? 'active' : ''}
            key={item}
            onClick={() => setView(item)}
            type="button"
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {error && <div className="auth-error">{error}</div>}

      {view === 'weekly' && (
        <>
          <DashboardCard eyebrow="Weekly export" title="This Week's Solar Export">
            <p className="microcopy">
              {hasEspDevice
                ? 'The latest 7 Malaysia dates start simulated. Each ESP packet adds the next demo day, and refresh starts the sequence again.'
                : 'Weekly totals are summed from daily export records. Generated energy always equals local consumption plus exported energy.'}
            </p>
            <div className="summary-metrics compact important-metrics">
              <div className="metric-emphasis"><span>Exported This Week</span><strong>{kwh(weeklySummary.exported)} kWh</strong></div>
              <div><span>Generated This Week</span><strong>{kwh(weeklySummary.generated)} kWh</strong></div>
              <div><span>Local Consumption This Week</span><strong>{kwh(weeklySummary.local)} kWh</strong></div>
              {!hasEspDevice && (
                <>
                  <div className="metric-emphasis"><span>Total Earnings This Week</span><strong>RM{weeklySummary.earnings.toFixed(2)}</strong></div>
                  <div><span>Average Daily Export</span><strong>{weeklySummary.average.toFixed(2)} kWh</strong></div>
                  <div>
                    <span>Best Day</span>
                    <strong>{weeklySummary.best ? `${formatDateLabel(weeklySummary.best.date)} (${weeklySummary.best.exported_kwh} kWh)` : '-'}</strong>
                  </div>
                </>
              )}
            </div>
          </DashboardCard>

          <DashboardCard eyebrow="Weekly chart" title="Generated, Consumed, and Exported by Day">
            <CompactGroupedBarChart
              data={weeklyChartData}
              emptyMessage={hasEspDevice ? 'No ESP packets received in this browser session. Send a reading to add the first bar.' : 'No weekly export data yet.'}
              height={300}
              series={[
                { key: 'generatedKwh', label: 'Generated', color: 'gold' },
                { key: 'localConsumptionKwh', label: 'Consumed locally', color: 'blueGrey' },
                { key: 'exportedKwh', label: 'Exported', color: 'teal' }
              ]}
              tooltipExtra={hasEspDevice ? undefined : (item) => [
                { label: 'Earning', value: `RM${((item.exportedKwh || 0) * PROSUMER_BUYBACK_RATE).toFixed(2)}`, color: 'green' }
              ]}
              tooltipTitle={(item) => item.fullDate}
              valueSuffix=" kWh"
              xKey="date"
            />
          </DashboardCard>
        </>
      )}

      {view === 'monthly' && (
        <>
          <DashboardCard
            action={!hasEspDevice && <button className="secondary-button" type="button" onClick={openStatement}><Download size={16} /> Download Statement</button>}
            eyebrow="Monthly export"
            title="SolarMate Quota and Solar ATAP Excess"
          >
            <p className="microcopy">
              {hasEspDevice
                ? 'The current Malaysia month combines simulated base days with ESP-derived demo days from this session.'
                : 'Monthly earnings are calculated from the same daily export records, then split between SolarMate quota and Solar ATAP excess.'}
            </p>
            <div className="summary-metrics compact important-metrics">
              <div className="metric-emphasis"><span>Exported This Month</span><strong>{kwh(currentMonth?.actual_exported_kwh)} kWh</strong></div>
              <div className="metric-emphasis"><span>Sold to SolarMate</span><strong>{kwh(currentMonth?.solar_mate_kwh)} kWh</strong></div>
              <div className="metric-emphasis"><span>Excess Sold to Solar ATAP</span><strong>{kwh(currentMonth?.solar_atap_kwh)} kWh</strong></div>
              {!hasEspDevice && (
                <>
                  <div className="metric-emphasis"><span>Total Earnings This Month</span><strong>RM{(currentMonth?.total_earnings ?? 0).toFixed(2)}</strong></div>
                  <div><span>Monthly Quota</span><strong>{quota.toLocaleString()} kWh</strong></div>
                  <div><span>Monthly Quota Used</span><strong>{quotaUsed.toFixed(0)}%</strong></div>
                </>
              )}
            </div>
          </DashboardCard>

          <DashboardCard eyebrow="Monthly chart" title="Monthly Energy Sold by Channel">
            <CompactGroupedBarChart
              data={monthlyChartData}
              emptyMessage={hasEspDevice ? 'No session export yet. Send ESP readings to build the monthly split.' : 'No monthly export data yet.'}
              height={300}
              series={[
                { key: 'solarMateKWh', label: 'Energy sold to SolarMate', color: 'teal' },
                { key: 'solarAtapKWh', label: 'Excess sold to Solar ATAP', color: 'gold' }
              ]}
              stacked
              tooltipExtra={hasEspDevice ? undefined : (item) => [
                { label: 'Total earnings', value: `RM${(item.totalEarnings || 0).toFixed(2)}`, color: 'green' }
              ]}
              tooltipTitle={(item) => item.fullMonth}
              valueSuffix=" kWh"
              xKey="month"
            />
            {!hasEspDevice && <DataTable columns={monthlyColumns} rows={monthlyRows} />}
          </DashboardCard>
        </>
      )}

      <StatementModal data={statement} onClose={() => setStatement(null)} open={Boolean(statement)} type="prosumer" />
    </div>
  );
}
