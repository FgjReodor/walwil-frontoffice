import { ShipmentDetail, normalizePartyType } from '@/types/shipment';

function esc(val: string | number | null | undefined): string {
  if (val == null) return '';
  return String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtNum(val: number | null | undefined): string {
  if (val == null) return '';
  return val.toLocaleString('en-US');
}

function fmtDec(val: number | null | undefined, decimals = 2): string {
  if (val == null) return '';
  return val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function openShipmentPreview(detail: ShipmentDetail) {
  const partyLabel = (t: string) =>
    t === 'SHIP' ? 'Shipper' : t === 'CONS' ? 'Consignee' : 'Notify Party';

  const partyOrder = ['SHIP', 'CONS', 'NOT'] as const;
  const parties = partyOrder
    .map(pt => detail.parties?.find(p => normalizePartyType(p.partyType as never) === pt))
    .filter(Boolean);

  const totalCharges = detail.charges.reduce((s, c) => s + c.amount, 0);
  const currency = detail.charges[0]?.currency || 'USD';

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>WW ${esc(detail.blNumber)} - Shipment Overview</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #1a1a1a; background: #f8f9fa; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
  .section { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
  .section-title { background: #f5f5f5; padding: 10px 16px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e0e0e0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f9fafb; text-align: left; padding: 8px 12px; font-weight: 600; color: #555; border-bottom: 2px solid #e0e0e0; }
  td { padding: 7px 12px; border-bottom: 1px solid #f0f0f0; }
  tr:hover td { background: #f9fafb; }
  .header-table td:first-child { font-weight: 600; color: #555; width: 180px; }
  .header-table td:last-child { color: #1a1a1a; }
  .right { text-align: right; }
  .mono { font-family: 'SF Mono', Monaco, monospace; font-size: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .prepaid { background: #dbeafe; color: #1d4ed8; }
  .collect { background: #f3f4f6; color: #374151; }
  .total-row td { font-weight: 700; background: #f9fafb; border-top: 2px solid #e0e0e0; }
  .weight-missing { color: #dc2626; font-style: italic; }
  .actions { margin-bottom: 20px; display: flex; gap: 8px; }
  .btn { padding: 8px 16px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-size: 13px; font-weight: 500; }
  .btn:hover { background: #f3f4f6; }
  .btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
  .btn-primary:hover { background: #1d4ed8; }
  @media print { .actions { display: none; } body { background: #fff; padding: 12px; } .section { border: 1px solid #ccc; } }
</style>
</head><body>

<h1>Shipment: ${esc(detail.blNumber)}</h1>
<p class="subtitle">${esc(detail.manufacturer)} &mdash; ${esc(detail.vesselVoyage)} &mdash; ${detail.vehicles.length} vehicles</p>

<div class="actions">
  <button class="btn btn-primary" onclick="window.print()">Print</button>
  <button class="btn" onclick="window.close()">Close</button>
</div>

<div class="section">
  <div class="section-title">Shipment Details</div>
  <table class="header-table">
    <tr><td>BL Number</td><td>${esc(detail.blNumber)}</td></tr>
    <tr><td>Vessel / Voyage</td><td>${esc(detail.vesselVoyage)}</td></tr>
    <tr><td>Manufacturer</td><td>${esc(detail.manufacturer)}</td></tr>
    <tr><td>Port of Loading</td><td>${esc(detail.polCode)}</td></tr>
    <tr><td>Port of Destination</td><td>${esc(detail.podCode)}</td></tr>
    <tr><td>Total Units</td><td>${fmtNum(detail.totalUnits)}</td></tr>
    <tr><td>Total Weight (kg)</td><td>${fmtDec(detail.totalWeightKg)}</td></tr>
    <tr><td>Total CBM</td><td>${fmtDec(detail.totalCbm)}</td></tr>
    <tr><td>Received</td><td>${new Date(detail.receivedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Parties</div>
  <table>
    <thead><tr><th>Type</th><th>Name</th><th>Address</th><th>City</th><th>Country</th></tr></thead>
    <tbody>
    ${parties.length > 0 ? parties.map(p => `<tr>
      <td><strong>${esc(partyLabel(normalizePartyType(p!.partyType as never)))}</strong></td>
      <td>${esc(p!.nameLine1)}${p!.nameLine2 ? '<br>' + esc(p!.nameLine2) : ''}</td>
      <td>${[p!.addressLine1, p!.addressLine2, p!.addressLine3].filter(Boolean).map(esc).join('<br>')}</td>
      <td>${esc(p!.city)}${p!.postalCode ? ' ' + esc(p!.postalCode) : ''}</td>
      <td>${esc(p!.country)}</td>
    </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:#999;padding:16px;">No party data available</td></tr>`}
    </tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Vehicles (${detail.vehicles.length})</div>
  <table>
    <thead><tr><th>#</th><th>VIN</th><th>Model</th><th class="right">Weight (kg)</th><th class="right">CBM</th><th>HS Code</th></tr></thead>
    <tbody>
    ${detail.vehicles.map((v, i) => `<tr>
      <td>${i + 1}</td>
      <td class="mono">${esc(v.vin)}</td>
      <td>${esc(v.model)}</td>
      <td class="right ${v.weightKg == null ? 'weight-missing' : ''}">${v.weightKg != null ? fmtNum(v.weightKg) : 'Missing'}</td>
      <td class="right">${fmtDec(v.cbm)}</td>
      <td class="mono">${esc(v.hsCode)}</td>
    </tr>`).join('')}
    </tbody>
  </table>
</div>

${detail.charges.length > 0 ? `<div class="section">
  <div class="section-title">Charges (${detail.charges.length})</div>
  <table>
    <thead><tr><th>Code</th><th>Description</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th><th>Terms</th></tr></thead>
    <tbody>
    ${detail.charges.map(c => `<tr>
      <td class="mono">${esc(c.chargeCode)}</td>
      <td>${esc(c.description)}</td>
      <td class="right">${c.quantity}</td>
      <td class="right">${fmtDec(c.rate)} ${esc(c.currency)}</td>
      <td class="right">${fmtDec(c.amount)} ${esc(c.currency)}</td>
      <td><span class="badge ${c.freightTerms === 'PREPAID' ? 'prepaid' : 'collect'}">${esc(c.freightTerms)}</span></td>
    </tr>`).join('')}
    <tr class="total-row">
      <td colspan="4" class="right">Total</td>
      <td class="right">${fmtDec(totalCharges)} ${esc(currency)}</td>
      <td></td>
    </tr>
    </tbody>
  </table>
</div>` : ''}

</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
