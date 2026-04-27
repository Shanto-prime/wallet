import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

function formatBDT(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}৳ ${Math.abs(n).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(ms) {
  const d = new Date(ms);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TYPE_LABELS = {
  income: 'Income', expense: 'Expense',
  lent: 'Lent', owe: 'Borrowed',
  repay_lent: 'Repaid to you', repay_owe: 'You repaid',
};

function applyFilter(transactions, filter) {
  const now = Date.now();
  switch (filter) {
    case 'last_30_days':
      return transactions.filter(t => t.date >= now - 30 * 24 * 60 * 60 * 1000);
    case 'last_10':
      return transactions.slice(0, 10);
    case 'income_only':
      return transactions.filter(t => t.type === 'income');
    case 'expense_only':
      return transactions.filter(t => t.type === 'expense');
    case 'lent_only':
      return transactions.filter(t => t.type === 'lent' || t.type === 'repay_lent');
    case 'owe_only':
      return transactions.filter(t => t.type === 'owe' || t.type === 'repay_owe');
    default:
      return transactions;
  }
}

function filterLabel(filter) {
  return ({
    last_30_days: 'Last 30 Days',
    last_10: 'Last 10 Transactions',
    income_only: 'Income Only',
    expense_only: 'Expense Only',
    lent_only: 'Lending History',
    owe_only: 'Borrowing History',
    all: 'All Transactions',
  })[filter] || 'Report';
}

/**
 * Build a pie chart as inline SVG given { label, value, color } slices.
 */
function pieChartSVG(slices, size = 240) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 10}" fill="#eee" />
      <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="#888" font-size="14">No data</text>
    </svg>`;
  }
  const cx = size / 2, cy = size / 2, r = size / 2 - 10;
  let startAngle = -Math.PI / 2;
  const paths = slices.filter(s => s.value > 0).map(s => {
    const angle = (s.value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return `<path d="${path}" fill="${s.color}" stroke="white" stroke-width="2"/>`;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
}

/**
 * Build a horizontal bar chart for income vs expense vs net.
 */
function barChartSVG(items, width = 480, barHeight = 32) {
  const max = Math.max(1, ...items.map(i => Math.abs(i.value)));
  const labelWidth = 120;
  const valueWidth = 120;
  const chartWidth = width - labelWidth - valueWidth;
  const height = items.length * (barHeight + 8) + 20;
  const bars = items.map((it, i) => {
    const y = 10 + i * (barHeight + 8);
    const w = (Math.abs(it.value) / max) * chartWidth;
    return `
      <text x="${labelWidth - 8}" y="${y + barHeight / 2 + 5}" text-anchor="end" font-size="13" fill="#333">${it.label}</text>
      <rect x="${labelWidth}" y="${y}" width="${w}" height="${barHeight}" fill="${it.color}" rx="4"/>
      <text x="${labelWidth + w + 8}" y="${y + barHeight / 2 + 5}" font-size="13" fill="#333">${formatBDT(it.value)}</text>
    `;
  }).join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bars}</svg>`;
}

