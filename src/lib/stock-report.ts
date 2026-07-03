import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getSellableItems, isLowStock } from "./catalog";
import { getCompletedOrders } from "./orders";
import { categoryLabel, endOfDay, startOfDay } from "./format";
import type { SellableItem, StockUnitType } from "@/types/inventory";

export interface StockReportRange {
  from: Date;
  to: Date;
}

export type StockReportPreset = "today" | "7d" | "15d" | "30d" | "custom";

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toDateTimeInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function parseDateInput(value: string, asEnd = false): Date {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (asEnd) return endOfDay(date);
  return startOfDay(date);
}

export function parseDateTimeInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getReportRangeForPreset(preset: StockReportPreset): StockReportRange {
  const now = new Date();
  const to = now;
  if (preset === "today") {
    return { from: startOfDay(now), to };
  }
  const days = preset === "7d" ? 7 : preset === "15d" ? 15 : preset === "30d" ? 30 : 1;
  const from = startOfDay(now);
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
}

function formatReportDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function stockStatusLabel(item: SellableItem): string {
  if (item.stockQuantity <= 0) return "No Stock";
  if (isLowStock(item)) return "Low Stock";
  return "In Stock";
}

function stockQtyLabel(item: SellableItem): string {
  return item.unitType === "pour"
    ? `${item.stockQuantity} ml`
    : `${item.stockQuantity} bottles`;
}

interface StockUsedRow {
  name: string;
  quantity: number;
  stockDeducted: number;
  unitType: StockUnitType;
}

function aggregateStockUsed(range: StockReportRange): StockUsedRow[] {
  const orders = getCompletedOrders().filter((o) => {
    const completed = new Date(o.completedAt ?? o.createdAt);
    return completed >= range.from && completed <= range.to;
  });

  const map = new Map<string, StockUsedRow>();
  for (const order of orders) {
    for (const line of order.items) {
      const existing = map.get(line.menuItemId);
      if (existing) {
        existing.quantity += line.quantity;
        existing.stockDeducted += line.stockDeducted;
      } else {
        map.set(line.menuItemId, {
          name: line.itemName,
          quantity: line.quantity,
          stockDeducted: line.stockDeducted,
          unitType: line.unitType,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function downloadStockReportPdf(
  range: StockReportRange,
  managerName?: string
): void {
  const items = [...getSellableItems()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const stockUsed = aggregateStockUsed(range);

  const inStock = items.filter(
    (i) => i.stockQuantity > 0 && !isLowStock(i)
  ).length;
  const lowStock = items.filter(
    (i) => i.stockQuantity > 0 && isLowStock(i)
  ).length;
  const noStock = items.filter((i) => i.stockQuantity <= 0).length;

  const doc = new jsPDF();
  const margin = 14;

  doc.setFontSize(18);
  doc.text("The Pour Stop — Stock Report", margin, 20);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Period: ${formatReportDate(range.from)} to ${formatReportDate(range.to)}`,
    margin,
    28
  );
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, margin, 34);
  if (managerName) {
    doc.text(`Prepared by: ${managerName}`, margin, 40);
  }

  const summaryY = managerName ? 48 : 42;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(
    `Summary: ${items.length} items  |  In stock: ${inStock}  |  Low: ${lowStock}  |  Out: ${noStock}`,
    margin,
    summaryY
  );

  autoTable(doc, {
    startY: summaryY + 6,
    head: [["Item", "Category", "Type", "Stock", "Status"]],
    body: items.map((item) => [
      item.name,
      categoryLabel(item.category),
      item.unitType === "pour" ? "Pour" : "Bottle",
      stockQtyLabel(item),
      stockStatusLabel(item),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 120, 90], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  const tableEnd =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 10;

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Stock Used (Completed Bills in Period)", margin, tableEnd);

  if (stockUsed.length > 0) {
    autoTable(doc, {
      startY: tableEnd + 4,
      head: [["Item", "Qty Sold", "Stock Deducted"]],
      body: stockUsed.map((row) => [
        row.name,
        String(row.quantity),
        row.unitType === "pour"
          ? `${row.stockDeducted} ml`
          : `${row.stockDeducted} bottles`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255 },
      margin: { left: margin, right: margin },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "No stock deductions from completed bills in this period.",
      margin,
      tableEnd + 8
    );
  }

  const fromKey = toDateInputValue(range.from);
  const toKey = toDateInputValue(range.to);
  const filename =
    fromKey === toKey
      ? `stock-report-${fromKey}.pdf`
      : `stock-report-${fromKey}-to-${toKey}.pdf`;

  doc.save(filename);
}
