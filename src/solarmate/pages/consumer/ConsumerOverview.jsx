import { useEffect, useState } from 'react';
import { BatteryCharging, Receipt, TrendingDown, Zap } from 'lucide-react';
import { getConsumerOverview } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';

function MetricTile({ icon: Icon, label, value, detail, tone = 'teal' }) {
  const tones = {
    teal: 'from-teal-50 to-white border-teal-100 text-teal-600',
    amber: 'from-amber-50 to-white border-amber-100 text-amber-600',
    blue: 'from-sky-50 to-white border-sky-100 text-sky-600',
    emerald: 'from-emerald-50 to-white border-emerald-100 text-emerald-600'
  };
  const theme = tones[tone] || tones.teal;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 shadow-[0_16px_42px_-34px_rgba(15,23,42,0.55)] ${theme}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
          <strong className="mt-2 block text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</strong>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          <Icon size={18} />
        </span>
      </div>
      {detail && <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">{detail}</p>}
    </div>
  );
}

function ProgressLine({ label, value, percent, tone = 'teal' }) {
  const barClass = tone === 'amber'
    ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
    : 'bg-gradient-to-r from-teal-500 via-emerald-400 to-lime-300';

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        <strong className="text-sm font-bold text-slate-900 tabular-nums">{value}</strong>
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
        <div className="space-y-6">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-teal-100/80 bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/50 p-6 shadow-[0_22px_60px_-44px_rgba(13,148,136,0.65)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">This month usage</span>
                  <strong className="mt-2 block text-4xl font-bold tracking-tight text-slate-950 tabular-nums">
                    {greenCredit.toLocaleString()} / {allocation.toLocaleString()} kWh
                  </strong>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Package</span>
                  <strong className="mt-1 block text-sm font-bold text-slate-800">{overview.selected_package}</strong>
                </div>
              </div>

              <div className="mt-7">
                <ProgressLine
                  label="Credit usage"
                  percent={creditProgress}
                  value={`${creditProgress.toFixed(1)}% used - ${remainingCredit.toLocaleString()} kWh remaining`}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.5)]">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Month progress</span>
              <strong className="mt-2 block text-3xl font-bold tracking-tight text-slate-950 tabular-nums">
                Day {overview.current_day_of_month} of {overview.days_in_month}
              </strong>
              <div className="mt-7">
                <ProgressLine
                  label="Calendar elapsed"
                  percent={overview.month_progress_percentage}
                  tone="amber"
                  value={`${overview.month_progress_percentage.toFixed(1)}% elapsed`}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              detail="Unused green credit before TNB fallback."
              icon={BatteryCharging}
              label="Credit remaining"
              tone="teal"
              value={`${remainingCredit.toLocaleString()} kWh`}
            />
            <MetricTile
              detail="Grid energy used after credit offset."
              icon={Zap}
              label="TNB import"
              tone="amber"
              value={`${overview.tnb_import_kwh.toLocaleString()} kWh`}
            />
            <MetricTile
              detail="Current blended monthly bill."
              icon={Receipt}
              label="Total bill"
              tone="blue"
              value={`RM${overview.total_bill.toFixed(2)}`}
            />
            <MetricTile
              detail="Saving against TNB-only billing."
              icon={TrendingDown}
              label="Actual bill saving"
              tone="emerald"
              value={`${overview.actual_saving_percentage.toFixed(2)}%`}
            />
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
