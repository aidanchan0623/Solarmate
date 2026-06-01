import { Leaf, SunMedium } from 'lucide-react';
import { useState } from 'react';
import Modal from './Modal';
import { packagePlans } from '../data/mockData';
import { selectConsumerPackage, selectProsumerPlan } from '../api/client';

export default function OnboardingModal({ user, open, onComplete, onLogout }) {
  const plans = user?.role === 'prosumer' ? packagePlans.prosumer : packagePlans.consumer;
  const [selected, setSelected] = useState(plans?.[1]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user || !plans) return null;

  async function submit() {
    setError('');
    setSaving(true);
    try {
      const profile =
        user.role === 'prosumer'
          ? await selectProsumerPlan({
              selected_export_plan: selected.name,
              export_commitment_kwh: selected.monthlyCommitment
            })
          : await selectConsumerPackage({
              selected_package: selected.name,
              package_allocation_kwh: selected.monthlyAllocation
            });
      onComplete?.(profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const isProsumer = user.role === 'prosumer';

  return (
    <Modal
      open={open}
      onClose={() => {}}
      eyebrow="First-time setup"
      title={isProsumer ? 'Choose Your Export Plan' : 'Choose Your Green Energy Package'}
      description={
        isProsumer
          ? 'Select the monthly export commitment for this prosumer account.'
          : 'Select the monthly green energy package for this consumer account.'
      }
      tone={isProsumer ? 'gold' : 'teal'}
      icon={isProsumer ? SunMedium : Leaf}
      primaryAction={{ label: saving ? 'Saving...' : 'Save Selection', onClick: submit }}
      secondaryAction={{ label: 'Logout', onClick: onLogout }}
    >
      <div className="onboarding-options">
        {plans.map((plan) => {
          const amount = isProsumer ? plan.monthlyCommitment : plan.monthlyAllocation;
          return (
            <button
              className={selected?.id === plan.id ? 'selected' : ''}
              key={plan.id}
              onClick={() => setSelected(plan)}
              type="button"
            >
              <strong>{plan.name}</strong>
              <span>{amount.toLocaleString()} kWh/month</span>
            </button>
          );
        })}
      </div>
      {error && <div className="auth-error">{error}</div>}
    </Modal>
  );
}
