import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import DashboardCard from '../../components/DashboardCard';
import Modal from '../../components/Modal';
import PackageCard from '../../components/PackageCard';
import StatusBadge from '../../components/StatusBadge';
import { selectConsumerPackage } from '../../api/client';
import { packagePlans } from '../../data/mockData';

export default function ConsumerAccount({ onProfileUpdate, profile, user }) {
  const [localProfile, setLocalProfile] = useState(profile);
  const [isChanging, setIsChanging] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  async function changePackage(plan) {
    setMessage('');
    setError('');
    try {
      const updated = await selectConsumerPackage({
        selected_package: plan.name,
        package_allocation_kwh: plan.monthlyAllocation
      });
      setLocalProfile(updated);
      onProfileUpdate?.(updated);
      setMessage('Green energy package updated.');
      setIsChanging(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-stack">
      <DashboardCard eyebrow="Account" title="Manage Package">
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
            <span>Business name</span>
            <strong>{localProfile?.business_name || 'Not set'}</strong>
          </div>
          <div>
            <span>Business type</span>
            <strong>{localProfile?.business_type || 'Not set'}</strong>
          </div>
          <div>
            <span>Selected package</span>
            <strong>{localProfile?.selected_package || 'Not selected'}</strong>
          </div>
          <div>
            <span>Package allocation</span>
            <strong>{localProfile?.package_allocation_kwh || 0} kWh/month</strong>
          </div>
        </div>
        <div className="action-row" style={{ marginTop: 16 }}>
          <button className="primary-button" onClick={() => setIsChanging((current) => !current)} type="button">
            Change Package
          </button>
          {user.has_completed_onboarding && <StatusBadge tone="success">Onboarding complete</StatusBadge>}
        </div>
        {message && <div className="success-message">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
      </DashboardCard>

      {isChanging && (
        <section className="package-grid">
          {packagePlans.consumer.map((plan) => (
            <PackageCard
              key={plan.id}
              mode="consumer"
              onSelect={changePackage}
              plan={plan}
              selected={localProfile?.package_allocation_kwh === plan.monthlyAllocation}
            />
          ))}
        </section>
      )}

      <Modal
        open={Boolean(error)}
        onClose={() => setError('')}
        eyebrow="Package unavailable"
        title="Not Enough SolarMate Supply"
        description={error}
        tone="gold"
        icon={AlertCircle}
        primaryAction={{ label: 'Choose Another Package', onClick: () => setError('') }}
      />
    </div>
  );
}
