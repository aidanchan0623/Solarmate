import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { getAdminWalletTransactions } from '../../api/client';
import StyledSelect from '../../components/StyledSelect';

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

const categoryTabs = [
  { id: 'all', label: 'All' },
  { id: 'prosumer', label: 'Prosumer' },
  { id: 'consumer', label: 'Consumer' }
];

function normalize(value) {
  return String(value || '').toLowerCase();
}

function prettyLabel(value) {
  return String(value || '-')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusBadgeClass(status) {
  const normalized = normalize(status);

  if (normalized === 'pending' || normalized.includes('pending')) {
    return 'bg-amber-50 text-amber-700 border border-amber-200/50';
  }

  if (normalized === 'processing') {
    return 'bg-blue-50 text-blue-700 border border-blue-200/50';
  }

  if (normalized === 'successful' || normalized === 'success' || normalized === 'complete' || normalized === 'settled' || normalized === 'paid') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50';
  }

  return 'bg-slate-50 text-slate-700 border border-slate-200/50';
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(status)}`}>
      {prettyLabel(status)}
    </span>
  );
}

export default function AdminTransactions() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

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

  const statuses = Array.from(new Set(rows.map((row) => row.status).filter(Boolean)));
  const types = Array.from(new Set(rows.map((row) => row.transaction_type).filter(Boolean)));

  const filteredRows = rows.filter((row) => {
    const type = normalize(row.transaction_type);
    const role = normalize(row.role);
    const status = normalize(row.status);
    const query = normalize(searchQuery);
    const matchesCategory = activeCategory === 'all' || role === activeCategory;
    const matchesStatus = statusFilter === 'all' || status === normalize(statusFilter);
    const matchesType = typeFilter === 'all' || type === normalize(typeFilter);
    const matchesSearch = !query || normalize(row.id).includes(query);

    return matchesCategory && matchesStatus && matchesType && matchesSearch;
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment audit</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Wallet transactions and settlements</h2>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          {filteredRows.length} records
        </span>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {categoryTabs.map((tab) => (
            <button
              className={
                activeCategory === tab.id
                  ? 'bg-teal-50 text-teal-700 font-semibold rounded-lg px-4 py-2 text-sm transition-colors'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-4 py-2 text-sm rounded-lg transition-colors'
              }
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full rounded-lg border border-slate-200 px-4 py-2 pl-11 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 sm:w-80"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by Transaction ID..."
              type="search"
              value={searchQuery}
            />
          </label>

          <StyledSelect
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'all', label: 'Status' },
              ...statuses.map((s) => ({ value: s, label: prettyLabel(s) })),
            ]}
            value={statusFilter}
            variant="light"
          />

          <StyledSelect
            onChange={(val) => setTypeFilter(val)}
            options={[
              { value: 'all', label: 'Type' },
              ...types.map((t) => ({ value: t, label: prettyLabel(t) })),
            ]}
            value={typeFilter}
            variant="light"
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="premium-scrollbar w-full overflow-x-auto">
          <table className="w-full min-w-max border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-transparent text-xs font-semibold uppercase tracking-wider text-slate-500">
                {columns.map((column) => (
                  <th className="whitespace-nowrap px-5 py-4 text-center" key={column.key}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr
                  className="border-b border-slate-100 bg-white transition-colors hover:bg-slate-50/50"
                  key={row.id || `${index}`}
                >
                  {columns.map((column) => {
                    const value = column.render ? column.render(row) : row[column.key];
                    return (
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700" key={column.key}>
                        {column.key === 'status' ? (
                          <StatusPill status={value} />
                        ) : column.key === 'amount' ? (
                          <span className="font-semibold text-slate-900 tabular-nums">{value}</span>
                        ) : column.key === 'transaction_type' ? (
                          <span className="font-medium text-slate-800">{prettyLabel(value)}</span>
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length === 0 && (
            <div className="px-6 py-12 text-center text-sm font-medium text-slate-500">
              No transactions match the current filters.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
