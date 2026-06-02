import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import DashboardCard from '../../components/DashboardCard';
import Modal from '../../components/Modal';
import PackageCard from '../../components/PackageCard';
import StatusBadge from '../../components/StatusBadge';
import { selectConsumerPackage } from '../../api/client';
import { packagePlans } from '../../data/mockData';

function DetailField({ label, value }) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-500">{label}</span>
      <strong className="block text-lg font-semibold text-slate-900">{value}</strong>
    </div>
  );
}

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
      <DashboardCard eyebrow="Account" title="Profile and Package">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-500">Profile details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DetailField label="Username" value={user.username} />
              <DetailField label="Email" value={user.email} />
              <DetailField label="Business name" value={localProfile?.business_name || 'Not set'} />
              <DetailField label="Business type" value={localProfile?.business_type || 'Not set'} />
            </div>
          </div>

          <div className="pt-8 md:pt-0 md:pl-8 lg:pl-12">
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-500">Package details</h3>
            <div className="flex flex-col gap-6">
              <DetailField label="Selected package" value={localProfile?.selected_package || 'Not selected'} />
              <DetailField label="Package allocation" value={`${localProfile?.package_allocation_kwh || 0} kWh/month`} />
              <div className="flex items-center gap-4 mt-4">
                <button className="primary-button" onClick={() => setIsChanging((current) => !current)} type="button">
                  Change Package
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
