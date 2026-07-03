import { roundMoney } from "@/lib/discounts";

export type PaymentMethodType = "cash" | "online" | "split";

export interface BillPayment {
  method: PaymentMethodType;
  cashAmount: number;
  onlineAmount: number;
}

export function defaultBillPayment(total: number): BillPayment {
  const amount = roundMoney(Math.max(0, total));
  return { method: "cash", cashAmount: amount, onlineAmount: 0 };
}

/** Keep payment in sync when bill total changes (discount applied) */
export function syncPaymentToTotal(
  payment: BillPayment,
  total: number
): BillPayment {
  const billTotal = roundMoney(Math.max(0, total));

  if (payment.method === "cash") {
    return { method: "cash", cashAmount: billTotal, onlineAmount: 0 };
  }
  if (payment.method === "online") {
    return { method: "online", cashAmount: 0, onlineAmount: billTotal };
  }

  const cash = roundMoney(Math.min(payment.cashAmount, billTotal));
  const online = roundMoney(billTotal - cash);
  return { method: "split", cashAmount: cash, onlineAmount: online };
}

export function setPaymentMethod(
  method: PaymentMethodType,
  total: number
): BillPayment {
  const billTotal = roundMoney(Math.max(0, total));
  if (method === "cash") {
    return { method: "cash", cashAmount: billTotal, onlineAmount: 0 };
  }
  if (method === "online") {
    return { method: "online", cashAmount: 0, onlineAmount: billTotal };
  }
  return {
    method: "split",
    cashAmount: roundMoney(billTotal / 2),
    onlineAmount: roundMoney(billTotal - billTotal / 2),
  };
}

export function validateBillPayment(
  payment: BillPayment,
  total: number
): { ok: true } | { ok: false; error: string } {
  const billTotal = roundMoney(Math.max(0, total));
  const cash = roundMoney(payment.cashAmount);
  const online = roundMoney(payment.onlineAmount);
  const sum = roundMoney(cash + online);

  if (cash < 0 || online < 0) {
    return { ok: false, error: "Payment amounts cannot be negative." };
  }

  if (payment.method === "cash") {
    if (cash !== billTotal || online !== 0) {
      return { ok: false, error: `Cash payment must equal ${billTotal}.` };
    }
    return { ok: true };
  }

  if (payment.method === "online") {
    if (online !== billTotal || cash !== 0) {
      return { ok: false, error: `Online payment must equal ${billTotal}.` };
    }
    return { ok: true };
  }

  if (cash <= 0 || online <= 0) {
    return {
      ok: false,
      error: "Split payment needs both cash and online amounts.",
    };
  }

  if (sum !== billTotal) {
    return {
      ok: false,
      error: `Cash + online must equal the bill total (${billTotal}).`,
    };
  }

  return { ok: true };
}

export function formatPaymentSummary(payment: BillPayment): string {
  if (payment.method === "cash") {
    return "Cash";
  }
  if (payment.method === "online") {
    return "Online";
  }
  return `Cash ${payment.cashAmount} + Online ${payment.onlineAmount}`;
}

export function formatPaymentDetail(
  payment: BillPayment,
  formatMoney: (n: number) => string
): string {
  if (payment.method === "cash") {
    return `Cash · ${formatMoney(payment.cashAmount)}`;
  }
  if (payment.method === "online") {
    return `Online · ${formatMoney(payment.onlineAmount)}`;
  }
  return `Cash ${formatMoney(payment.cashAmount)} + Online ${formatMoney(payment.onlineAmount)}`;
}
