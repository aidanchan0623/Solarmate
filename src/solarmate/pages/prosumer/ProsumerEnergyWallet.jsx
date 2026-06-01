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

const transactionColumns = [
  { key: 'created_at', label: 'Date', render: (row) => new Date(row.created_at).toLocaleString() },
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
        <div className="wallet-hero">
          <div className="wallet-balance-card">
            <span>Available Wallet Balance</span>
            <strong>{money(wallet.balance)}</strong>
            <small>Ready for cashout</small>
          </div>
          <div className="wallet-detail-grid">
            <div><span>This Month Earnings</span><strong>{money(earnings.total_earnings_this_month)}</strong></div>
            <div><span>Pending Settlement</span><strong>{money(earnings.pending_settlement)}</strong></div>
            <div><span>Total Lifetime Earnings</span><strong>{money(lifetimeEarnings || earnings.total_earnings_this_month)}</strong></div>
            <div><span>Cashout Status</span><strong>{wallet.balance > 0 ? 'Available' : 'No balance'}</strong></div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        action={
          <div className="action-row">
            <button className="secondary-button" type="button" onClick={openStatement}>
              <Download size={16} /> Download Monthly Statement
            </button>
            <button className="primary-button" onClick={() => setCashoutOpen(true)} type="button">
              <WalletCards size={17} /> Cash Out
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
