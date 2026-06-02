import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, Search, Trash2 } from 'lucide-react';
import DashboardCard from '../../components/DashboardCard';
import {
  deleteAdminUser,
  disableAdminUser,
  enableAdminUser,
  getAdminUsers
} from '../../api/client';
import StyledSelect from '../../components/StyledSelect';

function malaysiaDate(value) {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium'
  }).format(new Date(value));
}

export default function AdminUsers({ user }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const statusBadgeClass = (status) => {
    if (status === 'active') {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
    if (status === 'disabled') {
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
    return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
  };

  const avatarClass = (role) => {
    if (role === 'consumer') {
      return 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.14)]';
    }
    if (role === 'prosumer') {
      return 'bg-teal-500/10 border-teal-500/20 text-teal-400 shadow-[0_0_18px_rgba(20,184,166,0.14)]';
    }
    return 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.14)]';
  };

  const roleBadgeClass = (role) => {
    if (role === 'consumer') {
      return 'inline-flex px-2 py-0.5 rounded text-[11px] font-medium tracking-wider uppercase bg-slate-800 text-blue-400 border border-blue-500/10';
    }
    if (role === 'prosumer') {
      return 'inline-flex px-2 py-0.5 rounded text-[11px] font-medium tracking-wider uppercase bg-slate-800 text-teal-400 border border-teal-500/10';
    }
    return 'inline-flex px-2 py-0.5 rounded text-[11px] font-medium tracking-wider uppercase bg-slate-800 text-purple-400 border border-purple-500/10';
  };

  const initialsFor = (username = '') => {
    const cleanName = username.trim();
    return (cleanName.slice(0, 2) || 'US').toUpperCase();
  };

  const controlClass = 'w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 placeholder:text-slate-500';
  const filteredRows = rows.filter((row) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || String(row.id).toLowerCase().includes(query)
      || row.username?.toLowerCase().includes(query)
      || row.email?.toLowerCase().includes(query);
    const matchesRole = roleFilter === 'all' || row.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <DashboardCard eyebrow="User registry" title="Prosumers, consumers, and admins">
      {loading && <p className="microcopy">Loading users from backend...</p>}
      {message && <div className="success-message">{message}</div>}
      {error && <div className="auth-error">{error}</div>}
      {!loading && !error && (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={16}
              />
              <input
                className={`${controlClass} pl-10`}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search users by ID, username, or email..."
                type="search"
                value={searchQuery}
              />
            </div>
            <StyledSelect
              className="md:w-44"
              onChange={(val) => setRoleFilter(val)}
              options={[
                { value: 'all', label: 'All roles' },
                { value: 'consumer', label: 'Consumer' },
                { value: 'prosumer', label: 'Prosumer' },
                { value: 'admin', label: 'Admin' },
              ]}
              value={roleFilter}
              variant="dark"
            />
            <StyledSelect
              className="md:w-44"
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'disabled', label: 'Disabled' },
                { value: 'pending', label: 'Pending' },
              ]}
              value={statusFilter}
              variant="dark"
            />
          </div>

          <div className="w-full overflow-x-auto rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-md">
            <table className="w-full min-w-[1040px] border-collapse text-left">
              <thead>
                <tr className="text-xs font-semibold tracking-wider text-slate-400 uppercase border-b border-white/10 pb-3">
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Onboarding</th>
                  <th className="py-4 px-6">Plan/Package</th>
                  <th className="py-4 px-6">Device</th>
                  <th className="py-4 px-6">Joined Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const isSelf = row.id === user?.id;
                  const isActive = row.status === 'active';
                  const onboarding = row.has_completed_onboarding ? 'Complete' : 'Pending';

                  return (
                    <tr
                      className="border-b border-white/5 hover:bg-slate-800/40 transition-colors"
                      key={row.id}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full border flex items-center justify-center text-xs font-bold tracking-wider ${avatarClass(row.role)}`}>
                            {initialsFor(row.username)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-100 font-medium text-sm truncate">
                              {row.username}
                            </p>
                            <p className="text-slate-500 text-xs truncate">
                              ID {row.id} - {row.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={roleBadgeClass(row.role)}>{row.role}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-sm">{onboarding}</td>
                      <td className="py-4 px-6 text-slate-300 text-sm">
                        {row.selected_plan_package || '-'}
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-sm">
                        <span>{row.device_id || '-'}</span>
                        {row.device_status && (
                          <span className="block text-xs text-slate-500">{row.device_status}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-sm">
                        {malaysiaDate(row.created_at)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          {isActive ? (
                            <button
                              aria-label="Disable user"
                              className="admin-user-action-disable p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSelf}
                              onClick={() => mutate(disableAdminUser, row.id, 'User disabled.')}
                              type="button"
                            >
                              <Ban size={16} />
                            </button>
                          ) : (
                            <button
                              aria-label="Enable user"
                              className="p-2 text-slate-500 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => mutate(enableAdminUser, row.id, 'User enabled.')}
                              type="button"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          <button
                            aria-label="Delete user"
                            className="admin-user-action-delete p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={isSelf}
                            onClick={() => mutate(deleteAdminUser, row.id, 'User deleted.')}
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredRows.length && (
              <div className="border-t border-white/5 px-6 py-8 text-center text-sm text-slate-500">
                No users match the current filters.
              </div>
            )}
          </div>
        </>
      )}
    </DashboardCard>
  );
}
