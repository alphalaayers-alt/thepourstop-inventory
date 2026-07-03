"use client";

import { useEffect, useMemo, useState } from "react";
import type { Order } from "@/types/inventory";
import { calculateOrderTotals, type BillDiscountOption } from "@/lib/discounts";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  defaultBillPayment,
  syncPaymentToTotal,
  validateBillPayment,
  type BillPayment,
} from "@/lib/payments";
import { printBill } from "@/lib/bill-print";
import { Button } from "@/components/ui/Button";
import {
  DiscountSelector,
  getSelectedDiscountOption,
} from "@/components/billing/DiscountSelector";
import { PaymentSelector } from "@/components/billing/PaymentSelector";
import { showError } from "@/lib/toast";

export interface BillCheckoutProps {
  order: Order;
  billTitle: string;
  printTitle?: string;
  orderSummarySubtitle?: string;
  confirmLabel?: string;
  onBack: () => void;
  onConfirm: (discount: BillDiscountOption, payment: BillPayment) => void;
  isLoading?: boolean;
}

export function BillCheckout({
  order,
  billTitle,
  printTitle,
  orderSummarySubtitle = "Items on this bill",
  confirmLabel = "Confirm & close",
  onBack,
  onConfirm,
  isLoading = false,
}: BillCheckoutProps) {
  const [selectedDiscountId, setSelectedDiscountId] = useState("none");
  const [payment, setPayment] = useState<BillPayment>(() =>
    defaultBillPayment(order.total)
  );

  const selectedDiscount = getSelectedDiscountOption(selectedDiscountId);

  const totals = useMemo(
    () =>
      calculateOrderTotals(order.items, {
        label: selectedDiscount.label,
        percent: selectedDiscount.percent,
      }),
    [order.items, selectedDiscount]
  );

  useEffect(() => {
    setPayment((prev) => syncPaymentToTotal(prev, totals.total));
  }, [totals.total]);

  const previewOrder: Order = {
    ...order,
    ...totals,
    paymentMethod: payment.method,
    paymentCashAmount: payment.cashAmount,
    paymentOnlineAmount: payment.onlineAmount,
  };

  function handlePrint() {
    printBill(previewOrder, printTitle ?? billTitle);
  }

  function handleConfirm() {
    const check = validateBillPayment(payment, totals.total);
    if (!check.ok) {
      showError("Payment incomplete", check.error);
      return;
    }
    onConfirm(selectedDiscount, payment);
  }

  return (
    <div className="flex min-h-[640px] flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      <div className="shrink-0 border-b border-slate-200/60 bg-white/90 px-8 py-5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Final Bill
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              {billTitle}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {formatDateTime(new Date().toISOString())}
              <span className="mx-1.5 text-slate-300">·</span>
              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden px-8 py-6 xl:grid-cols-[1.05fr_1fr]">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
          <div className="shrink-0 border-b border-slate-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Order summary</h3>
            <p className="mt-0.5 text-xs text-slate-400">{orderSummarySubtitle}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 pb-2">Item</th>
                  <th className="px-4 pb-2 text-center">Qty</th>
                  <th className="px-4 pb-2 text-right">Rate</th>
                  <th className="px-4 pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((line, i) => (
                  <tr
                    key={`${line.menuItemId}-${line.pourOptionId ?? line.servingSizeMl}`}
                    className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white"}
                  >
                    <td className="rounded-l-xl px-4 py-3.5">
                      <p className="font-medium text-slate-900">{line.itemName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {line.unitType === "pour"
                          ? line.pourLabel ?? `${line.servingSizeMl}ml`
                          : "Bottle"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm tabular-nums text-slate-700">
                      {line.quantity}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm tabular-nums text-slate-500">
                      {formatMoney(line.unitPrice)}
                    </td>
                    <td className="rounded-r-xl px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {formatMoney(line.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 border-t border-slate-100 px-6 py-3.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {formatMoney(totals.subtotal)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
            <div className="shrink-0 border-b border-slate-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Apply discount</h3>
              <p className="mt-0.5 text-xs text-slate-400">Select one offer for this bill</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <DiscountSelector
                selectedDiscountId={selectedDiscountId}
                onSelect={setSelectedDiscountId}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
            <div className="shrink-0 border-b border-slate-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Payment method</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                How the customer paid this bill
              </p>
            </div>
            <div className="overflow-auto p-4">
              <PaymentSelector
                total={totals.total}
                payment={payment}
                onChange={setPayment}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-800/10 bg-slate-900 px-8 py-5">
        <div className="flex items-center justify-between gap-8">
          <div className="flex flex-wrap items-center gap-10">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Subtotal
              </p>
              <p className="mt-0.5 text-lg font-medium tabular-nums text-slate-300">
                {formatMoney(totals.subtotal)}
              </p>
            </div>
            {totals.discountAmount > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80">
                  You save
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-400">
                  −{formatMoney(totals.discountAmount)}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Amount payable
              </p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight tabular-nums text-white">
                {formatMoney(totals.total)}
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleConfirm}
            isLoading={isLoading}
            size="lg"
            className="!bg-emerald-500 !px-8 !py-3 !text-base !font-semibold hover:!bg-emerald-400 disabled:!bg-emerald-500/50"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
