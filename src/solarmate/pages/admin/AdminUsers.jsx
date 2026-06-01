import { useEffect, useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';
import {
  deleteAdminUser,
  disableAdminUser,
  enableAdminUser,
  getAdminUsers
} from '../../api/client';

export default function AdminUsers({ user }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      setRows(await getAdminUsers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function mutate(action, userId, successMessage) {
    setError('');
    setMessage('');
    try {
      await action(userId);
      setMessage(successMessage);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  const columns = [
    { key: 'id', label: 'User ID' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    {
      key: 'has_completed_onboarding',
      label: 'Onboarding',
      render: (row) => (row.has_completed_onboarding ? 'Complete' : 'Pending')
    },
    {
      key: 'selected_plan_package',
      label: 'Plan/Package',
      render: (row) => row.selected_plan_package || '-'
    },
    {
      key: 'device_id',
      label: 'Device',
      render: (row) => row.device_id || '-'
    },
    {
      key: 'device_status',
      label: 'Device Status',
      render: (row) => row.device_status || '-'
    },
    {
      key: 'created_at',
      label: 'Joined Date',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        const isSelf = row.id === user?.id;
        return (
          <div className="table-actions">
            {row.status === 'active' ? (
              <button
                className="secondary-button"
                disabled={isSelf}
                onClick={() => mutate(disableAdminUser, row.id, 'User disabled.')}
                type="button"
              >
                Disable
              </button>
            ) : (
              <button
                className="secondary-button"
                onClick={() => mutate(enableAdminUser, row.id, 'User enabled.')}
                type="button"
              >
                Enable
              </button>
            )}
            <button
              className="secondary-button danger-button"
              disabled={isSelf}
              onClick={() => mutate(deleteAdminUser, row.id, 'User deleted.')}
              type="button"
            >
              Delete
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <DashboardCard eyebrow="User registry" title="Prosumers, consumers, and admins">
      {loading && <p className="microcopy">Loading users from backend...</p>}
      {message && <div className="success-message">{message}</div>}
      {error && <div className="auth-error">{error}</div>}
      {!loading && !error && <DataTable columns={columns} rows={rows} />}
    </DashboardCard>
  );
}
