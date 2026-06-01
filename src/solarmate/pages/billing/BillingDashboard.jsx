import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Receipt, WalletCards } from 'lucide-react';
import { getConsumerBilling, payConsumerBill } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { SOLARMATE_RATE, TNB_PEAK_TOTAL_RATE } from '../../utils/calculations';

function money(value) {
  return `RM${Number(value || 0).toFixed(2)}`;
}

function mapBillingResponse(data) {
  if (!data) return null;
  return {
    month: data.month,
    totalUsage: data.total_usage_kwh,
    creditedEnergy: data.green_credit_kwh,
    importedEnergy: data.tnb_import_kwh,
    solarMatePortion: data.solar_mate_amount,
    tnbImportPortion: data.tnb_import_amount,
    retailCharge: data.retail_charge,
    totalPayable: data.total_bill,
    tnbOnlyBill: data.tnb_only_bill,
    savings: data.savings,
    savingsPercentage: data.actual_saving_percentage,
    paymentStatus: data.payment_status || 'Pending'
  };
}

export default function BillingDashboard() {
  const [bill, setBill] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resultModal, setResultModal] = useState(null);
  const [error, setError] = useState('');

  async function loadBill() {
    const data = await getConsumerBilling();
    setBill(mapBillingResponse(data));
    setError('');
    return data;
  }

  useEffect(() => {
    let mounted = true;
    loadBill().catch((err) => {
      if (!mounted) return;
      setError(err.message || 'Unable to load billing data from backend.');
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function handlePayBill() {
    if (!bill) return;
    if (bill.paymentStatus === 'Paid') {
      setResultModal({
        tone: 'green',
        icon: CheckCircle2,
        title: 'Bill Already Paid',
        description: 'This month\'s SolarMate bill is already marked as paid.',
        rows: [
          ['Payment status', 'Paid'],
          ['Total bill', money(bill.totalPayable)]
        ]
      });
      return;
    }

    try {
      const result = await payConsumerBill();
      await loadBill();
      setResultModal({
        tone: 'green',
        icon: CheckCircle2,
        title: 'Payment Successful',
        description: 'Prototype wallet payment completed. No real payment gateway is connected.',
        rows: [
          ['Total paid', money(result.total_bill)],
          ['Remaining wallet balance', money(result.balance)],
          ['Payment status', result.payment_status]
        ]
      });
    } catch (err) {
      setResultModal({
        tone: 'gold',
        icon: WalletCards,
        title: 'Insufficient Wallet Balance',
        description: err.message || 'Please top up your Energy Wallet before paying this bill.',
        rows: [
          ['Total bill', money(bill.totalPayable)],
          ['Payment status', bill.paymentStatus]
        ]
      });
    }
  }

  if (!bill) {
    return (
      <div className="page-stack">
        <div className="auth-error">{error || 'Loading bill calculated from this month\'s usage records...'}</div>
      </div>
    );
  }

  const details = [
    ['SolarMate green energy', `${bill.creditedEnergy.toLocaleString()} kWh x RM${SOLARMATE_RATE.toFixed(2)}/kWh`, money(bill.solarMatePortion)],
    ['TNB imported energy', `${bill.importedEnergy.toLocaleString()} kWh x RM${TNB_PEAK_TOTAL_RATE.toFixed(4)}/kWh`, money(bill.tnbImportPortion)],
    ['TNB retail charge', 'Fixed monthly charge', money(bill.retailCharge)],
    ['Total bill', 'SolarMate + TNB import + retail', money(bill.totalPayable)],
    ['TNB-only comparison', `${bill.totalUsage.toLocaleString()} kWh at peak tariff + retail`, money(bill.tnbOnlyBill)]
  ];

  return (
    <div className="page-stack">
      {error && <div className="auth-error">{error}</div>}
      <DashboardCard eyebrow="Billing & payment" title="Pay Your Blended Energy Bill">
        <p className="microcopy">Payment uses your prototype Energy Wallet balance. Bill values come from this month&apos;s usage records.</p>
        <div className="billing-payment-focus">
          <div className="wallet-balance-card green">
            <span>Total Bill</span>
            <strong>{money(bill.totalPayable)}</strong>
            <small>{bill.month}</small>
          </div>
          <div className="wallet-detail-grid">
            <div><span>Payment Status</span><strong><StatusBadge tone={bill.paymentStatus === 'Paid' ? 'success' : 'warning'}>{bill.paymentStatus}</StatusBadge></strong></div>
            <div><span>Total Usage</span><strong>{bill.totalUsage.toLocaleString()} kWh</strong></div>
            <div><span>Green Credit</span><strong>{bill.creditedEnergy.toLocaleString()} kWh</strong></div>
            <div><span>Percentage Saved</span><strong>{bill.savingsPercentage.toFixed(2)}%</strong></div>
          </div>
        </div>
        <div className="action-row" style={{ marginTop: 16 }}>
          <button className="primary-button" disabled={bill.paymentStatus === 'Paid'} onClick={handlePayBill} type="button">
            <CreditCard size={17} /> Pay Bill
          </button>
          <button className="secondary-button" onClick={() => setDetailsOpen(true)} type="button">
            <Receipt size={17} /> View Bill Details
          </button>
        </div>
      </DashboardCard>

      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        eyebrow="Bill details"
        title="Blended bill calculation"
        description="Detailed tariff calculation is hidden by default to keep the payment page simple."
        tone="blue"
        icon={Receipt}
        primaryAction={{ label: 'Close', onClick: () => setDetailsOpen(false) }}
      >
        <div className="bill-detail-list">
          {details.map(([label, note, amount]) => (
            <div className="sm-modal-row" key={label}>
              <span>
                {label}
                <small>{note}</small>
              </span>
              <strong>{amount}</strong>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={Boolean(resultModal)}
        onClose={() => setResultModal(null)}
        eyebrow="Wallet payment"
        title={resultModal?.title}
        description={resultModal?.description}
        tone={resultModal?.tone || 'teal'}
        icon={resultModal?.icon || CheckCircle2}
        position="upper"
        primaryAction={{ label: 'Done', onClick: () => setResultModal(null) }}
      >
        <div className="bill-detail-list">
          {(resultModal?.rows || []).map(([label, value]) => (
            <div className="sm-modal-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
