"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  downloadStockReportPdf,
  getReportRangeForPreset,
  parseDateInput,
  toDateInputValue,
  type StockReportPreset,
} from "@/lib/stock-report";
import { showError, showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface StockReportModalProps {
  onClose: () => void;
}

const PRESETS: { id: StockReportPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "15d", label: "Last 15 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
];

export function StockReportModal({ onClose }: StockReportModalProps) {
  const { session } = useAuth();
  const [preset, setPreset] = useState<StockReportPreset>("today");
  const [fromDate, setFromDate] = useState(() =>
    toDateInputValue(getReportRangeForPreset("today").from)
  );
  const [toDate, setToDate] = useState(() =>
    toDateInputValue(getReportRangeForPreset("today").to)
  );
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function applyPreset(next: StockReportPreset) {
    setPreset(next);
    setError("");
    if (next !== "custom") {
      const range = getReportRangeForPreset(next);
      setFromDate(toDateInputValue(range.from));
      setToDate(toDateInputValue(range.to));
    }
  }

  function handleDownload() {
    setError("");
    const from = parseDateInput(fromDate, false);
    const to = parseDateInput(toDate, true);

    if (from > to) {
      showError("Invalid date range", "Start date must be before or equal to end date.");
      return;
    }

    downloadStockReportPdf({ from, to }, session?.name);
    showSuccess("Report downloaded", "Your stock report PDF is ready.");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Download Stock Report</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose a date range. Report includes current stock and usage from completed
          bills in that period.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quick select
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    preset === p.id
                      ? "border-emerald-500 bg-emerald-50 font-medium text-emerald-800"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="From date"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setPreset("custom");
                setFromDate(e.target.value);
              }}
              required
            />
            <Input
              label="To date"
              type="date"
              value={toDate}
              onChange={(e) => {
                setPreset("custom");
                setToDate(e.target.value);
              }}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleDownload}>Download PDF</Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
