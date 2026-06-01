import StatusBadge from './StatusBadge';

export default function DataTable({ columns, rows }) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || `${row.date}-${index}`}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : formatCell(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value) {
  if (
    value === 'Active' ||
    value === 'active' ||
    value === 'Complete' ||
    value === 'Paid' ||
    value === 'Verified' ||
    value === 'Matched' ||
    value === 'Posted' ||
    value === 'Settled'
  ) {
    return <StatusBadge tone="success">{value}</StatusBadge>;
  }

  if (
    value === 'Pending' ||
    value === 'pending' ||
    value === 'Pending Review' ||
    value === 'Pending settlement' ||
    value === 'Live estimate'
  ) {
    return <StatusBadge tone="warning">{value}</StatusBadge>;
  }

  if (value === 'disabled') {
    return <StatusBadge tone="neutral">{value}</StatusBadge>;
  }

  return value;
}
