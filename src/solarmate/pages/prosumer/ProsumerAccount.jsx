import { useEffect, useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import PackageCard from '../../components/PackageCard';
import StatusBadge from '../../components/StatusBadge';
import { selectProsumerPlan } from '../../api/client';
import { packagePlans } from '../../data/mockData';

function DetailField({ label, value, className = '' }) {
  return (
    <div className={`group rounded-2xl border border-transparent bg-white/0 p-4 transition-all hover:border-white/60 hover:bg-white/40 hover:shadow-sm ${className}`}>
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{label}</span>
      <strong className="block text-xl font-bold tracking-tight text-slate-900 truncate" title={value}>{value}</strong>
    </div>
  );
}

export default function ProsumerAccount({ onProfileUpdate, profile, user }) {
  const [localProfile, setLocalProfile] = useState(profile);
  const [isChanging, setIsChanging] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  async function changePlan(plan) {
    setMessage('');
    setError('');
    try {
      const updated = await selectProsumerPlan({
        selected_export_plan: plan.name,
        export_commitment_kwh: plan.monthlyCommitment
      });
      setLocalProfile(updated);
      onProfileUpdate?.(updated);
      setMessage('Export plan updated.');
      setIsChanging(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-stack">
      <DashboardCard eyebrow="Account" title="Profile and Export Plan">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-amber-50/60 via-white/80 to-orange-50/40 p-6 md:p-8 lg:col-span-2 shadow-sm backdrop-blur-md">
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl" />
            <h3 className="mb-4 flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-widest text-amber-800">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-200/80"></span>
              Profile details
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-200/80"></span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DetailField label="Username" value={user.username} />
              {localProfile?.device_id && <DetailField label="Connected device" value={localProfile.device_id} />}
              <DetailField className="sm:col-span-2" label="Email" value={user.email} />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-teal-50/60 via-white/80 to-emerald-50/30 p-6 md:p-8 lg:col-span-1 shadow-sm backdrop-blur-md">
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-teal-200/30 blur-3xl" />
            <h3 className="mb-4 flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-widest text-teal-800">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-teal-200/80"></span>
              Export plan details
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-teal-200/80"></span>
            </h3>
            <div className="flex flex-col gap-2">
              <DetailField label="Selected export plan" value={localProfile?.selected_export_plan || 'Not selected'} />
              <DetailField label="Export commitment" value={`${localProfile?.export_commitment_kwh || 0} kWh/month`} />
              <div className="flex items-center gap-4 mt-2 px-4 pb-2">
                <button className="primary-button shadow-[0_0_20px_rgba(20,184,166,0.2)] bg-gradient-to-br from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 border-none text-white transition-all hover:shadow-md hover:-translate-y-0.5" onClick={() => setIsChanging((current) => !current)} type="button">
                  Change Plan
                </button>
                {user.has_completed_onboarding && <StatusBadge tone="success">Onboarding complete</StatusBadge>}
              </div>
            </div>
          </div>
        </div>
        {message && <div className="success-message">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
      </DashboardCard>

      {isChanging && (
        <section className="package-grid">
          {packagePlans.prosumer.map((plan) => (
            <PackageCard
              key={plan.id}
              mode="prosumer"
              onSelect={changePlan}
              plan={plan}
              selected={localProfile?.export_commitment_kwh === plan.monthlyCommitment}
            />
          ))}
        </section>
      )}
    </div>
  );
}