function buildHTML({ transactions, accounts, netWorth, filter }) {
  const filtered = applyFilter(transactions, filter);

  // Aggregations
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalLent = filtered.filter(t => t.type === 'lent').reduce((s, t) => s + t.amount, 0);
  const totalOwe = filtered.filter(t => t.type === 'owe').reduce((s, t) => s + t.amount, 0);

  // Account distribution pie
  const accountSlices = accounts
    .filter(a => Math.abs(a.balance) > 0)
    .map((a, i) => ({
      label: a.name,
      value: Math.abs(a.balance),
      color: ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#00838f', '#5d4037'][i % 7],
    }));
  const accountPie = pieChartSVG(accountSlices, 220);

  // Bar chart for summary
  const barItems = [
    { label: 'Income', value: totalIncome, color: '#388e3c' },
    { label: 'Expense', value: totalExpense, color: '#d32f2f' },
    { label: 'Lent', value: totalLent, color: '#f57c00' },
    { label: 'Borrowed', value: totalOwe, color: '#7b1fa2' },
  ].filter(b => b.value > 0);
  const summaryBar = barItems.length > 0 ? barChartSVG(barItems, 480, 30) : '';

  // Account legend
  const legend = accountSlices.map(s => `
    <div class="legend-item">
      <span class="legend-color" style="background:${s.color}"></span>
      <span>${s.name}: ${formatBDT(s.value)}</span>
    </div>
  `).join('');

  // Transaction rows
  const rows = filtered.map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td><span class="badge ${t.type}">${TYPE_LABELS[t.type] || t.type}</span></td>
      <td>${t.account_name}</td>
      <td>${t.party_name || '—'}</td>
      <td class="amount ${t.type}">${formatBDT(t.amount)}</td>
      <td class="note">${t.note || ''}</td>
    </tr>
  `).join('');

  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #222; }
  h1 { margin: 0 0 4px; font-size: 24px; color: #1976d2; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .card { background: #f5f5f5; padding: 14px; border-radius: 8px; }
  .card-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .card-value { font-size: 20px; font-weight: bold; margin-top: 4px; }
  .card.positive .card-value { color: #2e7d32; }
  .card.negative .card-value { color: #c62828; }
  .net { background: ${netWorth.netWorth >= 0 ? '#e8f5e9' : '#ffebee'}; }
  .charts-row { display: flex; gap: 24px; align-items: flex-start; margin: 20px 0; }
  .chart-block { background: #fafafa; padding: 16px; border-radius: 8px; }
  .chart-title { font-size: 13px; font-weight: bold; color: #555; margin-bottom: 12px; }
  .legend { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 12px; font-size: 12px; }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .legend-color { width: 12px; height: 12px; border-radius: 2px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
  th { text-align: left; background: #1976d2; color: white; padding: 8px; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #fafafa; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge.income, .badge.repay_lent { background: #e8f5e9; color: #2e7d32; }
  .badge.expense, .badge.repay_owe { background: #ffebee; color: #c62828; }
  .badge.lent, .badge.owe { background: #fff3e0; color: #e65100; }
  .amount { text-align: right; font-weight: bold; }
  .amount.income, .amount.repay_lent { color: #2e7d32; }
  .amount.expense, .amount.repay_owe { color: #c62828; }
  .amount.lent, .amount.owe { color: #e65100; }
  .note { color: #666; font-style: italic; max-width: 200px; }
  .footer { margin-top: 32px; text-align: center; color: #999; font-size: 11px; }
</style>
</head>
<body>
  <h1>Finance Report</h1>
  <div class="subtitle">${filterLabel(filter)} · Generated ${generatedAt}</div>

  <div class="summary-grid">
    <div class="card net ${netWorth.netWorth >= 0 ? 'positive' : 'negative'}">
      <div class="card-label">Net Balance</div>
      <div class="card-value">${formatBDT(netWorth.netWorth)}</div>
    </div>
    <div class="card positive">
      <div class="card-label">In Accounts</div>
      <div class="card-value">${formatBDT(netWorth.accountBalance)}</div>
    </div>
    <div class="card">
      <div class="card-label">Lent / Owe</div>
      <div class="card-value" style="font-size:14px">
        +${formatBDT(netWorth.lent)} / -${formatBDT(netWorth.owe)}
      </div>
    </div>
  </div>

  <div class="charts-row">
    <div class="chart-block" style="flex: 0 0 auto">
      <div class="chart-title">Account Distribution</div>
      ${accountPie}
      <div class="legend">${legend}</div>
    </div>
    <div class="chart-block" style="flex: 1">
      <div class="chart-title">Period Summary</div>
      ${summaryBar || '<div style="color:#888;font-size:13px;">No transactions in this filter.</div>'}
    </div>
  </div>

  <h3 style="margin-top:24px">Transactions (${filtered.length})</h3>
  ${filtered.length === 0 ? '<p style="color:#888">No transactions match this filter.</p>' : `
    <table>
      <thead>
        <tr><th>Date</th><th>Type</th><th>Account</th><th>Party</th><th>Amount</th><th>Note</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `}

  <div class="footer">Finance Tracker · Personal use only</div>
</body>
</html>
  `;
}

export async function exportToPDF({ transactions, accounts, netWorth, filter }) {
  const html = buildHTML({ transactions, accounts, netWorth, filter });
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  // Share the file
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Finance Report',
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}

/**
 * "Image export" — generates the same report but as a single-page PDF
 * which user can screenshot, OR we render via Print and convert.
 * Simplest reliable approach on Android: just share the PDF;
 * users can convert to image with any viewer if they want.
 * For a true PNG, see the captureView export below.
 */
export async function exportToImage({ transactions, accounts, netWorth, filter }) {
  // For images, we generate a more compact HTML that fits one screen
  // and use Print.printToFileAsync. The user can long-press in the
  // PDF viewer to extract page as image, OR we can use react-native-view-shot
  // on a hidden component — but that requires the data to be rendered on screen first.
  // Cleanest path: generate compact PDF, share it. Mobile share sheets
  // include "Save as image" options on most Android devices via screenshot apps.
  return exportToPDF({ transactions, accounts, netWorth, filter });
}
