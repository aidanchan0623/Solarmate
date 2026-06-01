import { useEffect, useState } from 'react';
import { CheckCircle2, Download, WalletCards } from 'lucide-react';
import { getProsumerMonthlyExportHistory, getProsumerStatement } from '../../api/client';
import DashboardCard from '../../components/DashboardCard';
import DataTable from '../../components/DataTable';
import CompactGroupedBarChart from '../../components/CompactGroupedBarChart';
import Modal from '../../components/Modal';
import StatementModal from '../../components/StatementModal';
import {
  PROSUMER_BUYBACK_RATE,
  SOLAR_ATAP_REFERENCE_RATE,
  calculateProsumerUpliftPercentage
} from '../../utils/calculations';

const columns = [
  { key: 'month', label: 'Month' },
  {
    key: 'actual_exported_kwh',
    label: 'Actual Exported',
    render: (row) => `${row.actual_exported_kwh.toLocaleString()} kWh`
  },
  {
    key: 'solar_mate_kwh',
    label: 'Sold to SolarMate',
    render: (row) => `${row.solar_mate_kwh.toLocaleString()} kWh`
  },
  {
    key: 'solar_atap_kwh',
    label: 'Sold to Solar ATAP',
    render: (row) => `${row.solar_atap_kwh.toLocaleString()} kWh`
  },
  {
    key: 'solar_mate_earnings',
    label: 'SolarMate Earnings',
    render: (row) => `RM${row.solar_mate_earnings.toFixed(2)}`
  },
  {
    key: 'solar_atap_earnings',
    label: 'Solar ATAP Earnings',
    render: (row) => `RM${row.solar_atap_earnings.toFixed(2)}`
  },
  {
    key: 'total_earnings',
    label: 'Total Earnings',
    render: (row) => `RM${row.total_earnings.toFixed(2)}`
  },
  { key: 'status', label: 'Status' }
];

