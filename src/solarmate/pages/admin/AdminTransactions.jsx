import { useEffect, useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';
import { getAdminWalletTransactions } from '../../api/client';

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

const columns = [
  { key: 'id', label: 'Transaction ID' },
  { key: 'created_at', label: 'Date', render: (row) => malaysiaDateTime(row.created_at) },
  { key: 'username', label: 'User' },
  { key: 'role', label: 'Role' },
  { key: 'transaction_type', label: 'Type' },
  { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' }
];

export default function AdminTransactions() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getAdminWalletTransactions()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardCard eyebrow="Payment audit" title="Wallet transactions and settlements">
      {error && <div className="auth-error">{error}</div>}
      <DataTable columns={columns} rows={rows} />
    </DashboardCard>
  );
}
