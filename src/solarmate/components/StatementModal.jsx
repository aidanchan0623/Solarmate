import { Download, FileText, Printer } from 'lucide-react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import {
  PROSUMER_BUYBACK_RATE,
  SOLAR_ATAP_REFERENCE_RATE,
  SOLARMATE_RATE,
  TNB_PEAK_TOTAL_RATE,
  TNB_RETAIL_CHARGE
} from '../utils/calculations';

function money(value) {
  return `RM${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function kwh(value) {
  return `${Number(value || 0).toLocaleString()} kWh`;
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function rowsToHtml(rows) {
  return rows
    .map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`)
    .join('');
}

function statementFilename(type, data) {
  const month = String(data?.month || 'statement').toLowerCase().replace(/\s+/g, '-');
  return `solarmate-${type}-statement-${month}.html`;
}

export default function StatementModal({ data, onClose, open, type }) {
  if (!data) return null;

  const isProsumer = type === 'prosumer';
  const title = isProsumer ? 'Monthly Export Statement' : 'Monthly Bill Statement';
  const entity = isProsumer ? data.display_name : data.business_name;
  const rows = isProsumer
    ? [
        ['Statement month', data.month],
        ['Prosumer name', data.display_name],
        ['Selected export plan', data.selected_export_plan],
        ['Monthly quota', kwh(data.export_commitment_kwh)],
        ['Actual exported energy', kwh(data.actual_exported_kwh)],
        ['Sold to SolarMate quota', kwh(data.solar_mate_kwh)],
        ['Excess sold to Solar ATAP', kwh(data.solar_atap_kwh)],
        ['SolarMate rate', `RM${PROSUMER_BUYBACK_RATE.toFixed(2)}/kWh`],
        ['Solar ATAP rate', `RM${SOLAR_ATAP_REFERENCE_RATE.toFixed(4)}/kWh`],
        ['SolarMate earnings', money(data.solar_mate_earnings)],
        ['Solar ATAP earnings', money(data.solar_atap_earnings)],
        ['Total earnings', money(data.total_earnings_this_month)],
        ['Cashout status', data.cashout_status],
        ['Settlement status', data.settlement_status]
      ]
    : [
        ['Statement month', data.month],
        ['Consumer/business name', data.business_name],
        ['Selected package', data.selected_package],
        ['Package allocation', kwh(data.package_allocation_kwh)],
        ['Total usage', kwh(data.total_usage_kwh)],
        ['SolarMate green credit used', kwh(data.green_credit_kwh)],
        ['TNB import', kwh(data.tnb_import_kwh)],
        ['SolarMate rate', `RM${SOLARMATE_RATE.toFixed(2)}/kWh`],
        ['TNB peak reference rate', `RM${TNB_PEAK_TOTAL_RATE.toFixed(4)}/kWh`],
        ['Retail charge', money(TNB_RETAIL_CHARGE)],
        ['Total bill', money(data.total_bill)],
        ['Actual bill saving', `${Number(data.actual_saving_percentage || 0).toFixed(2)}%`],
        ['Payment status', data.payment_status]
      ];

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>SolarMate ${title}</title>
  <style>
    body { font-family: Outfit, Inter, Arial, sans-serif; color: #0b3f46; background: #f5f8f8; padding: 32px; }
    .statement { max-width: 760px; margin: auto; background: #fff; border: 1px solid #d8ecef; border-radius: 18px; padding: 28px; }
    h1 { margin: 0 0 4px; }
    .brand { color: #27a1ad; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e7f2f3; }
    th { color: #597078; font-size: 13px; width: 46%; }
    .total { margin-top: 18px; padding: 16px; background: #e9f8f6; border-radius: 12px; font-weight: 800; }
    .note { margin-top: 16px; color: #597078; font-size: 13px; }
  </style>
</head>
<body>
  <section class="statement">
    <div class="brand">SolarMate</div>
    <h1>${title}</h1>
    <p>${data.month} • ${entity}</p>
    <table>${rowsToHtml(rows)}</table>
    <div class="total">${isProsumer ? `Total earnings: ${money(data.total_earnings_this_month)}` : `Total bill: ${money(data.total_bill)}`}</div>
    <p class="note">${data.note}</p>
  </section>
</body>
</html>`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="SolarMate statement"
      title={title}
      description={`${data.month} statement for ${entity}.`}
      tone={isProsumer ? 'green' : 'blue'}
      icon={FileText}
      primaryAction={{ label: 'Close', onClick: onClose }}
    >
      <div className="statement-preview statement-print">
        <div className="statement-brand">
          <strong>SolarMate</strong>
          <span>Smarter Energy, Smarter Connections</span>
        </div>
        <div className="statement-title-row">
          <div>
            <h3>{title}</h3>
            <p>{data.month} • {entity}</p>
          </div>
          <StatusBadge tone={isProsumer ? 'warning' : 'success'}>
            {isProsumer ? data.settlement_status : data.payment_status}
          </StatusBadge>
        </div>
        <div className="statement-table">
          {rows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="statement-total">
          <span>{isProsumer ? 'Total earnings' : 'Total bill'}</span>
          <strong>{isProsumer ? money(data.total_earnings_this_month) : money(data.total_bill)}</strong>
        </div>
        <p className="microcopy">{data.note}</p>
      </div>

      <div className="action-row">
        <button className="secondary-button" type="button" onClick={() => window.print()}>
          <Printer size={16} />
          Print / Save as PDF
        </button>
        <button className="primary-button" type="button" onClick={() => downloadFile(statementFilename(type, data), html)}>
          <Download size={16} />
          Download Statement
        </button>
      </div>
    </Modal>
  );
}
