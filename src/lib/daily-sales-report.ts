import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getSellableItems } from "./catalog";
import { getCompletedOrders } from "./orders";
import { getStockAdditionsInRange } from "./stock-additions";
import {
  formatBusinessDayHours,
  formatBusinessDayLabel,
  formatBusinessDayPeriod,
  getBusinessDayRange,
  isWithinBusinessDayRange,
  type BusinessDayRange,
} from "./business-day";
import { categoryLabel } from "./format";
import { formatPaymentDetail } from "./payments";
import { formatSaleListLineDescription } from "./sale-detail";
import type { Order, SellableItem } from "@/types/inventory";

function formatReportMoney(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatReportDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stockUnitLabel(item: Pick<SellableItem, "unitType">, qty: number): string {
  if (item.unitType === "pour") return `${qty.toLocaleString("en-IN")} ml`;
  return `${qty} bottle${qty !== 1 ? "s" : ""}`;
}

export function getOrdersForBusinessDayRange(
  range: BusinessDayRange = getBusinessDayRange()
): Order[] {
  return getCompletedOrders()
    .filter((order) =>
      isWithinBusinessDayRange(order.completedAt ?? order.createdAt, range)
    )
    .sort(
      (a, b) =>
        new Date(a.completedAt ?? a.createdAt).getTime() -
        new Date(b.completedAt ?? b.createdAt).getTime()
    );
}

export interface PaymentSummary {
  billCount: number;
  grossTotal: number;
  cashTotal: number;
  onlineTotal: number;
}

export function summarizePayments(orders: Order[]): PaymentSummary {
  let cashTotal = 0;
  let onlineTotal = 0;
  let grossTotal = 0;

  for (const order of orders) {
    grossTotal += order.total;
    if (order.paymentMethod === "cash") {
      cashTotal += order.paymentCashAmount ?? order.total;
    } else if (order.paymentMethod === "online") {
      onlineTotal += order.paymentOnlineAmount ?? order.total;
    } else if (order.paymentMethod === "split") {
      cashTotal += order.paymentCashAmount ?? 0;
      onlineTotal += order.paymentOnlineAmount ?? 0;
    }
  }

  return {
    billCount: orders.length,
    grossTotal,
    cashTotal,
    onlineTotal,
  };
}

export interface InventorySnapshotRow {
  name: string;
  category: string;
  unitType: SellableItem["unitType"];
  opening: number;
  sold: number;
  added: number;
  closing: number;
}

export function buildInventorySnapshot(
  range: BusinessDayRange = getBusinessDayRange()
): InventorySnapshotRow[] {
  const orders = getOrdersForBusinessDayRange(range);
  const additions = getStockAdditionsInRange(range.from, range.effectiveTo);

  const soldMap = new Map<string, number>();
  for (const order of orders) {
    for (const line of order.items) {
      soldMap.set(
        line.menuItemId,
        (soldMap.get(line.menuItemId) ?? 0) + line.stockDeducted
      );
    }
  }

  const addedMap = new Map<string, number>();
  for (const entry of additions) {
    addedMap.set(
      entry.menuItemId,
      (addedMap.get(entry.menuItemId) ?? 0) + entry.quantity
    );
  }

  return getSellableItems()
    .map((item) => {
      const closing = item.stockQuantity;
      const sold = soldMap.get(item.id) ?? 0;
      const added = addedMap.get(item.id) ?? 0;
      const opening = closing + sold - added;

      return {
        name: item.name,
        category: categoryLabel(item.category),
        unitType: item.unitType,
        opening,
        sold,
        added,
        closing,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function formatOrderItemsForReport(order: Order): string {
  return order.items
    .map((line) => {
      if (line.unitType === "bottle") {
        return `${line.itemName} · ${line.quantity} bottle${line.quantity !== 1 ? "s" : ""}`;
      }
      return `${line.itemName} · ${formatSaleListLineDescription(line)}`;
    })
    .join("\n");
}

function formatOrderTable(order: Order): string {
  if (order.tableNumber != null) return `Table ${order.tableNumber}`;
  return order.customerName || "Walk-in";
}

function formatOrderPayment(order: Order): string {
  if (!order.paymentMethod) return "—";
  return formatPaymentDetail(
    {
      method: order.paymentMethod,
      cashAmount: order.paymentCashAmount ?? 0,
      onlineAmount: order.paymentOnlineAmount ?? 0,
    },
    formatReportMoney
  );
}

export function downloadTodaySalesReportPdf(managerName?: string): void {
  const range = getBusinessDayRange();
  const orders = getOrdersForBusinessDayRange(range);
  const payments = summarizePayments(orders);
  const inventory = buildInventorySnapshot(range);

  const doc = new jsPDF();
  const margin = 14;
  let y = 20;

  doc.setFontSize(18);
  doc.text("The Pour Stop — Daily Sales Report", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Business day: ${formatBusinessDayLabel(range.businessDateKey)}`, margin, y);
  y += 5;
  doc.text(`Shop hours: ${formatBusinessDayHours()}`, margin, y);
  y += 5;
  doc.text(`Period: ${formatBusinessDayPeriod(range)}`, margin, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, margin, y);
  y += 5;
  if (managerName) {
    doc.text(`Prepared by: ${managerName}`, margin, y);
    y += 5;
  }
  if (!range.isComplete) {
    doc.text("Note: Shift still open — closing stock reflects current levels.", margin, y);
    y += 5;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  y += 4;
  doc.text("Sales Summary", margin, y);

  autoTable(doc, {
    startY: y + 2,
    head: [["Metric", "Value"]],
    body: [
      ["Bills completed", String(payments.billCount)],
      ["Total sales", formatReportMoney(payments.grossTotal)],
      ["Cash received", formatReportMoney(payments.cashTotal)],
      ["Online received", formatReportMoney(payments.onlineTotal)],
      [
        "Payment total (Cash + Online)",
        formatReportMoney(payments.cashTotal + payments.onlineTotal),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [16, 120, 90], textColor: 255 },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  let tableEnd =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.text("Opening & Closing Inventory", margin, tableEnd);

  autoTable(doc, {
    startY: tableEnd + 4,
    head: [["Item", "Category", "Opening", "Sold", "Added", "Closing"]],
    body: inventory.map((row) => [
      row.name,
      row.category,
      stockUnitLabel(row, row.opening),
      stockUnitLabel(row, row.sold),
      row.added > 0 ? stockUnitLabel(row, row.added) : "—",
      stockUnitLabel(row, row.closing),
    ]),
    styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [51, 65, 85], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  tableEnd =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.text("Bill Details", margin, tableEnd);

  if (orders.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("No bills completed in this business day yet.", margin, tableEnd + 8);
  } else {
    autoTable(doc, {
      startY: tableEnd + 4,
      head: [["Time", "Table", "Items", "Total", "Payment"]],
      body: orders.map((order) => [
        formatReportDateTime(order.completedAt ?? order.createdAt),
        formatOrderTable(order),
        formatOrderItemsForReport(order),
        order.discountAmount != null && order.discountAmount > 0
          ? `${formatReportMoney(order.subtotal)} → ${formatReportMoney(order.total)}`
          : formatReportMoney(order.total),
        formatOrderPayment(order),
      ]),
      styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 18 },
        2: { cellWidth: 62 },
        3: { cellWidth: 28, halign: "right" },
        4: { cellWidth: 34 },
      },
      margin: { left: margin, right: margin },
    });

    tableEnd =
      (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `Grand total: ${formatReportMoney(payments.grossTotal)}  |  Cash: ${formatReportMoney(payments.cashTotal)}  |  Online: ${formatReportMoney(payments.onlineTotal)}`,
      margin,
      tableEnd
    );
  }

  doc.save(`sales-report-${range.businessDateKey}.pdf`);
}
