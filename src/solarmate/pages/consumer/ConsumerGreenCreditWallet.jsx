import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Download, PlusCircle, WalletCards } from 'lucide-react';
import {
  getConsumerBilling,
  getConsumerStatement,
  getWallet,
  getWalletTransactions,
  payConsumerBill,
  topupWallet
} from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import SimulationInput from '../../components/SimulationInput';
import StatementModal from '../../components/StatementModal';
import StatusBadge from '../../components/StatusBadge';

function money(value) {
  return `RM${Number(value || 0).toFixed(2)}`;
}

function malaysiaDateTime(value) {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

const transactionColumns = [
  { key: 'created_at', label: 'Date', render: (row) => malaysiaDateTime(row.created_at) },
  { key: 'transaction_type', label: 'Type' },
  { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' }
];

export default function ConsumerGreenCreditWallet() {
  const [wallet, setWallet] = useState(null);
  const [bill, setBill] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState(100);
  const [statement, setStatement] = useState(null);
  const [resultModal, setResultModal] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadWallet() {
    const [walletData, billData, transactionData] = await Promise.all([
      getWallet(),
      getConsumerBilling(),
      getWalletTransactions()
    ]);
    setWallet(walletData);
    setBill(billData);
    setTransactions(transactionData);
  }

  useEffect(() => {
    let mounted = true;
    loadWallet()
      .then(() => mounted && setError(''))
      .catch((err) => mounted && setError(err.message || 'Unable to load energy wallet.'));
    return () => {
      mounted = false;
    };
  }, []);

  async function confirmTopup() {
    try {
      if (topupAmount <= 0) throw new Error('Top-up amount must be more than RM0.');
      const result = await topupWallet(Number(topupAmount));
      setMessage(result.message);
      setResultModal({
        tone: 'green',
        icon: CheckCircle2,
        title: 'Top Up Successful',
        description: 'Prototype wallet balance updated.',
        rows: [
          ['Top-up amount', money(topupAmount)],
          ['New wallet balance', money(result.balance)]
        ]
      });
      setTopupOpen(false);
      await loadWallet();
    } catch (err) {
      setError(err.message);
    }
  }

  async function payBill() {
    try {
      const result = await payConsumerBill();
      setMessage(result.message);
      setResultModal({
        tone: 'green',
        icon: CheckCircle2,
        title: result.payment_status === 'Paid' ? 'Payment Successful' : 'Bill Already Paid',
        description: 'Prototype wallet payment completed. No real payment gateway is connected.',
        rows: [
          ['Total bill', money(result.total_bill)],
          ['Wallet balance', money(result.balance)],
          ['Payment status', result.payment_status]
        ]
      });
      await loadWallet();
    } catch (err) {
      setResultModal({
        tone: 'gold',
        icon: WalletCards,
        title: 'Insufficient Wallet Balance',
        description: err.message || 'Please top up before paying this bill.',
        rows: [
          ['Current month bill', money(bill?.total_bill)],
          ['Wallet balance', money(wallet?.balance)]
        ]
      });
      setError(err.message);
    }
  }

  async function openStatement() {
    if (!bill) return;
    const data = await getConsumerStatement(bill.month);
    setStatement(data);
  }

  if (!wallet || !bill) {
    return <div className="auth-error">{error || 'Loading Energy Wallet...'}</div>;
  }

  const isPaid = bill.payment_status === 'Paid';
  const walletReady = wallet.balance >= bill.total_bill;
  const walletTone = isPaid ? 'success' : walletReady ? 'success' : 'warning';
  const walletLabel = isPaid ? 'Bill paid' : walletReady ? 'Ready to pay' : 'Top up needed';

  return (
    <div className="page-stack">
      <DashboardCard
        action={<StatusBadge tone={walletTone}>{walletLabel}</StatusBadge>}
        eyebrow="Energy Wallet"
        title="Wallet balance and bill payment"
      >
        {message && <div className="success-message">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        <div className="wallet-hero">
          <div className="wallet-balance-card green">
            <span>Wallet Balance</span>
            <strong>{money(wallet.balance)}</strong>
            <small>Prototype payment balance</small>
          </div>
          <div className="wallet-detail-grid">
            <div><span>Current Month Bill</span><strong>{money(bill.total_bill)}</strong></div>
            <div><span>Payment Status</span><strong>{bill.payment_status}</strong></div>
            <div><span>Green Credit Used</span><strong>{bill.green_credit_kwh.toLocaleString()} kWh</strong></div>
            <div><span>TNB Import</span><strong>{bill.tnb_import_kwh.toLocaleString()} kWh</strong></div>
            <div><span>Percentage Saved</span><strong>{bill.actual_saving_percentage.toFixed(2)}%</strong></div>
          </div>
        </div>
        <div className="action-row" style={{ marginTop: 16 }}>
          <button className="primary-button" onClick={() => setTopupOpen(true)} type="button">
            <PlusCircle size={17} /> Top Up
          </button>
          <button className="secondary-button" disabled={isPaid} onClick={payBill} type="button">
            <CreditCard size={17} /> Pay Bill
          </button>
          <button className="secondary-button" type="button" onClick={openStatement}>
            <Download size={16} /> Download Monthly Statement
          </button>
        </div>
      </DashboardCard>

      <DashboardCard eyebrow="Wallet history" title="Transactions">
        <DataTable columns={transactionColumns} rows={transactions} />
      </DashboardCard>

      <Modal
        open={topupOpen}
        onClose={() => setTopupOpen(false)}
        eyebrow="Top up"
        title="Top Up Energy Wallet"
        description="Prototype wallet top-up only. No real payment gateway is connected."
        tone="blue"
        icon={PlusCircle}
        primaryAction={{ label: 'Confirm Top Up', onClick: confirmTopup }}
        secondaryAction={{ label: 'Cancel', onClick: () => setTopupOpen(false) }}
      >
        <div className="action-row">
          {[50, 100, 200, 500].map((amount) => (
            <button className="secondary-button" key={amount} onClick={() => setTopupAmount(amount)} type="button">
              RM{amount}
            </button>
          ))}
        </div>
        <SimulationInput label="Top-up amount" onChange={setTopupAmount} suffix="RM" value={topupAmount} />
      </Modal>

      <StatementModal data={statement} onClose={() => setStatement(null)} open={Boolean(statement)} type="consumer" />

      <Modal
        open={Boolean(resultModal)}
        onClose={() => setResultModal(null)}
        eyebrow="Energy wallet"
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
