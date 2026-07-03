import type { Order, OrderDiscount } from "@/types/inventory";

export interface BillDiscountOption {
  id: string;
  label: string;
  percent: number;
}

export const BILL_DISCOUNT_OPTIONS: BillDiscountOption[] = [
  { id: "none", label: "No discount", percent: 0 },
  { id: "flat-1", label: "Flat 1% discount", percent: 1 },
  { id: "flat-2", label: "Flat 2% discount", percent: 2 },
  { id: "flat-3", label: "Flat 3% discount", percent: 3 },
  { id: "flat-4", label: "Flat 4% discount", percent: 4 },
  { id: "flat-10", label: "Get Flat 10% off on your order value", percent: 10 },
  { id: "flat-20", label: "Get Flat 20% off on your order value", percent: 20 },
];

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function calculateOrderTotals(
  items: Order["items"],
  discount?: OrderDiscount | null
): {
  subtotal: number;
  discountLabel: string | null;
  discountPercent: number;
  discountAmount: number;
  total: number;
} {
  const subtotal = roundMoney(items.reduce((sum, line) => sum + line.lineTotal, 0));
  const percent = discount?.percent ?? 0;
  const discountAmount =
    percent > 0 ? roundMoney((subtotal * percent) / 100) : 0;
  const total = roundMoney(subtotal - discountAmount);

  return {
    subtotal,
    discountLabel: percent > 0 ? (discount?.label ?? `${percent}% off`) : null,
    discountPercent: percent,
    discountAmount,
    total,
  };
}
