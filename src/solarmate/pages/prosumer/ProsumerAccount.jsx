import { useEffect, useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import PackageCard from '../../components/PackageCard';
import StatusBadge from '../../components/StatusBadge';
import { selectProsumerPlan } from '../../api/client';
import { packagePlans } from '../../data/mockData';

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
      <DashboardCard eyebrow="Account" title="Manage Export Plan">
        <div className="account-summary-grid">
          <div>
            <span>Username</span>
            <strong>{user.username}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>
          <div>
            <span>Selected export plan</span>
            <strong>{localProfile?.selected_export_plan || 'Not selected'}</strong>
          </div>
          <div>
            <span>Export commitment</span>
            <strong>{localProfile?.export_commitment_kwh || 0} kWh/month</strong>
          </div>
          {localProfile?.device_id && (
            <div>
              <span>Connected device</span>
              <strong>{localProfile.device_id}</strong>
            </div>
          )}
        </div>
        <div className="action-row" style={{ marginTop: 16 }}>
          <button className="primary-button" onClick={() => setIsChanging((current) => !current)} type="button">
            Change Plan
          </button>
          {user.has_completed_onboarding && <StatusBadge tone="success">Onboarding complete</StatusBadge>}
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
