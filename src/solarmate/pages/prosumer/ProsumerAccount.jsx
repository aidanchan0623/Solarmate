import { useEffect, useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import PackageCard from '../../components/PackageCard';
import StatusBadge from '../../components/StatusBadge';
import { selectProsumerPlan } from '../../api/client';
import { packagePlans } from '../../data/mockData';

function DetailField({ label, value }) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-500">{label}</span>
      <strong className="block text-lg font-semibold text-slate-900">{value}</strong>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-500">Profile details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DetailField label="Username" value={user.username} />
              <DetailField label="Email" value={user.email} />
              {localProfile?.device_id && <DetailField label="Connected device" value={localProfile.device_id} />}
            </div>
          </div>

          <div className="pt-8 md:pt-0 md:pl-8 lg:pl-12">
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-500">Export plan details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DetailField label="Selected export plan" value={localProfile?.selected_export_plan || 'Not selected'} />
              <DetailField label="Export commitment" value={`${localProfile?.export_commitment_kwh || 0} kWh/month`} />
              <div className="sm:col-span-2 flex items-center gap-4 mt-4">
                <button className="primary-button" onClick={() => setIsChanging((current) => !current)} type="button">
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
