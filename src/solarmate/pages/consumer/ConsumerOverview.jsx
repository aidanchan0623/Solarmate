import { useEffect, useState } from 'react';
import { Receipt, TrendingDown, Zap } from 'lucide-react';
import { getConsumerOverview } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';

function ImpactRow({ icon: Icon, label, value, detail, tone = 'teal' }) {
  const tones = {
    amber: {
      row: 'from-amber-50/80 to-white hover:border-amber-200/80',
      icon: 'bg-amber-100 text-amber-600 shadow-[0_12px_28px_-18px_rgba(245,158,11,0.8)]'
    },
    blue: {
      row: 'from-sky-50/80 to-white hover:border-sky-200/80',
      icon: 'bg-sky-100 text-sky-600 shadow-[0_12px_28px_-18px_rgba(14,165,233,0.8)]'
    },
    emerald: {
      row: 'from-emerald-50/80 to-white hover:border-emerald-200/80',
      icon: 'bg-emerald-100 text-emerald-600 shadow-[0_12px_28px_-18px_rgba(16,185,129,0.8)]'
    }
  };
  const theme = tones[tone] || tones.emerald;

  return (
    <div className={`group rounded-2xl border border-slate-100 bg-gradient-to-br p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-34px_rgba(15,23,42,0.65)] ${theme.row}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${theme.icon}`}>
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <span className="block text-sm font-bold text-slate-700">{label}</span>
            <strong className="shrink-0 text-right text-lg font-bold text-slate-950 tabular-nums">{value}</strong>
          </div>
          <span className="mt-0.5 block max-w-[15rem] text-xs leading-snug text-slate-500">{detail}</span>
        </div>
      </div>
    </div>
  );
}

function ProgressLine({ label, value, percent, tone = 'teal' }) {
  const barClass = tone === 'amber'
    ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
    : 'bg-gradient-to-r from-teal-500 via-emerald-400 to-lime-300';

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        {value && <strong className="text-sm font-bold text-slate-900 tabular-nums">{value}</strong>}
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100 shadow-inner">
        <span
          className={`block h-full rounded-full shadow-[0_0_18px_rgba(20,184,166,0.28)] ${barClass}`}
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
            <div className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-white via-teal-50/45 to-emerald-50/60 p-6 shadow-[0_28px_70px_-55px_rgba(13,148,136,0.75)]">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-200/50 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-16 h-44 w-44 rounded-full bg-cyan-100/70 blur-3xl" />

              <div className="relative">
                <span className="block text-xs font-bold uppercase tracking-wider text-teal-700">Green credit used this month</span>
                <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <strong className="text-4xl font-bold tracking-tight text-slate-950 tabular-nums">
                    {greenCredit.toLocaleString()}
                  </strong>
                  <span className="pb-1 text-lg font-bold text-slate-500 tabular-nums">/ {allocation.toLocaleString()} kWh</span>
                </div>

                <div className="mt-6">
                  <ProgressLine
                    label="Credit pace"
                    percent={creditProgress}
                    value={`${creditProgress.toFixed(1)}% used`}
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm">
                  <div className="mb-3 grid gap-3 md:grid-cols-[0.85fr_1.15fr] md:items-end">
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Billing cycle</span>
                      <strong className="mt-1 block text-xl font-bold text-slate-950 tabular-nums">
                        Day {overview.current_day_of_month} of {overview.days_in_month}
                      </strong>
                    </div>
                    <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-100 via-yellow-50 to-white px-4 py-2.5 shadow-[0_14px_34px_-30px_rgba(245,158,11,0.9)]">
                      <span className="block text-xs font-bold uppercase tracking-wider text-amber-800">Calendar elapsed</span>
                      <strong className="mt-0.5 block text-lg font-bold text-amber-900 tabular-nums">
                        {overview.month_progress_percentage.toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                  <ProgressLine
                    label="Month progress"
                    percent={overview.month_progress_percentage}
                    tone="amber"
                    value=""
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex lg:col-span-4">
            <div className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-slate-50/80 to-teal-50/35 p-4 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.55)]">
              <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-teal-100/70 blur-3xl" />
              <div className="relative">
                <span className="block text-xs font-bold uppercase tracking-wider text-teal-700">What matters now</span>
                <p className="mt-1.5 text-xs font-medium leading-snug text-slate-500">
                  The current grid fallback, bill impact, and saving signal.
                </p>
              </div>
              <div className="relative mt-3 flex flex-1 flex-col justify-between gap-2">
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
                  tone="blue"
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
