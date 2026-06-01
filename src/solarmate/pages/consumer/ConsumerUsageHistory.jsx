import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { getConsumerMonthlyUsageHistory, getConsumerStatement } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';
import StatementModal from '../../components/StatementModal';

const columns = [
  { key: 'month', label: 'Month' },
  {
    key: 'total_usage_kwh',
    label: 'Total Usage kWh',
    render: (row) => `${row.total_usage_kwh.toLocaleString()} kWh`
  },
  {
    key: 'green_credit_kwh',
    label: 'SolarMate Green Credit kWh',
    render: (row) => `${row.green_credit_kwh.toLocaleString()} kWh`
  },
  {
    key: 'tnb_import_kwh',
    label: 'TNB Import kWh',
    render: (row) => `${row.tnb_import_kwh.toLocaleString()} kWh`
  },
  {
    key: 'total_bill',
    label: 'Total Bill',
    render: (row) => `RM${row.total_bill.toFixed(2)}`
  },
  {
    key: 'savings',
    label: 'Savings',
    render: (row) => `RM${row.savings.toFixed(2)}`
  },
  {
    key: 'actual_saving_percentage',
    label: 'Actual Bill Saving %',
    render: (row) => `${row.actual_saving_percentage.toFixed(2)}%`
  },
  { key: 'payment_status', label: 'Payment Status' }
];

function average(rows, key) {
  if (!rows.length) return 0;
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0) / rows.length;
}

export default function ConsumerUsageHistory({ consumer }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [statement, setStatement] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getConsumerMonthlyUsageHistory()
      .then((data) => {
        if (!isMounted) return;
        setRows(data);
        setError('');
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Unable to load monthly usage history from backend.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function openStatement() {
    const latest = rows[rows.length - 1];
    const data = await getConsumerStatement(latest?.month_key);
    setStatement(data);
  }

  return (
    <div className="page-stack">
      <DashboardCard eyebrow="Monthly records" title="Monthly Usage History">
        <p className="microcopy">
          Monthly values are calculated by summing daily meter records. Current package:
          {' '}{consumer.selectedPackage}, {consumer.monthlyGreenAllocation.toLocaleString()} kWh/month.
        </p>
        {error && <div className="auth-error">{error}</div>}
        <div className="summary-metrics compact">
          <div>
            <span>Average monthly usage</span>
            <strong>{Math.round(average(rows, 'total_usage_kwh')).toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Average SolarMate credit</span>
            <strong>{Math.round(average(rows, 'green_credit_kwh')).toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Average monthly savings</span>
            <strong>RM{average(rows, 'savings').toFixed(2)}</strong>
          </div>
          <div>
            <span>Average actual bill saving</span>
            <strong>{average(rows, 'actual_saving_percentage').toFixed(2)}%</strong>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard eyebrow="History" title="Green credit, TNB import, bill and savings">
        <DataTable columns={columns} rows={rows} />
        <div className="action-row" style={{ marginTop: 16 }}>
          <button className="secondary-button" type="button" onClick={openStatement}>
            <Download size={16} />
            Download Monthly Statement
          </button>
        </div>
      </DashboardCard>

      <StatementModal
        data={statement}
        onClose={() => setStatement(null)}
        open={Boolean(statement)}
        type="consumer"
      />
    </div>
  );
}
