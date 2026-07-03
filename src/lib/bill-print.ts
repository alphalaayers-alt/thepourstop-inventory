import type { Order } from "@/types/inventory";
import { formatDateTime, formatMoney } from "@/lib/format";
import { formatPaymentDetail } from "@/lib/payments";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildBillPrintHtml(order: Order, tableName?: string): string {
  const title =
    order.tableNumber != null
      ? tableName ?? `Table ${order.tableNumber}`
      : order.customerName;
  const completedAt = order.completedAt ?? new Date().toISOString();

  const rows = order.items
    .map((line) => {
      const detail =
        line.unitType === "pour"
          ? `${line.pourLabel ?? `${line.servingSizeMl}ml`} · ×${line.quantity}`
          : `×${line.quantity}`;
      return `
        <tr>
          <td class="item-name">${escapeHtml(line.itemName)}</td>
          <td class="item-detail">${escapeHtml(detail)}</td>
          <td class="item-price">${formatMoney(line.unitPrice)}</td>
          <td class="item-total">${formatMoney(line.lineTotal)}</td>
        </tr>`;
    })
    .join("");

  const discountRow =
    order.discountAmount && order.discountAmount > 0
      ? `
        <div class="summary-row discount">
          <span>${escapeHtml(order.discountLabel ?? `${order.discountPercent}% off`)}</span>
          <span>−${formatMoney(order.discountAmount)}</span>
        </div>`
      : "";

  const paymentRow =
    order.paymentMethod
      ? `
        <div class="summary-row">
          <span>Payment</span>
          <span>${escapeHtml(
            formatPaymentDetail(
              {
                method: order.paymentMethod,
                cashAmount: order.paymentCashAmount ?? 0,
                onlineAmount: order.paymentOnlineAmount ?? 0,
              },
              formatMoney
            )
          )}</span>
        </div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill — ${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #111; padding: 24px; max-width: 400px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 16px; margin-bottom: 16px; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: 0.02em; }
    .meta { font-size: 12px; color: #555; margin-top: 8px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; padding: 6px 4px; border-bottom: 1px solid #ddd; }
    td { padding: 8px 4px; border-bottom: 1px dotted #eee; vertical-align: top; }
    .item-name { font-weight: 600; width: 38%; }
    .item-detail { color: #555; width: 27%; font-size: 12px; }
    .item-price { text-align: right; width: 17%; font-size: 12px; color: #555; }
    .item-total { text-align: right; width: 18%; font-weight: 600; }
    .summary { border-top: 2px solid #111; padding-top: 12px; }
    .summary-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
    .summary-row.discount { color: #b45309; }
    .summary-row.total { font-size: 18px; font-weight: 700; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ccc; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #888; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">The Pour Stop</div>
    <div class="meta">
      <div><strong>${escapeHtml(title)}</strong></div>
      <div>${formatDateTime(completedAt)}</div>
      <div>Manager: ${escapeHtml(order.managerName)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Detail</th>
        <th style="text-align:right">Rate</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary">
    <div class="summary-row">
      <span>Subtotal</span>
      <span>${formatMoney(order.subtotal)}</span>
    </div>
    ${discountRow}
    ${paymentRow}
    <div class="summary-row total">
      <span>Total</span>
      <span>${formatMoney(order.total)}</span>
    </div>
  </div>
  <div class="footer">Thank you — visit again!</div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}

export function printBill(order: Order, tableName?: string): void {
  const html = buildBillPrintHtml(order, tableName);
  const win = window.open("", "_blank", "width=480,height=720");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
