"use client";

import { useEffect, useState } from "react";
import type { Table } from "@/types/inventory";
import { getActiveOrderForTable } from "@/lib/orders";
import {
  getTableById,
  getTableDisplayName,
  updateTableName,
} from "@/lib/tables";
import { showError, showSuccess } from "@/lib/toast";
import { BillingPanel } from "@/components/billing/BillingPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TableOrderModalProps {
  tableId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function TableOrderModal({ tableId, onClose, onUpdated }: TableOrderModalProps) {
  const [table, setTable] = useState<Table | null>(null);
  const [tableName, setTableName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isCheckoutView, setIsCheckoutView] = useState(false);

  function load() {
    const t = getTableById(tableId);
    if (!t) {
      onClose();
      return;
    }
    setTable(t);
    setTableName(getTableDisplayName(t));
    const active = getActiveOrderForTable(tableId);
    setActiveOrderId(active?.id ?? t.activeOrderId);
  }

  useEffect(() => {
    load();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tableId, onClose]);

  function handleSaveName() {
    setNameError("");
    const result = updateTableName(tableId, tableName);
    if (result.success) {
      setTable(result.table);
      setEditingName(false);
      showSuccess("Table name saved", tableName.trim() || `Table ${table?.number ?? ""}`);
      onUpdated();
    } else {
      setNameError(result.error);
    }
  }

  if (!table) return null;

  const isRunning = table.status === "running" || !!activeOrderId;
  const displayName = getTableDisplayName(table);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className={`relative flex max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5 ${
          isCheckoutView ? "w-[70vw] max-w-[70vw]" : "w-full max-w-md"
        }`}
      >
        {!isCheckoutView && (
          <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-5">
            {editingName ? (
              <div className="space-y-3">
                <Input
                  label="Table name"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveName}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingName(false);
                      setTableName(displayName);
                      setNameError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {nameError && <p className="text-sm text-red-600">{nameError}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md ${
                    isRunning
                      ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-200"
                      : "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-200"
                  }`}
                >
                  {table.number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                      {displayName}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        isRunning
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isRunning ? "Running" : "Open"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="mt-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
                  >
                    Rename table
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className={`flex min-h-0 flex-1 flex-col ${
            isCheckoutView ? "overflow-hidden" : "overflow-y-auto bg-slate-50/50"
          }`}
        >
          <BillingPanel
            type="table"
            tableId={table.id}
            tableNumber={table.number}
            tableName={displayName}
            existingOrderId={activeOrderId}
            deductOnServe
            compact
            tableModal
            onCheckoutViewChange={setIsCheckoutView}
            onComplete={() => {
              onUpdated();
              onClose();
            }}
            onItemServed={() => {
              onUpdated();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
