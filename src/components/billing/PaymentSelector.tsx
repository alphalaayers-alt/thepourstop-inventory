"use client";

import type { BillPayment, PaymentMethodType } from "@/lib/payments";
import { roundMoney } from "@/lib/discounts";
import { formatMoney } from "@/lib/format";

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

const METHODS: { id: PaymentMethodType; label: string; hint: string; compactHint: string }[] = [
  {
    id: "cash",
    label: "Cash",
    hint: "Full amount paid in cash",
    compactHint: "Pay full amount in cash",
  },
  {
    id: "online",
    label: "Online",
    hint: "Full amount paid online (UPI / card)",
    compactHint: "UPI, card, or other online",
  },
  {
    id: "split",
    label: "Cash + Online",
    hint: "Customer pays part cash, part online",
    compactHint: "Split between cash and online",
  },
];

interface PaymentSelectorProps {
  total: number;
  payment: BillPayment;
  onChange: (payment: BillPayment) => void;
  className?: string;
  /** Use in narrow columns — stack options vertically */
  compact?: boolean;
}

export function PaymentSelector({
  total,
  payment,
  onChange,
  className = "",
  compact = false,
}: PaymentSelectorProps) {
  const billTotal = roundMoney(Math.max(0, total));
  const received = roundMoney(payment.cashAmount + payment.onlineAmount);
  const isBalanced = received === billTotal;
  const remaining = roundMoney(billTotal - received);

  function selectMethod(method: PaymentMethodType) {
    if (method === "cash") {
      onChange({ method: "cash", cashAmount: billTotal, onlineAmount: 0 });
      return;
    }
    if (method === "online") {
      onChange({ method: "online", cashAmount: 0, onlineAmount: billTotal });
      return;
    }
    onChange({
      method: "split",
      cashAmount: roundMoney(billTotal / 2),
      onlineAmount: roundMoney(billTotal - billTotal / 2),
    });
  }

  function updateSplit(field: "cash" | "online", raw: string) {
    const parsed = raw.trim() === "" ? 0 : Number(raw);
    const value = Number.isFinite(parsed) && parsed >= 0 ? roundMoney(parsed) : 0;

    if (field === "cash") {
      onChange({
        method: "split",
        cashAmount: value,
        onlineAmount: roundMoney(Math.max(0, billTotal - value)),
      });
      return;
    }

    onChange({
      method: "split",
      cashAmount: roundMoney(Math.max(0, billTotal - value)),
      onlineAmount: value,
    });
  }

  return (
    <div className={`min-w-0 space-y-2 ${compact ? "" : "space-y-3"} ${className}`}>
      <div className={`grid gap-1.5 ${compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"}`}>
        {METHODS.map((option) => {
          const selected = payment.method === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectMethod(option.id)}
              className={`group flex w-full min-w-0 items-start gap-2 rounded-lg border-2 px-2.5 py-2 text-left transition-all sm:gap-2.5 sm:px-3 sm:py-2.5 ${
                selected
                  ? "border-sky-500 bg-sky-50/80 shadow-sm shadow-sky-100"
                  : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  selected
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-slate-300 bg-white group-hover:border-slate-400"
                }`}
              >
                {selected && <CheckIcon />}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-medium ${
                    selected ? "text-sky-900" : "text-slate-700"
                  }`}
                >
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 break-words">
                  {compact ? option.compactHint : option.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {payment.method === "split" && (
        <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 sm:p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sky-800">
            Split amount
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Cash received
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter cash amount"
                value={payment.cashAmount > 0 ? payment.cashAmount : ""}
                onChange={(e) => updateSplit("cash", e.target.value)}
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm tabular-nums text-slate-900 outline-none focus:border-sky-400"
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Online received
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter online amount"
                value={payment.onlineAmount > 0 ? payment.onlineAmount : ""}
                onChange={(e) => updateSplit("online", e.target.value)}
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm tabular-nums text-slate-900 outline-none focus:border-sky-400"
              />
            </label>
          </div>
        </div>
      )}

      <div
        className={`rounded-lg px-3 py-2.5 text-sm break-words ${
          isBalanced
            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {payment.method === "cash" && (
          <span>Cash: {formatMoney(payment.cashAmount)}</span>
        )}
        {payment.method === "online" && (
          <span>Online: {formatMoney(payment.onlineAmount)}</span>
        )}
        {payment.method === "split" && (
          <span>
            Cash {formatMoney(payment.cashAmount)} + Online{" "}
            {formatMoney(payment.onlineAmount)}
            {!isBalanced && (
              <span className="mt-1 block text-xs">
                {remaining > 0
                  ? `${formatMoney(remaining)} still to allocate`
                  : `${formatMoney(Math.abs(remaining))} over the bill total`}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
