import { useEffect, useState } from 'react';
import { CheckCircle2, Download, WalletCards } from 'lucide-react';
import { cashoutWallet, getProsumerStatement, getProsumerWallet, getWallet, getWalletTransactions } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
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

export default function ProsumerEnergyWallet() {
  const [wallet, setWallet] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [statement, setStatement] = useState(null);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function loadWallet() {
    const [walletData, earningsData, transactionData] = await Promise.all([
      getWallet(),
      getProsumerWallet(),
      getWalletTransactions()
    ]);
    setWallet(walletData);
    setEarnings(earningsData);
    setTransactions(transactionData);
  }

  useEffect(() => {
    let mounted = true;
    loadWallet()
      .then(() => {
        if (mounted) setError('');
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Unable to load energy wallet.');
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function openStatement() {
    if (!earnings) return;
    setStatement(await getProsumerStatement(earnings.month));
  }

  async function confirmCashout() {
    try {
      const result = await cashoutWallet();
      setSuccess(result.message);
      setCashoutOpen(false);
      await loadWallet();
    } catch (err) {
      setError(err.message);
      setCashoutOpen(false);
    }
  }

  if (!wallet || !earnings) {
    return <div className="auth-error">{error || 'Loading SolarMate Energy Wallet...'}</div>;
  }

  const lifetimeEarnings = transactions
    .filter((row) => ['earning', 'solar_atap_settlement'].includes(row.transaction_type))
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="page-stack">
      <DashboardCard
        action={<StatusBadge tone={wallet.balance > 0 ? 'success' : 'warning'}>{wallet.balance > 0 ? 'Available' : 'Empty'}</StatusBadge>}
        eyebrow="SolarMate Energy Wallet"
        title="Verified export earnings"
      >
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
          <div className="relative flex w-full flex-col overflow-hidden rounded-[2rem] border border-emerald-400/30 bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-600 p-6 shadow-lg">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-300/50 blur-3xl mix-blend-screen" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-teal-300/50 blur-3xl mix-blend-screen" />

            <div className="relative flex flex-1 flex-col">
              <span className="block text-xs font-bold uppercase tracking-widest text-teal-50/90">Available Wallet Balance</span>
              <strong className="mt-2 text-5xl font-extrabold tracking-tight text-white drop-shadow-sm tabular-nums">{money(wallet.balance)}</strong>
              <small className="mt-2 text-sm font-semibold text-teal-100/90">Ready for cashout</small>
              
              <div className="mt-auto pt-6">
                <button className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/40 bg-white/20 px-5 py-2.5 font-bold text-white shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/30 hover:shadow-md" onClick={() => setCashoutOpen(true)} type="button">
                  <WalletCards size={18} /> Cash Out
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3">
            <div className="group flex items-center justify-between rounded-2xl border-2 border-white bg-gradient-to-br from-white via-teal-50/40 to-teal-100/60 px-5 py-4 shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-800 opacity-80">This Month Earnings</span>
              <strong className="text-xl font-bold tabular-nums tracking-tight text-teal-900">{money(earnings.total_earnings_this_month)}</strong>
            </div>
            <div className="group flex items-center justify-between rounded-2xl border-2 border-white bg-gradient-to-br from-white via-amber-50/40 to-amber-100/60 px-5 py-4 shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800 opacity-80">Pending Settlement</span>
              <strong className="text-xl font-bold tabular-nums tracking-tight text-amber-900">{money(earnings.pending_settlement)}</strong>
            </div>
            <div className="group flex items-center justify-between rounded-2xl border-2 border-white bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/60 px-5 py-4 shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 opacity-80">Total Lifetime Earnings</span>
              <strong className="text-xl font-bold tabular-nums tracking-tight text-emerald-900">{money(lifetimeEarnings || earnings.total_earnings_this_month)}</strong>
            </div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        action={
          <div className="action-row">
            <button className="secondary-button" type="button" onClick={openStatement}>
              <Download size={16} /> Download Monthly Statement
            </button>
          </div>
        }
        eyebrow="Wallet history"
        title="Transactions"
      >
        <DataTable columns={transactionColumns} rows={transactions} />
      </DashboardCard>

      <Modal
        open={cashoutOpen}
        onClose={() => setCashoutOpen(false)}
        eyebrow="Cashout"
        title="Confirm Cashout"
        description={wallet.balance > 0 ? 'Submit a prototype cashout request for your available balance.' : 'No balance available for cashout.'}
        tone="green"
        icon={WalletCards}
        primaryAction={wallet.balance > 0 ? { label: 'Confirm Cashout', onClick: confirmCashout } : { label: 'Close', onClick: () => setCashoutOpen(false) }}
        secondaryAction={wallet.balance > 0 ? { label: 'Cancel', onClick: () => setCashoutOpen(false) } : undefined}
      >
        <div className="sm-modal-row">
          <span>Available balance</span>
          <strong>{money(wallet.balance)}</strong>
        </div>
        <div className="sm-modal-row">
          <span>Cashout method</span>
          <strong>Bank Transfer</strong>
        </div>
        <div className="sm-modal-row">
          <span>Estimated processing time</span>
          <strong>1-3 working days</strong>
        </div>
      </Modal>

      <Modal
        open={Boolean(success)}
        onClose={() => setSuccess('')}
        eyebrow="Wallet updated"
        title={success || 'Wallet updated'}
        description="Prototype wallet transaction recorded."
        tone="green"
        icon={CheckCircle2}
        primaryAction={{ label: 'Done', onClick: () => setSuccess('') }}
      />

      <StatementModal data={statement} onClose={() => setStatement(null)} open={Boolean(statement)} type="prosumer" />
    </div>
  );
}
