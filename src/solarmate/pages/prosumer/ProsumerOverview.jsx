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

function ImpactRow({ icon: Icon, label, value, detail, tone = 'teal' }) {
  const tones = {
    amber: {
      row: 'from-amber-50/80 to-white hover:border-amber-200/80',
      icon: 'bg-amber-100 text-amber-600 shadow-[0_12px_28px_-18px_rgba(245,158,11,0.8)]'
    },
    teal: {
      row: 'from-teal-50/80 to-white hover:border-teal-200/80',
      icon: 'bg-teal-100 text-teal-600 shadow-[0_12px_28px_-18px_rgba(20,184,166,0.8)]'
    },
    emerald: {
      row: 'from-emerald-50/80 to-white hover:border-emerald-200/80',
      icon: 'bg-emerald-100 text-emerald-600 shadow-[0_12px_28px_-18px_rgba(16,185,129,0.8)]'
    }
  };
  const theme = tones[tone] || tones.teal;

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
              <div className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/45 to-emerald-50/60 p-6 shadow-[0_28px_70px_-55px_rgba(245,158,11,0.65)]">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-200/45 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-16 h-44 w-44 rounded-full bg-emerald-100/70 blur-3xl" />

                <div className="relative">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-amber-700">Exported this month</span>
                      <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                        <strong className="text-4xl font-bold tracking-tight text-slate-950 tabular-nums">
                          {data.exported_kwh.toLocaleString()}
                        </strong>
                        <span className="pb-1 text-lg font-bold text-slate-500 tabular-nums">
                          / {(data.export_commitment_kwh || 0).toLocaleString()} kWh
                        </span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Plan</span>
                      <strong className="mt-1 block text-sm font-bold text-slate-800">{data.selected_export_plan}</strong>
                    </div>
                  </div>

                  <div className="mt-6">
                    <ProgressLine
                      label="Export quota pace"
                      percent={data.quota_progress_percentage}
                      value={`${data.quota_progress_percentage.toFixed(1)}% fulfilled`}
                    />
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm">
                    <div className="mb-3 grid gap-3 md:grid-cols-[0.85fr_1.15fr] md:items-end">
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Billing cycle</span>
                        <strong className="mt-1 block text-xl font-bold text-slate-950 tabular-nums">
                          Day {data.current_day_of_month} of {data.days_in_month}
                        </strong>
                      </div>
                      <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-100 via-teal-50 to-white px-4 py-2.5 shadow-[0_14px_34px_-30px_rgba(16,185,129,0.75)]">
                        <span className="block text-xs font-bold uppercase tracking-wider text-emerald-800">Calendar elapsed</span>
                        <strong className="mt-0.5 block text-lg font-bold text-emerald-900 tabular-nums">
                          {data.month_progress_percentage.toFixed(1)}%
                        </strong>
                      </div>
                    </div>
                    <ProgressLine
                      label="Month progress"
                      percent={data.month_progress_percentage}
                      tone="amber"
                      value=""
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex lg:col-span-4">
              <div className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-amber-50/35 to-teal-50/35 p-4 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.55)]">
                <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-amber-100/70 blur-3xl" />
                <div className="relative">
                  <span className="block text-xs font-bold uppercase tracking-wider text-amber-700">What matters now</span>
                  <p className="mt-1.5 text-xs font-medium leading-snug text-slate-500">
                    Your payout route, extra export, and earnings signal.
                  </p>
                </div>
                <div className="relative mt-3 flex flex-1 flex-col justify-between gap-2">
                  <ImpactRow
                    detail="Export credited through SolarMate quota"
                    icon={Zap}
                    label="SolarMate sold"
                    tone="teal"
                    value={`${data.solar_mate_kwh.toLocaleString()} kWh`}
                  />
                  <ImpactRow
                    detail="Export above quota routed to Solar ATAP"
                    icon={Leaf}
                    label="ATAP excess"
                    tone="amber"
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
