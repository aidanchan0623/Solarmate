import { useEffect, useMemo, useRef, useState } from 'react';
import { Ban, CheckCircle2, Search, Trash2 } from 'lucide-react';
import DashboardCard from '../../components/DashboardCard';
import {
  deleteAdminUser,
  disableAdminUser,
  enableAdminUser,
  getAdminUsers
} from '../../api/client';
import StyledSelect from '../../components/StyledSelect';

const ADMIN_USERS_CACHE_KEY = 'solarmate-admin-users';
const PAGE_SIZE = 25;
let adminUsersCache = null;

function readUsersCache() {
  if (adminUsersCache?.length) return adminUsersCache;
  if (typeof window === 'undefined') return [];

  try {
    const cached = JSON.parse(window.sessionStorage.getItem(ADMIN_USERS_CACHE_KEY) || '[]');
    adminUsersCache = Array.isArray(cached) ? cached : [];
    return adminUsersCache;
  } catch {
    return [];
  }
}

function writeUsersCache(rows) {
  if (!Array.isArray(rows)) return;
  adminUsersCache = rows;

  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ADMIN_USERS_CACHE_KEY, JSON.stringify(rows));
  } catch {
    // Memory cache still keeps this page fast in the current tab.
  }
}

function malaysiaDate(value) {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium'
  }).format(new Date(value));
}

export default function AdminUsers({ user }) {
  const [rows, setRows] = useState(() => readUsersCache());
  const [loading, setLoading] = useState(() => readUsersCache().length === 0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pendingDeleteRef = useRef(null);

  async function loadUsers({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const users = await getAdminUsers();
      setRows(users);
      writeUsersCache(users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers({ silent: rows.length > 0 });
    return () => {
      const pending = pendingDeleteRef.current;
      if (pending?.timeoutId) {
        window.clearTimeout(pending.timeoutId);
        deleteAdminUser(pending.row.id).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, searchQuery, statusFilter]);

  useEffect(() => {
    if (!message || pendingDeleteRef.current) return undefined;
    const timeoutId = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  async function mutate(action, userId, successMessage) {
    setError('');
    setMessage('');
    try {
      await action(userId);
      setMessage(successMessage);
      await loadUsers({ silent: true });
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDeleteUser(row) {
    if (pendingDeleteRef.current?.timeoutId) {
      window.clearTimeout(pendingDeleteRef.current.timeoutId);
    }

    const previousRows = rows;
    const nextRows = rows.filter((item) => item.id !== row.id);
    setRows(nextRows);
    writeUsersCache(nextRows);
    setError('');
    setMessage(`${row.username} will be deleted.`);

    const timeoutId = window.setTimeout(async () => {
      pendingDeleteRef.current = null;
      try {
        await deleteAdminUser(row.id);
        setMessage('User deleted.');
        window.setTimeout(() => setMessage(''), 3000);
      } catch (err) {
        setRows(previousRows);
        writeUsersCache(previousRows);
        setError(err.message);
        setMessage('');
      }
    }, 5000);

    pendingDeleteRef.current = {
      row,
      previousRows,
      timeoutId
    };
  }

  function undoDeleteUser() {
    const pending = pendingDeleteRef.current;
    if (!pending) return;

    window.clearTimeout(pending.timeoutId);
    pendingDeleteRef.current = null;
    setRows(pending.previousRows);
    writeUsersCache(pending.previousRows);
    setMessage('Delete cancelled.');
    window.setTimeout(() => setMessage(''), 2500);
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
  const filteredRows = useMemo(() => rows.filter((row) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || String(row.id).toLowerCase().includes(query)
      || row.username?.toLowerCase().includes(query)
      || row.email?.toLowerCase().includes(query);
    const matchesRole = roleFilter === 'all' || row.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  }), [roleFilter, rows, searchQuery, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRows]);
  const visibleStart = filteredRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const visibleEnd = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  return (
    <DashboardCard eyebrow="User registry" title="Prosumers, consumers, and admins">
      {loading && !rows.length && <p className="microcopy">Loading users from backend...</p>}
      {message && (
        <div className="success-message flex items-center justify-between gap-4">
          <span>{message}</span>
          {pendingDeleteRef.current && (
            <button
              className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-sm font-bold text-emerald-100 hover:bg-emerald-300/20"
              onClick={undoDeleteUser}
              type="button"
            >
              Undo
            </button>
          )}
        </div>
      )}
      {error && <div className="auth-error">{error}</div>}
      {!!rows.length && !error && (
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

          <div className="premium-scrollbar w-full overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70 [contain:paint]">
            <table className="w-full min-w-[1320px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[380px]" />
                <col className="w-[150px]" />
                <col className="w-[128px]" />
                <col className="w-[170px]" />
                <col className="w-[220px]" />
                <col className="w-[150px]" />
                <col className="w-[170px]" />
                <col className="w-[140px]" />
              </colgroup>
              <thead>
                <tr className="text-xs font-semibold tracking-wider text-slate-400 uppercase border-b border-white/10 pb-3">
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Onboarding</th>
                  <th className="py-4 px-6">Plan/Package</th>
                  <th className="py-4 px-6">Device</th>
                  <th className="py-4 px-6">Joined Date</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => {
                  const isSelf = row.id === user?.id;
                  const isActive = row.status === 'active';
                  const onboarding = row.has_completed_onboarding ? 'Complete' : 'Pending';

                  return (
                    <tr className="border-b border-white/5 hover:bg-slate-800/25" key={row.id}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold tracking-wider ${avatarClass(row.role)}`}>
                            {initialsFor(row.username)}
                          </div>
                          <div className="min-w-0">
                            <p className="!text-white font-bold text-sm truncate">
                              {row.username}
                            </p>
                            <p className="!text-slate-200 text-xs truncate">
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
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center justify-center gap-3">
                          {isActive ? (
                            <div className="group/action relative">
                              <button
                                aria-label="Disable user"
                                className="admin-user-action-disable p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={isSelf}
                                onClick={() => mutate(disableAdminUser, row.id, 'User disabled.')}
                                type="button"
                              >
                                <Ban size={16} />
                              </button>
                              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-md border border-yellow-400/20 bg-slate-950 px-2 py-1 text-xs font-semibold text-yellow-300 opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100">
                                Disable
                              </span>
                            </div>
                          ) : (
                            <button
                              aria-label="Enable user"
                              className="p-2 text-slate-500 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => mutate(enableAdminUser, row.id, 'User enabled.')}
                              type="button"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          <div className="group/action relative">
                            <button
                              aria-label="Delete user"
                              className="admin-user-action-delete p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSelf}
                              onClick={() => handleDeleteUser(row)}
                              type="button"
                            >
                              <Trash2 size={16} />
                            </button>
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-md border border-red-400/20 bg-slate-950 px-2 py-1 text-xs font-semibold text-red-300 opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100">
                              Delete
                            </span>
                          </div>
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
          {!!filteredRows.length && (
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
              <span>
                Showing {visibleStart}-{visibleEnd} of {filteredRows.length} users
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 font-medium text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  Previous
                </button>
                <span className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-300">
                  {currentPage} / {pageCount}
                </span>
                <button
                  className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 font-medium text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardCard>
  );
}
