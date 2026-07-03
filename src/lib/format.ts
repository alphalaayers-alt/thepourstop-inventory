import { getCategoryName } from "@/lib/categories";
import { getBillingPourOptions, getBasePegMl } from "@/lib/pour-sizes";
import type { PourSizePrice } from "@/types/inventory";

export function formatMoney(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatStockQuantity(item: {
  unitType: "bottle" | "pour";
  stockQuantity: number;
}): string {
  if (item.unitType === "bottle") {
    return `${item.stockQuantity} bottle${item.stockQuantity !== 1 ? "s" : ""}`;
  }
  return `${item.stockQuantity} ml`;
}

/** Standard peg count from stock (30ml pegs) — for inventory cards */
export function formatStockPegs(item: {
  unitType: "bottle" | "pour";
  stockQuantity: number;
  servingSizeMl: number;
  pourSizes?: PourSizePrice[];
}): string {
  if (item.unitType === "bottle") {
    const n = item.stockQuantity;
    return `${n} serving${n !== 1 ? "s" : ""}`;
  }
  const pegMl = getBasePegMl(item);
  const pegs = Math.floor(item.stockQuantity / pegMl);
  return `${pegs} peg${pegs !== 1 ? "s" : ""} @ ${pegMl}ml`;
}

export function formatStock(item: {
  unitType: "bottle" | "pour";
  stockQuantity: number;
  servingSizeMl: number;
  pourSizes?: PourSizePrice[];
}): string {
  if (item.unitType === "bottle") {
    return formatStockQuantity(item);
  }
  return `${formatStockQuantity(item)} · ${formatStockPegs(item)}`;
}

export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isWithinLastMonths(iso: string, months: number): boolean {
  const date = new Date(iso);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return date >= cutoff;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateKey(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dateKey;
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function categoryLabel(category: string): string {
  if (typeof window !== "undefined") {
    return getCategoryName(category);
  }
  return category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatSellPrice(item: {
  unitType: "bottle" | "pour";
  sellPrice: number;
  servingSizeMl: number;
  pourSizes?: PourSizePrice[];
  category?: string;
}): string {
  if (item.unitType === "pour") {
    const options = getBillingPourOptions(item);
    if (options.length === 0) return formatMoney(item.sellPrice);
    return options.map((o) => `${formatMoney(o.price)}/${o.label}`).join(" · ");
  }
  if (item.category === "cocktail") {
    return `${formatMoney(item.sellPrice)} / glass`;
  }
  return formatMoney(item.sellPrice);
}

export function getServingsAvailable(item: {
  unitType: "bottle" | "pour";
  stockQuantity: number;
  servingSizeMl: number;
  pourSizes?: PourSizePrice[];
}): number {
  if (item.unitType === "bottle") return item.stockQuantity;
  const pegMl = getBasePegMl(item);
  return Math.floor(item.stockQuantity / pegMl);
}
