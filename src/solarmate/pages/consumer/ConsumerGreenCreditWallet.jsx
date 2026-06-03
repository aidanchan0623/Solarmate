import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Download, PiggyBank, PlusCircle, Receipt, WalletCards } from 'lucide-react';
import {
  getConsumerBilling,
  getConsumerMonthlyUsageHistory,
  getConsumerStatement,
  getWallet,
  getWalletTransactions,
  payConsumerBill,
  topupWallet
} from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import Modal from '../../components/Modal';
import SimulationInput from '../../components/SimulationInput';
import StatementModal from '../../components/StatementModal';
import StatusBadge from '../../components/StatusBadge';
import { TNB_PEAK_TOTAL_RATE } from '../../utils/calculations';

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

function WalletMetricCard({ label, value, detail, className = '', tone = 'emerald', icon: Icon }) {
  const tones = {
    blue: {
      shell: 'from-blue-50/80 via-white to-blue-50/50 border-blue-200/60 shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:shadow-md transition-all duration-300',
      icon: 'bg-blue-100/90 text-blue-600 shadow-sm',
      label: 'text-blue-800',
      value: 'text-blue-950',
      glow: 'bg-blue-300/40'
    },
    emerald: {
      shell: 'from-emerald-50/80 via-white to-emerald-50/50 border-emerald-200/60 shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:shadow-md transition-all duration-300',
      icon: 'bg-emerald-100/90 text-emerald-600 shadow-sm',
      label: 'text-emerald-800',
      value: 'text-emerald-950',
      glow: 'bg-emerald-300/40'
    },
    amber: {
      shell: 'from-amber-50/80 via-white to-amber-50/50 border-amber-200/60 shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:shadow-md transition-all duration-300',
      icon: 'bg-amber-100/90 text-amber-600 shadow-sm',
      label: 'text-amber-800',
      value: 'text-amber-950',
      glow: 'bg-amber-300/40'
    },
    sky: {
      shell: 'from-sky-50/80 via-white to-sky-50/50 border-sky-200/60 shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:shadow-md transition-all duration-300',
      icon: 'bg-sky-100/90 text-sky-600 shadow-sm',
      label: 'text-sky-800',
      value: 'text-sky-950',
      glow: 'bg-sky-300/40'
    }
  };
  const theme = tones[tone] || tones.emerald;

  return (
    <div className={`group relative overflow-hidden flex flex-col rounded-2xl border bg-gradient-to-br ${theme.shell} p-5 ${className}`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${theme.glow}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={`text-[10px] font-extrabold uppercase tracking-widest ${theme.label}`}>{label}</span>
          <strong className={`mt-2 block text-3xl font-bold tracking-tight tabular-nums ${theme.value}`}>{value}</strong>
          {detail && <span className={`mt-1.5 block text-xs font-semibold ${theme.label} opacity-80`}>{detail}</span>}
        </div>
        {Icon && (
          <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${theme.icon}`}>
            <Icon size={20} strokeWidth={2.5} />
          </span>
        )}
      </div>
    </div>
  );
}

function WalletStatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  const isSuccessful = ['paid', 'successful', 'settled'].includes(normalized);
  const isPending = normalized === 'pending';

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
      isSuccessful
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : isPending
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-sky-200 bg-sky-50 text-sky-700'
    }`}>
      {status}
    </span>
  );
}

function WalletTransactionTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_-42px_rgba(15,23,42,0.45)]">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-200">
            <th className="px-5 py-4">Date</th>
            <th className="px-5 py-4">Type</th>
            <th className="px-5 py-4">Amount</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-slate-100 transition-colors hover:bg-slate-50" key={row.id || `${row.created_at}-${row.transaction_type}`}>
              <td className="px-5 py-4 text-sm font-medium text-slate-500">{malaysiaDateTime(row.created_at)}</td>
              <td className="px-5 py-4 text-sm font-semibold capitalize text-slate-800">{String(row.transaction_type || '').replace('_', ' ')}</td>
              <td className="px-5 py-4 text-sm font-bold text-slate-900 tabular-nums">{money(row.amount)}</td>
              <td className="px-5 py-4"><WalletStatusBadge status={row.status} /></td>
              <td className="px-5 py-4 text-sm text-slate-500">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ConsumerGreenCreditWallet({ consumer }) {
  const [wallet, setWallet] = useState(null);
  const [bill, setBill] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState(100);
  const [statement, setStatement] = useState(null);
  const [resultModal, setResultModal] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadWallet() {
    const [walletData, billData, transactionData, monthlyData] = await Promise.all([
      getWallet(),
      getConsumerBilling(),
      getWalletTransactions(),
      getConsumerMonthlyUsageHistory()
    ]);
    setWallet(walletData);
    setBill(billData);
    setTransactions(transactionData);
    setMonthlyRows(monthlyData);
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
  const lastPayment = transactions.find((row) => {
    const type = String(row.transaction_type || '').toLowerCase();
    const status = String(row.status || '').toLowerCase();
    return type.includes('bill') && ['paid', 'successful', 'settled'].includes(status);
  });
  const lifetimeSavings = monthlyRows.reduce((sum, row) => {
    const tnbOnlyBill = Number(row.total_usage_kwh || 0) * TNB_PEAK_TOTAL_RATE;
    return sum + Math.max(tnbOnlyBill - Number(row.total_bill || 0), 0);
  }, 0);

  return (
    <div className="page-stack">
      <DashboardCard
        action={<StatusBadge tone={walletTone}>{walletLabel}</StatusBadge>}
        eyebrow="Energy Wallet"
        title={consumer?.name || 'Consumer Demo Cafe'}
      >
        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}
        {error && <div className="auth-error">{error}</div>}
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.35fr]">
          <div className="relative overflow-hidden rounded-2xl border border-teal-300/30 bg-gradient-to-br from-teal-900 via-cyan-950 to-emerald-900 p-6 shadow-[0_24px_70px_-44px_rgba(13,148,136,0.85)]">
            <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-emerald-300/24 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-28 w-28 rounded-full bg-cyan-300/14 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-slate-400 text-sm font-medium">Wallet Balance</span>
                  <strong className="mt-3 block text-4xl font-bold tracking-tight text-white tabular-nums">
                    {money(wallet.balance)}
                  </strong>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.18)]">
                  <WalletCards size={20} />
                </span>
              </div>
              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-400">Current bill</span>
                  <strong className="text-lg font-bold text-white tabular-nums">{money(bill.total_bill)}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-400">Status</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {bill.payment_status}
                  </span>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  className="px-4 py-2 bg-emerald-400 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(52,211,153,0.22)] hover:bg-emerald-500 transition-colors flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isPaid}
                  onClick={payBill}
                  type="button"
                >
                  <CreditCard size={17} /> Pay Bill
                </button>
                <button
                  className="px-4 py-2 bg-white/10 text-slate-100 font-medium rounded-lg border border-white/15 hover:bg-white/15 transition-colors flex items-center gap-2"
                  onClick={() => setTopupOpen(true)}
                  type="button"
                >
                  <PlusCircle size={17} /> Top Up
                </button>
                <button
                  className="px-4 py-2 bg-white/10 text-slate-100 font-medium rounded-lg border border-white/15 hover:bg-white/15 transition-colors flex items-center gap-2"
                  type="button"
                  onClick={openStatement}
                >
                  <Download size={16} /> Statement
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <WalletMetricCard
              detail={lastPayment ? `Paid on ${malaysiaDateTime(lastPayment.created_at)}` : 'No completed bill payment found'}
              icon={Receipt}
              label="Last Payment"
              tone="blue"
              value={lastPayment ? money(lastPayment.amount) : 'No payment yet'}
            />
            <WalletMetricCard
              icon={PiggyBank}
              label="Total Lifetime Savings"
              tone="sky"
              value={money(lifetimeSavings)}
            />
          </div>
        </div>
      </DashboardCard>

      <DashboardCard eyebrow="Wallet history" title="Transactions">
        <WalletTransactionTable rows={transactions} />
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
