import { useEffect, useState } from 'react';
import { Receipt, TrendingDown, Zap } from 'lucide-react';
import { getConsumerOverview } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';

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
  const theme = tones[tone] || tones.emerald;

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

function ProgressLine({ label, value, percent, tone = 'teal' }) {
  const barClass = tone === 'amber'
    ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400'
    : 'bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-400';

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        {value && <strong className="text-sm font-black text-slate-900 tabular-nums">{value}</strong>}
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-white/60 shadow-inner backdrop-blur-sm border border-white/50">
        <span
          className={`block h-full rounded-full shadow-[0_0_12px_rgba(20,184,166,0.6)] ${barClass}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function ConsumerOverview({ consumer }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getConsumerOverview()
      .then((data) => {
        if (!isMounted) return;
        setOverview(data);
        setError('');
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Unable to load consumer overview from backend.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const allocation = overview?.package_allocation_kwh || consumer.monthlyGreenAllocation || 0;
  const greenCredit = overview?.green_credit_kwh || 0;
  const remainingCredit = Math.max(allocation - greenCredit, 0);
  const creditProgress = allocation > 0 ? Math.min((greenCredit / allocation) * 100, 100) : 0;

  return (
    <DashboardCard
      action={overview && (
        <StatusBadge tone={remainingCredit > 0 ? 'success' : 'warning'}>
          {remainingCredit > 0 ? 'Green credit available' : 'TNB fallback active'}
        </StatusBadge>
      )}
      eyebrow="Consumer overview"
      title="Green credit status"
    >
      {error && <div className="auth-error">{error}</div>}
      {!overview && (
        <div className="auth-error">
          {loading ? 'Loading monthly usage totals from backend daily records...' : 'No backend daily usage records loaded.'}
        </div>
      )}
      {overview && (
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          <div className="flex lg:col-span-8">
            <div className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-cyan-50/70 to-emerald-100/80 p-6 shadow-sm">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-200/50 blur-3xl mix-blend-multiply" />
              <div className="pointer-events-none absolute -bottom-20 left-16 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl mix-blend-multiply" />

              <div className="relative">
                <span className="block text-xs font-black uppercase tracking-widest text-teal-800">Green credit used this month</span>
                <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <strong className="text-5xl font-black tracking-tight text-teal-950 tabular-nums drop-shadow-sm">
                    {greenCredit.toLocaleString()}
                  </strong>
                  <span className="pb-1 text-xl font-bold text-teal-800 tabular-nums drop-shadow-sm">/ {allocation.toLocaleString()} kWh</span>
                </div>

                <div className="mt-8 rounded-2xl bg-white/30 p-4 backdrop-blur-md border border-white/50 shadow-sm">
                  <ProgressLine
                    label="Credit pace"
                    percent={creditProgress}
                    value={`${creditProgress.toFixed(1)}% used`}
                  />
                </div>

                <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/50 bg-white/40 p-4 shadow-sm backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today</span>
                      <strong className="text-sm text-slate-950">{malaysiaDate(overview.today_key)}</strong>
                    </div>

                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Updated</span>
                      <strong className="text-sm text-slate-950">{malaysiaTime(overview.last_updated_at)}</strong>
                    </div>
                  </div>
                  
                  <div className="relative h-6 w-full overflow-hidden rounded-full bg-teal-50 shadow-inner border border-teal-100/50">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-teal-300 to-teal-400" 
                      style={{ width: `${overview.month_progress_percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-extrabold text-emerald-950 tracking-wide drop-shadow-md">
                        Day {overview.current_day_of_month} / {overview.days_in_month} | {overview.month_progress_percentage.toFixed(1)}% elapsed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex lg:col-span-4">
            <div className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-emerald-50/80 via-slate-50 to-teal-100/60 p-5 shadow-sm">
              <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-teal-200/40 blur-3xl mix-blend-multiply" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl mix-blend-multiply" />
              
              <div className="relative">
                <span className="block text-xs font-black uppercase tracking-widest text-teal-900">What matters now</span>
                <p className="mt-1.5 text-sm font-semibold leading-snug text-teal-800/80">
                  The current grid fallback, bill impact, and saving signal.
                </p>
              </div>
              <div className="relative mt-5 flex flex-1 flex-col justify-between gap-3">
                <ImpactRow
                  detail="Grid energy needed after credit offset"
                  icon={Zap}
                  label="TNB fallback"
                  tone="amber"
                  value={`${overview.tnb_import_kwh.toLocaleString()} kWh`}
                />
                <ImpactRow
                  detail="Current blended monthly bill"
                  icon={Receipt}
                  label="Bill so far"
                  tone="teal"
                  value={`RM${overview.total_bill.toFixed(2)}`}
                />
                <ImpactRow
                  detail="Against normal TNB-only billing"
                  icon={TrendingDown}
                  label="Estimated saving"
                  tone="emerald"
                  value={`${overview.actual_saving_percentage.toFixed(2)}%`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
