import { useEffect, useState } from 'react';
import { BadgeDollarSign, Leaf, Zap } from 'lucide-react';
import { getProsumerOverview } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import { calculateProsumerUpliftPercentage } from '../../utils/calculations';

function ProgressLine({ label, value, percent, tone = 'teal' }) {
  const barClass = tone === 'amber'
    ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
    : 'bg-gradient-to-r from-teal-500 via-emerald-400 to-lime-300';

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        {value && <strong className="text-sm font-bold text-slate-900 tabular-nums">{value}</strong>}
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100 shadow-inner">
        <span
          className={`block h-full rounded-full shadow-[0_0_18px_rgba(20,184,166,0.24)] ${barClass}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function malaysiaDate(value) {
  const source = value ? new Date(`${value}T00:00:00+08:00`) : new Date();
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(source);
}

function malaysiaTime(value) {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  }).format(value ? new Date(value) : new Date());
}

function ImpactRow({ icon: Icon, label, value, detail, tone = 'teal' }) {
  const tones = {
    amber: {
      row: 'from-white via-amber-50/40 to-amber-100/60 hover:border-amber-300',
      icon: 'bg-amber-100/90 text-amber-600 shadow-sm'
    },
    teal: {
      row: 'from-white via-teal-50/40 to-teal-100/60 hover:border-teal-300',
      icon: 'bg-teal-100/90 text-teal-600 shadow-sm'
    },
    emerald: {
      row: 'from-white via-emerald-50/40 to-emerald-100/60 hover:border-emerald-300',
      icon: 'bg-emerald-100/90 text-emerald-600 shadow-sm'
    }
  };
  const theme = tones[tone] || tones.teal;

  return (
    <div className={`group rounded-2xl border-2 border-white bg-gradient-to-br p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl backdrop-blur-md ${theme.row}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${theme.icon}`}>
          <Icon size={20} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <span className="block text-sm font-extrabold text-slate-800">{label}</span>
            <strong className="shrink-0 text-right text-lg font-black text-slate-900 tabular-nums">{value}</strong>
          </div>
          <span className="mt-0.5 block max-w-[15rem] text-xs font-semibold leading-snug text-slate-600">{detail}</span>
        </div>
      </div>
    </div>
  );
}

export default function ProsumerOverview({ prosumer }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadOverview() {
      try {
        const data = await getProsumerOverview();
        if (!cancelled) {
          setOverview(data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  const data = overview;
  const upliftPercentage = calculateProsumerUpliftPercentage();

  return (
    <div className="page-stack">
      <DashboardCard
        action={data && <StatusBadge tone="success">{upliftPercentage.toFixed(1)}% higher than Solar ATAP</StatusBadge>}
        eyebrow="Prosumer overview"
        title={data?.display_name || prosumer.name}
      >
        <p className="microcopy !mt-2 !mb-3">
          Your export pace, payout route, and current earnings for this month.
        </p>
        {error && <div className="auth-error">Unable to load backend overview: {error}</div>}
        {!data && (
          <div className="auth-error">
            {loading ? 'Loading monthly export totals from backend daily records...' : 'No backend daily export records loaded.'}
          </div>
        )}
        {data && (
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            <div className="flex lg:col-span-8">
              <div className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50/70 to-emerald-100/80 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-200/50 blur-3xl mix-blend-multiply" />
                <div className="pointer-events-none absolute -bottom-20 left-16 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl mix-blend-multiply" />

                <div className="relative">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="block text-xs font-black uppercase tracking-widest text-amber-800">Exported this month</span>
                      <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                        <strong className="text-5xl font-black tracking-tight text-amber-950 tabular-nums drop-shadow-sm">
                          {data.exported_kwh.toLocaleString()}
                        </strong>
                        <span className="pb-1 text-xl font-bold text-amber-800 tabular-nums drop-shadow-sm">
                          / {(data.export_commitment_kwh || 0).toLocaleString()} kWh
                        </span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-sm px-4 py-3 shadow-sm">
                      <span className="block text-xs font-bold uppercase tracking-wider text-amber-800/80">Plan</span>
                      <strong className="mt-1 block text-sm font-black text-amber-950">{data.selected_export_plan}</strong>
                    </div>
                  </div>

                  <div className="mt-8 rounded-2xl bg-white/30 p-4 backdrop-blur-md border border-white/50 shadow-sm">
                    <ProgressLine
                      label="Export quota pace"
                      percent={data.quota_progress_percentage}
                      value={`${data.quota_progress_percentage.toFixed(1)}% fulfilled`}
                      tone="amber"
                    />
                  </div>

                  <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/50 bg-white/40 p-4 shadow-sm backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today</span>
                        <strong className="text-sm text-slate-950">{malaysiaDate(data.today_key)}</strong>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Updated</span>
                        <strong className="text-sm text-slate-950">{malaysiaTime(data.last_updated_at)}</strong>
                      </div>
                    </div>
                    
                    <div className="relative h-6 w-full overflow-hidden rounded-full bg-amber-50 shadow-inner border border-amber-200/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                        style={{ width: `${data.month_progress_percentage}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-extrabold text-amber-950 tracking-wide drop-shadow-md">
                          Day {data.current_day_of_month} / {data.days_in_month} | {data.month_progress_percentage.toFixed(1)}% elapsed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex lg:col-span-4">
              <div className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-emerald-50/80 via-slate-50 to-amber-100/60 p-5 shadow-sm">
                <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl mix-blend-multiply" />
                <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl mix-blend-multiply" />
                <div className="relative">
                  <span className="block text-xs font-black uppercase tracking-widest text-emerald-900">What matters now</span>
                  <p className="mt-1.5 text-sm font-semibold leading-snug text-emerald-800/80">
                    Your payout route, extra export, and earnings signal.
                  </p>
                </div>
                <div className="relative mt-5 flex flex-1 flex-col justify-between gap-3">
                  <ImpactRow
                    detail="Export credited through SolarMate quota"
                    icon={Zap}
                    label="SolarMate sold"
                    tone="amber"
                    value={`${data.solar_mate_kwh.toLocaleString()} kWh`}
                  />
                  <ImpactRow
                    detail="Export above quota routed to Solar ATAP"
                    icon={Leaf}
                    label="ATAP excess"
                    tone="teal"
                    value={`${data.solar_atap_kwh.toLocaleString()} kWh`}
                  />
                  <ImpactRow
                    detail={`${upliftPercentage.toFixed(1)}% higher than Solar ATAP rate`}
                    icon={BadgeDollarSign}
                    label="Earnings"
                    tone="emerald"
                    value={`RM${data.total_earnings.toFixed(2)}`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