export default function ProsumerExportHistory({ prosumer }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [cashoutSuccess, setCashoutSuccess] = useState(false);
  const [cashoutStatus, setCashoutStatus] = useState(prosumer.cashout?.status || 'Available');
  const [statement, setStatement] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRows() {
      try {
        const data = await getProsumerMonthlyExportHistory();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    loadRows();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = rows[rows.length - 1] || {
    month_key: '',
    actual_exported_kwh: 0,
    solar_mate_kwh: 0,
    solar_atap_kwh: 0,
    total_earnings: 0,
    solar_atap_earnings: 0
  };
  const chartData = rows.map((row) => ({
    month: row.month.slice(0, 3),
    solarMateKWh: row.solar_mate_kwh,
    solarAtapKWh: row.solar_atap_kwh
  }));
  const cashout = {
    ...(prosumer.cashout || {}),
    availableBalance: current.total_earnings,
    pendingSettlement: current.solar_atap_earnings,
    lastCashoutDate: prosumer.cashout?.lastCashoutDate || '30 May 2026',
    method: prosumer.cashout?.method || 'Bank Transfer',
    status: prosumer.cashout?.status || 'Available'
  };
  const upliftPercentage = calculateProsumerUpliftPercentage();

  function confirmCashout() {
    setCashoutOpen(false);
    setCashoutStatus('Processing');
    setCashoutSuccess(true);
  }

  async function openStatement() {
    const data = await getProsumerStatement(current.month_key || undefined);
    setStatement(data);
  }

  return (
    <div className="page-stack">
      <DashboardCard
        action={<span className="sm-pill gold">{upliftPercentage.toFixed(1)}% higher than Solar ATAP</span>}
        eyebrow="Export & earnings"
        title="SolarMate quota and Solar ATAP excess"
      >
        {error && <div className="auth-error">Unable to load monthly export history: {error}</div>}
        <p className="microcopy">
          Monthly values are aggregated from daily export records. Energy within your quota is paid at
          {' '}RM{PROSUMER_BUYBACK_RATE.toFixed(2)}/kWh, while excess export is routed to Solar ATAP at
          {' '}RM{SOLAR_ATAP_REFERENCE_RATE.toFixed(4)}/kWh.
        </p>
        <div className="summary-metrics compact">
          <div>
            <span>Monthly Export Quota</span>
            <strong>{prosumer.monthlyExportCommitment.toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Actual Exported This Month</span>
            <strong>{current.actual_exported_kwh.toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Sold to SolarMate</span>
            <strong>{current.solar_mate_kwh.toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Excess Sold to Solar ATAP</span>
            <strong>{current.solar_atap_kwh.toLocaleString()} kWh</strong>
          </div>
          <div>
            <span>Total Earnings</span>
            <strong>RM{current.total_earnings.toFixed(2)}</strong>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard eyebrow="Monthly records" title="Monthly Energy Sold by Channel">
        <CompactGroupedBarChart
          data={chartData}
          series={[
            { key: 'solarMateKWh', label: 'Energy sold to SolarMate', color: 'teal' },
            { key: 'solarAtapKWh', label: 'Excess sold to Solar ATAP', color: 'gold' }
          ]}
          tooltipExtra={(item) => [
            {
              label: 'Total sold',
              value: `${(item.solarMateKWh + item.solarAtapKWh).toLocaleString()} kWh`,
              color: 'green'
            }
          ]}
          valueSuffix=" kWh"
          xKey="month"
        />
        <DataTable columns={columns} rows={rows} />
        <div className="action-row" style={{ marginTop: 16 }}>
          <button className="secondary-button" type="button" onClick={openStatement}>
            <Download size={16} />
            Download Monthly Statement
          </button>
        </div>
      </DashboardCard>

      <DashboardCard
        action={
          <button
            className="primary-button"
            disabled={cashoutStatus !== 'Available'}
            onClick={() => setCashoutOpen(true)}
            type="button"
          >
            <WalletCards size={17} />
            Cash Out
          </button>
        }
        eyebrow="Cashout"
        title="Cashout Earnings"
      >
        <p className="microcopy">
          Cashout is based on verified exported energy and monthly settlement status. Prototype simulation only;
          no real payment transfer is made.
        </p>
        <div className="cashout-grid">
          <div>
            <span>Available balance</span>
            <strong>RM{cashout.availableBalance.toFixed(2)}</strong>
          </div>
          <div>
            <span>Pending settlement</span>
            <strong>RM{cashout.pendingSettlement.toFixed(2)}</strong>
          </div>
          <div>
            <span>Last cashout date</span>
            <strong>{cashout.lastCashoutDate}</strong>
          </div>
          <div>
            <span>Cashout method</span>
            <strong>{cashout.method}</strong>
          </div>
          <div>
            <span>Cashout status</span>
            <strong>{cashoutStatus}</strong>
          </div>
        </div>
      </DashboardCard>

      <Modal
        open={cashoutOpen}
        onClose={() => setCashoutOpen(false)}
        eyebrow="Cashout"
        title="Confirm Cashout"
        description="Review the verified balance before submitting a prototype cashout request."
        tone="green"
        icon={WalletCards}
        primaryAction={{ label: 'Confirm Cashout', onClick: confirmCashout }}
        secondaryAction={{ label: 'Cancel', onClick: () => setCashoutOpen(false) }}
      >
        <div className="sm-modal-row">
          <span>Available balance</span>
          <strong>RM{cashout.availableBalance.toFixed(2)}</strong>
        </div>
        <div className="sm-modal-row">
          <span>Cashout method</span>
          <strong>{cashout.method}</strong>
        </div>
        <div className="sm-modal-row">
          <span>Estimated processing time</span>
          <strong>1-3 working days</strong>
        </div>
      </Modal>

      <Modal
        open={cashoutSuccess}
        onClose={() => setCashoutSuccess(false)}
        eyebrow="Cashout submitted"
        title="Cashout request submitted"
        description="Your prototype cashout request is now marked as processing."
        tone="green"
        icon={CheckCircle2}
        primaryAction={{ label: 'Done', onClick: () => setCashoutSuccess(false) }}
      >
        <div className="sm-modal-row">
          <span>Status</span>
          <strong>Processing</strong>
        </div>
        <div className="sm-modal-row">
          <span>Amount requested</span>
          <strong>RM{cashout.availableBalance.toFixed(2)}</strong>
        </div>
      </Modal>

      <StatementModal
        data={statement}
        onClose={() => setStatement(null)}
        open={Boolean(statement)}
        type="prosumer"
      />
    </div>
  );
}
