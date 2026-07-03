"use client";

import { useEffect } from "react";
import { AddStockForm } from "@/components/inventory/AddStockForm";

interface AddStockModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function StockIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

export function AddStockModal({ onClose, onSaved }: AddStockModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-stock-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close add stock dialog"
      />

      <div className="relative flex max-h-[min(90vh,680px)] w-full max-w-md min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl sm:max-w-lg">
        <div className="relative shrink-0 bg-gradient-to-br from-teal-700 via-emerald-700 to-emerald-800 px-4 pb-4 pt-4 text-white sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Close"
          >
            <CloseIcon />
          </button>

          <div className="flex items-start gap-3 pr-10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <StockIcon />
            </div>
            <div>
              <h2 id="add-stock-title" className="text-lg font-semibold tracking-tight">
                Add Stock
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-emerald-50/90">
                Restock an existing menu item.
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AddStockForm
            inModal
            onSuccess={() => {
              onSaved();
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
