import { ArrowDownRight, ArrowUpRight, CreditCard, FileText } from 'lucide-react';

export default function DataTable({ columns, rows, theme = 'light' }) {
  const isDark = theme === 'dark';
  
  return (
    <div className={`w-full overflow-x-auto rounded-[2rem] border shadow-sm backdrop-blur-md ${isDark ? 'border-white/10 bg-slate-900/50' : 'border-white/60 bg-white/40'}`}>
      <table className="w-full min-w-max border-collapse">
        <thead>
          <tr className={`border-b text-[11px] font-extrabold uppercase tracking-widest ${isDark ? 'border-white/10 text-slate-400 bg-slate-800/50' : 'border-white/50 text-teal-900/70 bg-gradient-to-r from-teal-50/60 via-emerald-50/40 to-transparent'}`}>
            {columns.map((column) => (
              <th className="whitespace-nowrap px-6 py-5 text-left" key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              className={`border-b transition-colors ${isDark ? 'border-white/5 hover:bg-slate-800/50' : 'border-white/40 hover:bg-white/80'}`}
              key={row.id || `${row.date || row.created_at || 'row'}-${index}`}
            >
              {columns.map((column) => (
                <td className="whitespace-nowrap px-6 py-4 align-middle" key={column.key}>
                  {formatCell(column.render ? column.render(row) : row[column.key], column.key, row, isDark)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className={`px-6 py-12 text-center text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          No data available
        </div>
      )}
    </div>
  );
}

function formatCell(value, key, row, isDark) {
  if (key === 'created_at' || key === 'date') {
    return <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{value}</span>;
  }

  if (key === 'username' || key === 'user' || key === 'email') {
    return <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{value}</span>;
  }

  if (key === 'role') {
    return <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{value}</span>;
  }

  if (key === 'amount' || key.includes('payout') || key.includes('revenue')) {
    return <span className={`font-semibold tracking-wide ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</span>;
  }

  if (key === 'transaction_type' || key === 'activity' || key === 'type') {
    return <ActivityCell value={value} rawValue={row?.transaction_type || row?.activity || row?.type} isDark={isDark} />;
  }

  if (key === 'status') {
    return <StatusPill status={value} />;
  }

  return <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{value}</span>;
}

function ActivityCell({ value, rawValue, isDark }) {
  const normalized = normalize(rawValue || value);
  const { Icon, className } = activityIconConfig(normalized);

  return (
    <span className={`inline-flex items-center gap-2 font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${className}`}>
        <Icon size={16} />
      </span>
      {prettyLabel(value)}
    </span>
  );
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(status)}`}>
      {prettyLabel(status)}
    </span>
  );
}

function activityIconConfig(type) {
  if (type.includes('cashout')) {
    return {
      Icon: ArrowDownRight,
      className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-500 dark:text-emerald-300'
    };
  }

  if (type.includes('topup') || type.includes('top-up')) {
    return {
      Icon: ArrowUpRight,
      className: 'border-teal-400/20 bg-teal-400/10 text-teal-600 dark:text-teal-300'
    };
  }

  if (type.includes('bill') || type.includes('payment')) {
    return {
      Icon: CreditCard,
      className: 'border-amber-400/20 bg-amber-400/10 text-amber-600 dark:text-amber-300'
    };
  }

  return {
    Icon: FileText,
    className: 'border-slate-400/20 bg-slate-400/10 text-slate-600 dark:text-slate-300'
  };
}

function statusClass(status) {
  const normalized = normalize(status);

  if (normalized.includes('pending')) {
    return 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }

  if (normalized.includes('processing')) {
    return 'border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400';
  }

  if (
    normalized.includes('successful') ||
    normalized.includes('success') ||
    normalized.includes('settled') ||
    normalized.includes('paid') ||
    normalized.includes('complete') ||
    normalized.includes('active') ||
    normalized.includes('verified') ||
    normalized.includes('matched') ||
    normalized.includes('posted')
  ) {
    return 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }

  return 'border border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400';
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '_');
}

function prettyLabel(value) {
  return String(value || '-')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
