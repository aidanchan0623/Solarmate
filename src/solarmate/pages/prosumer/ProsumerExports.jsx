import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Download, Wallet } from 'lucide-react';
import {
  getMeterLcdSummary,
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

function formatDayMonthLabel(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  if (!year || !month || !day) return dateString;
  return `${day} ${MONTH_LABELS[month - 1] || ''}`.trim();
}

function kwh(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function meterValue(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function roundKwh(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

const insightStyles = {
  emerald: {
    shell: 'from-emerald-50/80 via-white to-emerald-50/50 border-emerald-200/60 shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:shadow-md transition-all duration-300',
    icon: 'bg-emerald-100/90 text-emerald-600 shadow-sm',
    labelText: 'text-emerald-800',
    valueText: 'text-emerald-950'
  },
  amber: {
    shell: 'from-amber-50/80 via-white to-amber-50/50 border-amber-200/60 shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:shadow-md transition-all duration-300',
    icon: 'bg-amber-100/90 text-amber-600 shadow-sm',
    labelText: 'text-amber-800',
    valueText: 'text-amber-950'
  },
  sky: {
    shell: 'from-sky-50/80 via-white to-sky-50/50 border-sky-200/60 shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:shadow-md transition-all duration-300',
    icon: 'bg-sky-100/90 text-sky-600 shadow-sm',
    labelText: 'text-sky-800',
    valueText: 'text-sky-950'
  },
  teal: {
    shell: 'from-teal-50/80 via-white to-teal-50/50 border-teal-200/60 shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:shadow-md transition-all duration-300',
    icon: 'bg-teal-100/90 text-teal-600 shadow-sm',
    labelText: 'text-teal-800',
    valueText: 'text-teal-950'
  }
};

function ProgressBar({ inverse = false, label, percent, tone = 'emerald', value }) {
  const clampedPercent = Math.max(0, Math.min(Number(percent) || 0, 100));
  const fillClass = tone === 'amber'
    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-lime-300'
    : 'bg-gradient-to-r from-teal-500 via-emerald-400 to-lime-300';
  const labelClass = inverse ? 'text-white/65' : 'text-slate-700';
  const valueClass = inverse ? 'text-white' : 'text-slate-900';
  const trackClass = inverse ? 'bg-white/15' : 'bg-slate-200/70';

  return (
    <div className="space-y-2">
      <div className={`flex items-center justify-between gap-3 text-sm font-semibold ${labelClass}`}>
        <span>{label}</span>
        <span className={valueClass}>{value}</span>
      </div>
      <div className={`h-2.5 w-full rounded-full ${trackClass}`}>
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${clampedPercent}%` }} />
      </div>
    </div>
  );
}

function ReportMetric({ label, value, tone = 'teal' }) {
  const styles = insightStyles[tone] || insightStyles.teal;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${styles.shell} px-5 py-4`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${styles.icon.split(' ')[0].replace('/90', '/40')}`} />
      <p className={`text-[10px] font-extrabold uppercase tracking-widest ${styles.labelText}`}>{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${styles.valueText} tabular-nums`}>{value}</p>
    </div>
  );
}

function InsightChip({ icon: Icon, label, value, tone = 'teal', variant = 'dark' }) {
  const styles = insightStyles[tone] || insightStyles.teal;
  const shellClass = variant === 'light'
    ? 'border-white/80 bg-white/60 text-slate-900 shadow-sm backdrop-blur-md'
    : 'border-white/10 bg-white/10 text-white/90 backdrop-blur';
  const labelClass = variant === 'light' ? 'text-slate-600' : 'text-white/55';
  const valueClass = variant === 'light' ? 'text-slate-950' : 'text-white';

  return (
    <div className={`flex items-center gap-3.5 rounded-full border px-5 py-2.5 hover:scale-105 transition-transform duration-300 ${shellClass}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-bold uppercase tracking-wider ${labelClass}`}>{label}</p>
        <p className={`text-base font-bold ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

function ChannelSplitBar({ primaryValue, secondaryValue }) {
  const total = Math.max(Number(primaryValue || 0) + Number(secondaryValue || 0), 1);
  const primaryPercent = Math.max(0, Math.min((Number(primaryValue || 0) / total) * 100, 100));
  const secondaryPercent = Math.max(0, 100 - primaryPercent);

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Energy channel split</p>
        <p className="text-sm font-bold text-slate-900">{kwh(total)} kWh</p>
      </div>
      <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="bg-gradient-to-r from-teal-600 to-emerald-400"
          style={{ width: `${primaryPercent}%` }}
        />
        <div
          className="bg-gradient-to-r from-amber-400 to-yellow-300"
          style={{ width: `${secondaryPercent}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">SolarMate</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{kwh(primaryValue)} kWh</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Solar ATAP excess</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{kwh(secondaryValue)} kWh</p>
        </div>
      </div>
    </div>
  );
}

const ESP_MONTHLY_EXPORT_FACTORS = [0.92, 1.08, 0.96, 1.14];
const DEFAULT_ESP_GENERATION_KWH = [22.4, 24.1, 21.8, 25.3, 23.6, 20.9, 26];

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

function addDaysToDateKey(dateString, offset) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return dateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
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

function buildRollingSevenDayLabels(todayKey) {
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(todayKey, index - 6));
}

function buildDefaultEspWeeklyRow(date, index) {
  const generatedKwh = DEFAULT_ESP_GENERATION_KWH[index % DEFAULT_ESP_GENERATION_KWH.length];
  const localConsumption = roundKwh(generatedKwh * 0.35);
  const label = formatDateLabel(date);
  return {
    date,
    label,
    fullDate: label,
    generated_kwh: generatedKwh,
    local_consumption_kwh: localConsumption,
    exported_kwh: roundKwh(generatedKwh - localConsumption),
    isSimulated: true
  };
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
  const [espWeeklyRows, setEspWeeklyRows] = useState([]);
  const [espMonthlyCumulativeKwh, setEspMonthlyCumulativeKwh] = useState(0);
  const [espLatestReading, setEspLatestReading] = useState(null);
  const [espLatestDateKey, setEspLatestDateKey] = useState(null);
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState('');
  const hasEspDevice = Boolean(prosumer.deviceId) || user?.username === 'prosumeresp';
  const deviceId = prosumer.deviceId || 'ESP32_SOLARMATE_001';
  const seenReadingRef = useRef(null);
  const espInitializedRef = useRef(false);

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
        const summary = await getMeterLcdSummary(deviceId);
        console.log('[ESP DEBUG] fetched ESP meter summary', summary);
        if (cancelled) return;
        setEspLatestReading(summary);

        const summaryDate = summary.current_date_iso || summary.date_key || currentMalaysiaDateKey();
        setEspLatestDateKey(summaryDate);

        const readingTimestamp = summary.last_updated_iso || summary.created_at || summary.last_update || summary.last_updated;
        const readingKey = readingTimestamp ? `${summaryDate}-${readingTimestamp}` : '';
        if (!espInitializedRef.current) {
          espInitializedRef.current = true;
        }
        if (!readingKey || seenReadingRef.current === readingKey) return;
        seenReadingRef.current = readingKey;

        const generated = roundKwh(summary.generated_kwh ?? summary.scaled_energy_kwh);
        const localConsumption = roundKwh(summary.local_consumption_kwh ?? generated * 0.35);
        const exported = roundKwh(summary.daily_export_kwh ?? Math.max(generated - localConsumption, 0));
        const backendMonthlyExport = roundKwh(summary.monthly_export_kwh ?? exported);
        if (generated <= 0 && exported <= 0) return;

        const espDayRow = {
          date: summaryDate,
          label: summary.current_date_label || summary.date_label || formatDateLabel(summaryDate),
          fullDate: summary.current_date_label || summary.date_label || formatDateLabel(summaryDate),
          generated_kwh: generated || roundKwh(localConsumption + exported),
          local_consumption_kwh: localConsumption,
          exported_kwh: exported,
          isSimulated: false
        };

        setEspWeeklyRows((current) => {
          const nextRows = current.filter((row) => row.date !== espDayRow.date);
          nextRows.push(espDayRow);
          return nextRows.sort((a, b) => a.date.localeCompare(b.date));
        });
        setEspMonthlyCumulativeKwh((current) => (
          backendMonthlyExport > 0 ? backendMonthlyExport : Math.max(current, exported)
        ));
        setError('');
      } catch (err) {
        console.error('[ESP DEBUG] unable to fetch ESP meter summary', err);
        if (!cancelled) setError(err.message || 'Unable to refresh ESP live reading.');
      }
    }

    pollLatestEspReading();
    const interval = window.setInterval(() => {
      pollLatestEspReading();
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [deviceId, hasEspDevice]);

  const espChartTodayKey = espLatestDateKey || currentMalaysiaDateKey();
  const espRollingDateKeys = useMemo(() => buildRollingSevenDayLabels(espChartTodayKey), [espChartTodayKey]);
  const exportRows = useMemo(() => {
    if (!hasEspDevice) return dailyRows;
    const espRowsByDate = new Map(espWeeklyRows.map((row) => [row.date, row]));
    return espRollingDateKeys.map((date, index) => espRowsByDate.get(date) || buildDefaultEspWeeklyRow(date, index));
  }, [dailyRows, espRollingDateKeys, espWeeklyRows, hasEspDevice]);

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
  const espCurrentMonthKey = monthKeyFromDate(espChartTodayKey);
  const espHistoricalMonths = useMemo(() => buildEspHistoricalMonths(quota), [quota]);
  const espMonthlySplit = useMemo(() => {
    const actualExported = espMonthlyCumulativeKwh;
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
  }, [espCurrentMonthKey, espMonthlyCumulativeKwh, quota]);
  const currentMonth = hasEspDevice ? espMonthlySplit : monthlyRows[monthlyRows.length - 1];
  const quotaUsed = currentMonth && quota
    ? Math.min((currentMonth.solar_mate_kwh / quota) * 100, 100)
    : 0;
  const bestDayLabel = weeklySummary.best
    ? hasEspDevice
      ? weeklySummary.best.label || formatDayMonthLabel(weeklySummary.best.date)
      : formatDateLabel(weeklySummary.best.date)
    : '-';

  const weeklyChartData = exportRows.map((row) => ({
    date: hasEspDevice ? row.label || formatDayMonthLabel(row.date) : formatDateLabel(row.date),
    fullDate: hasEspDevice ? row.fullDate || row.label || formatDayMonthLabel(row.date) : row.date,
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
    totalExportedKWh: row.actual_exported_kwh,
    totalEarnings: row.total_earnings,
    status: row.status,
    isCurrentMonth: Boolean(currentMonth?.month_key && row.month_key === currentMonth.month_key)
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
          {hasEspDevice && (
            <DashboardCard eyebrow="ESP live meter" title="Latest ESP Reading">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
                <ReportMetric label="Voltage" tone="sky" value={`${meterValue(espLatestReading?.voltage_v)} V`} />
                <ReportMetric label="Current" tone="teal" value={`${meterValue(espLatestReading?.current_a)} A`} />
                <ReportMetric label="Power" tone="amber" value={`${meterValue(espLatestReading?.power_w)} W`} />
                <ReportMetric label="Energy" tone="teal" value={`${meterValue(espLatestReading?.energy_wh)} Wh`} />
                <ReportMetric label="Generated" tone="amber" value={`${kwh(espLatestReading?.scaled_energy_kwh)} kWh`} />
              </div>
            </DashboardCard>
          )}

          <DashboardCard eyebrow="Weekly export" title="This Week's Solar Export">
            <div className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 shadow-sm backdrop-blur-md">
              <div className="relative overflow-hidden bg-gradient-to-br from-teal-50/90 via-emerald-50/60 to-amber-100/80 px-8 py-8">
                <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-amber-200/50 blur-3xl mix-blend-multiply" />
                <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl mix-blend-multiply" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-800">Export performance</p>
                    <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                      <span className="text-5xl font-black tracking-tight text-teal-950 drop-shadow-sm">{kwh(weeklySummary.exported)}</span>
                      <span className="pb-2 text-xl font-bold text-teal-800 drop-shadow-sm">kWh exported</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <InsightChip icon={Wallet} label="Earnings" tone="emerald" value={`RM${weeklySummary.earnings.toFixed(2)}`} variant="light" />
                    <InsightChip icon={Award} label="Best day" tone="amber" value={bestDayLabel} variant="light" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
                <ReportMetric label="Generated" tone="amber" value={`${kwh(weeklySummary.generated)} kWh`} />
                <ReportMetric label="Used on site" tone="sky" value={`${kwh(weeklySummary.local)} kWh`} />
                <ReportMetric label="Daily export average" tone="teal" value={`${weeklySummary.average.toFixed(2)} kWh`} />
              </div>
            </div>
          </DashboardCard>

          <DashboardCard eyebrow="Weekly chart" title="Generated, Consumed, and Exported by Day">
            <CompactGroupedBarChart
              barSize={24}
              className="rounded-[2rem] border border-amber-100/40 bg-gradient-to-br from-amber-50/60 via-emerald-50/30 to-teal-50/40 p-6 backdrop-blur-sm mt-4"
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
              useGradientBars
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
            <div className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 shadow-sm backdrop-blur-md">
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-emerald-100/80 px-8 py-8">
                <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-amber-200/50 blur-3xl mix-blend-multiply" />
                <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl mix-blend-multiply" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Settlement performance</p>
                    <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                      <span className="text-5xl font-black tracking-tight text-amber-950 drop-shadow-sm">{kwh(currentMonth?.actual_exported_kwh)}</span>
                      <span className="pb-2 text-xl font-bold text-amber-800 drop-shadow-sm">/ {quota.toLocaleString()} kWh quota</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <InsightChip icon={Wallet} label="Earnings" tone="emerald" value={`RM${(currentMonth?.total_earnings ?? 0).toFixed(2)}`} variant="light" />
                    <InsightChip icon={Award} label="Quota used" tone="amber" value={`${quotaUsed.toFixed(0)}%`} variant="light" />
                  </div>
                </div>
                <div className="relative mt-8 rounded-2xl bg-white/40 p-5 backdrop-blur-md border border-white/50 shadow-sm">
                  <ProgressBar
                    label="SolarMate quota pace"
                    percent={quotaUsed}
                    value={`${quotaUsed.toFixed(0)}% fulfilled`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                <ReportMetric label="Sold to SolarMate" tone="teal" value={`${kwh(currentMonth?.solar_mate_kwh)} kWh`} />
                <ReportMetric label="Solar ATAP excess" tone="amber" value={`${kwh(currentMonth?.solar_atap_kwh)} kWh`} />
              </div>
            </div>
          </DashboardCard>

          <DashboardCard eyebrow="Monthly chart" title="Monthly Energy Sold by Channel">
            <CompactGroupedBarChart
              barRadius={10}
              barSize={54}
              className="prosumer-monthly-export-chart rounded-[2rem] border border-amber-100/40 bg-gradient-to-br from-amber-50/60 via-emerald-50/30 to-teal-50/40 p-4 backdrop-blur-sm mt-4"
              data={monthlyChartData}
              emptyMessage={hasEspDevice ? 'No session export yet. Send ESP readings to build the monthly split.' : 'No monthly export data yet.'}
              height={320}
              highlightKey="isCurrentMonth"
              highlightLabel="In Progress"
              maxBarSize={62}
              roundedStacked
              series={[
                { key: 'solarMateKWh', label: 'Sold to SolarMate', color: 'teal' },
                { key: 'solarAtapKWh', label: 'Solar ATAP Excess', color: 'gold' }
              ]}
              stacked
              tooltipExtra={(item) => [
                { label: 'Total exported', value: `${kwh(item.totalExportedKWh)} kWh`, color: 'green' },
                ...(item.status ? [{ label: 'Status', value: item.status, color: item.isCurrentMonth ? 'amber' : 'blueGrey' }] : [])
              ]}
              tooltipTitle={(item) => item.fullMonth}
              valueSuffix=" kWh"
              useGradientBars
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
