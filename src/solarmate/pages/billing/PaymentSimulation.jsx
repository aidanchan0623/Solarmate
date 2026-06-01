import { useState } from 'react';
import { CheckCircle2, CreditCard } from 'lucide-react';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';

export default function PaymentSimulation({
  bill,
  error,
  message,
  onPay,
  paymentStatus
}) {
  const [success, setSuccess] = useState(null);
  const [localError, setLocalError] = useState('');

  async function handlePay() {
    const wasPaid = paymentStatus === 'Paid';
    setLocalError('');
    try {
      await onPay?.();
    } catch (err) {
      setLocalError(err.message || 'Payment failed.');
      return;
    }
    if (!wasPaid && bill) {
      setSuccess({
        total: bill.totalPayable,
        credit: bill.creditedEnergy,
        savings: bill.savings
      });
    }
  }

  return (
    <DashboardCard eyebrow="Payment" title="Pay bill">
      <p className="microcopy">Prototype payment simulation only. No real payment gateway is connected.</p>
      <div className="payment-strip">
        <div>
          <span>Total payable</span>
          <strong>RM{bill.totalPayable.toFixed(2)}</strong>
        </div>
        <div>
          <span>Payment status</span>
          <StatusBadge tone={paymentStatus === 'Paid' ? 'success' : 'warning'}>{paymentStatus}</StatusBadge>
        </div>
      </div>

      <div className="action-row">
        <button className="primary-button" type="button" onClick={handlePay}>
          <CreditCard size={17} />
          Pay Bill
        </button>
      </div>
      {message && <div className="success-message">{message}</div>}
      {(error || localError) && <div className="auth-error">{error || localError}</div>}

      <Modal
        open={Boolean(success)}
        onClose={() => setSuccess(null)}
        eyebrow="Payment successful"
        title="Payment Successful"
        description="Prototype payment simulation only. Transaction record added for this session."
        tone="green"
        icon={CheckCircle2}
        position="upper"
        primaryAction={{ label: 'Done', onClick: () => setSuccess(null) }}
      >
        <div className="sm-modal-row">
          <span>Total paid</span>
          <strong>RM{(success?.total ?? 0).toFixed(2)}</strong>
        </div>
        <div className="sm-modal-row">
          <span>SolarMate green credit used</span>
          <strong>{success?.credit ?? 0} kWh</strong>
        </div>
        <div className="sm-modal-row">
          <span>Savings achieved</span>
          <strong style={{ color: '#0b6a42' }}>RM{(success?.savings ?? 0).toFixed(2)}</strong>
        </div>
      </Modal>
    </DashboardCard>
  );
}
