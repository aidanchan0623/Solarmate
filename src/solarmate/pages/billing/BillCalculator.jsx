import { useState } from 'react';
import { Receipt, Sparkles } from 'lucide-react';
import DashboardCard from '../../components/DashboardCard';
import SimulationInput from '../../components/SimulationInput';
import Modal from '../../components/Modal';
import {
  SOLARMATE_RATE,
  TNB_PEAK_TOTAL_RATE
} from '../../utils/calculations';

export default function BillCalculator({ totalUsage, creditedEnergy, setTotalUsage, setCreditedEnergy, bill }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const canAdjust = Boolean(setTotalUsage && setCreditedEnergy);

  const rows = [
    {
      item: 'SolarMate green energy',
      energy: `${bill.creditedEnergy} kWh`,
      rate: `RM${SOLARMATE_RATE.toFixed(2)}/kWh`,
      amount: `RM${bill.solarMatePortion.toFixed(2)}`
    },
    {
      item: 'TNB imported energy',
      energy: `${bill.importedEnergy} kWh`,
      rate: `RM${TNB_PEAK_TOTAL_RATE.toFixed(4)}/kWh`,
      amount: `RM${bill.tnbImportPortion.toFixed(2)}`
    },
    {
      item: 'TNB retail charge',
      energy: '-',
      rate: 'fixed',
      amount: `RM${bill.retailCharge.toFixed(2)}`
    },
    {
      item: 'Total payable',
      energy: '-',
      rate: '-',
      amount: `RM${bill.totalPayable.toFixed(2)}`
    },
    {
      item: 'TNB-only comparison',
      energy: `${bill.totalUsage.toLocaleString()} kWh`,
      rate: `RM${TNB_PEAK_TOTAL_RATE.toFixed(4)}/kWh + retail`,
      amount: `RM${bill.tnbOnlyBill.toFixed(2)}`
    }
  ];

  return (
    <DashboardCard eyebrow="Billing & payment" title="Your Blended Energy Bill" className="billing-focus-card">
      <div className="bill-topline">
        <p className="microcopy" style={{ margin: 0 }}>
          Bill calculated from this month’s usage records. Based on TNB Non-Domestic Low Voltage ToU Peak tariff.
          Prototype payment simulation only.
        </p>
        <div className="bill-actions">
          <button type="button" className="sm-inline-btn" onClick={() => setDetailsOpen(true)}>
            <Receipt size={14} /> View Bill Details
          </button>
        </div>
      </div>

      <div className="bill-summary-hero">
        <div>
          <span>Total Usage</span>
          <strong>{bill.totalUsage.toLocaleString()} kWh</strong>
        </div>
        <div>
          <span>SolarMate Green Credit</span>
          <strong>{bill.creditedEnergy} kWh</strong>
          <span className="sm-pill" style={{ marginTop: 6 }}>Green energy</span>
        </div>
        <div>
          <span>TNB Import</span>
          <strong>{bill.importedEnergy} kWh</strong>
          <span className="sm-pill blue" style={{ marginTop: 6 }}>Grid</span>
        </div>
        <div>
          <span>Total Bill</span>
          <strong>RM{bill.totalPayable.toFixed(2)}</strong>
        </div>
        <div className="bill-saving-tile">
          <span>Total Percentage Saved</span>
          <strong>{bill.savingsPercentage.toFixed(2)}%</strong>
          <span className="sm-pill gold" style={{ marginTop: 6 }}>
            this month
          </span>
        </div>
      </div>

      <div className="savings-highlight">
        <div className="savings-icon">
          <Sparkles size={22} />
        </div>
        <div>
          <strong>You saved {bill.savingsPercentage.toFixed(2)}% this month with SolarMate.</strong>
          <p>
            RM{bill.savings.toFixed(2)} saved. Actual bill saving depends on how much SolarMate green credit is used.
          </p>
        </div>
      </div>

      {canAdjust && (
        <details className="bill-input-panel">
          <summary>Adjust billing simulation</summary>
          <div className="simulation-grid compact-inputs">
            <SimulationInput
              label="Total monthly electricity usage"
              onChange={setTotalUsage}
              suffix="kWh"
              value={totalUsage}
            />
            <SimulationInput
              label="SolarMate green credit"
              onChange={(value) => setCreditedEnergy(Math.min(value, totalUsage))}
              suffix="kWh"
              value={creditedEnergy}
            />
          </div>
        </details>
      )}

      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        eyebrow="Bill details"
        title="Blended bill calculation"
        description="Detailed charges are hidden by default to keep the main billing view simple."
        tone="blue"
        icon={Receipt}
        primaryAction={{ label: 'Close', onClick: () => setDetailsOpen(false) }}
      >
        <div className="bill-detail-list">
          {rows.map((row) => (
            <div className="sm-modal-row" key={row.item}>
              <span>
                {row.item}
                <small>{row.energy} x {row.rate}</small>
              </span>
              <strong>{row.amount}</strong>
            </div>
          ))}
        </div>
      </Modal>
    </DashboardCard>
  );
}
