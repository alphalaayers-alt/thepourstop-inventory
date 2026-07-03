"use client";

import { useEffect } from "react";
import { AddInventoryForm } from "@/components/inventory/AddInventoryForm";

interface AddInventoryModalProps {
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

function ItemIcon() {
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
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

export function AddInventoryModal({ onClose, onSaved }: AddInventoryModalProps) {
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
      aria-labelledby="add-item-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close add item dialog"
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
              <ItemIcon />
            </div>
            <div>
              <h2 id="add-item-title" className="text-lg font-semibold tracking-tight">
                New Item
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-emerald-50/90">
                Add a new product to your menu.
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AddInventoryForm
            bare
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
