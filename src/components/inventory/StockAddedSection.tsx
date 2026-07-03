"use client";

import { useMemo, useState } from "react";
import type { StockAddition } from "@/types/inventory";
import { getStockAdditionsInRange } from "@/lib/stock-additions";
import {
  getReportRangeForPreset,
  parseDateTimeInput,
  toDateTimeInputValue,
  type StockReportPreset,
} from "@/lib/stock-report";
import { categoryLabel, formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const PRESETS: { id: Exclude<StockReportPreset, "custom">; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "15d", label: "15 days" },
  { id: "30d", label: "30 days" },
];

function quantityLabel(entry: StockAddition): string {
  return entry.unitType === "pour"
    ? `${entry.quantity} ml`
    : `${entry.quantity} bottle${entry.quantity !== 1 ? "s" : ""}`;
}

function typeBadge(entry: StockAddition) {
  if (entry.type === "initial") return <Badge variant="success">New</Badge>;
  if (entry.type === "restock") return <Badge variant="info">Restock</Badge>;
  return <Badge variant="neutral">Added</Badge>;
}

function formatRangeSummary(from: Date, to: Date): string {
  const sameDay = from.toDateString() === to.toDateString();
  if (sameDay) {
    return `${formatDate(from.toISOString())}, ${from.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} – ${to.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `${formatDateTime(from.toISOString())} → ${formatDateTime(to.toISOString())}`;
}

interface StockAddedSectionProps {
  refreshKey?: number;
}

export function StockAddedSection({ refreshKey = 0 }: StockAddedSectionProps) {
  const todayRange = getReportRangeForPreset("today");
  const [preset, setPreset] = useState<StockReportPreset>("today");
  const [fromDateTime, setFromDateTime] = useState(() =>
    toDateTimeInputValue(todayRange.from)
  );
  const [toDateTime, setToDateTime] = useState(() =>
    toDateTimeInputValue(todayRange.to)
  );
  const [appliedFrom, setAppliedFrom] = useState(fromDateTime);
  const [appliedTo, setAppliedTo] = useState(toDateTime);
  const [filterError, setFilterError] = useState("");
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  function handleApply(
    fromStr = fromDateTime,
    toStr = toDateTime,
    nextPreset: StockReportPreset = "custom"
  ) {
    const from = parseDateTimeInput(fromStr);
    const to = parseDateTimeInput(toStr);
    if (!from || !to) {
      setFilterError("Please select a valid from and to date & time.");
      return;
    }
    if (from > to) {
      setFilterError("From must be before to.");
      return;
    }
    setFilterError("");
    setPreset(nextPreset);
    setAppliedFrom(fromStr);
    setAppliedTo(toStr);
  }

  function applyPreset(next: Exclude<StockReportPreset, "custom">) {
    const range = getReportRangeForPreset(next);
    const from = toDateTimeInputValue(range.from);
    const to = toDateTimeInputValue(range.to);
    setFromDateTime(from);
    setToDateTime(to);
    handleApply(from, to, next);
  }

  function handleFromChange(value: string) {
    setFromDateTime(value);
    setPreset("custom");
    setFilterError("");
  }

  function handleToChange(value: string) {
    setToDateTime(value);
    setPreset("custom");
    setFilterError("");
  }

  const isDraft =
    fromDateTime !== appliedFrom || toDateTime !== appliedTo;

  const entries = useMemo(() => {
    void refreshKey;
    void localRefreshKey;
    const from = parseDateTimeInput(appliedFrom);
    const to = parseDateTimeInput(appliedTo);
    if (!from || !to) return [];
    return getStockAdditionsInRange(from, to);
  }, [appliedFrom, appliedTo, refreshKey, localRefreshKey]);

  const appliedFromDate = parseDateTimeInput(appliedFrom);
  const appliedToDate = parseDateTimeInput(appliedTo);
  const rangeLabel =
    appliedFromDate && appliedToDate
      ? formatRangeSummary(appliedFromDate, appliedToDate)
      : "";

  const emptyDateLabel =
    appliedFromDate && appliedToDate
      ? appliedFromDate.toDateString() === appliedToDate.toDateString()
        ? formatDate(appliedFromDate.toISOString())
        : `${formatDate(appliedFromDate.toISOString())} to ${formatDate(appliedToDate.toISOString())}`
      : "this date range";

  const datetimeClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-300";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header + filters */}
      <div className="border-b border-slate-100 bg-slate-50/40 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Stock Added</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              When and how much stock was added to inventory
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  preset === p.id
                    ? "bg-emerald-700 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">From</span>
            <input
              type="datetime-local"
              value={fromDateTime}
              onChange={(e) => handleFromChange(e.target.value)}
              className={datetimeClass}
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">To</span>
            <input
              type="datetime-local"
              value={toDateTime}
              onChange={(e) => handleToChange(e.target.value)}
              className={datetimeClass}
            />
          </label>
          <Button
            type="button"
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => handleApply()}
          >
            Apply
          </Button>
        </div>

        {filterError && (
          <p className="mt-2 text-sm text-red-600">{filterError}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            {rangeLabel}
            {isDraft && (
              <span className="ml-2 text-amber-600">· Press Apply to update</span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <span>
              <span className="font-semibold text-slate-800">{entries.length}</span>{" "}
              record{entries.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setLocalRefreshKey((k) => k + 1)}
              className="font-medium text-emerald-700 hover:text-emerald-800"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">
            No items added in this date
          </p>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            No stock was added to inventory on{" "}
            <span className="font-medium text-slate-500">{emptyDateLabel}</span>.
            Try a different date range or add stock from the inventory page.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="px-4 py-2.5 font-medium sm:px-5">Date &amp; Time</th>
                  <th className="px-4 py-2.5 font-medium sm:px-5">Item</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell sm:px-5">
                    Category
                  </th>
                  <th className="px-4 py-2.5 font-medium sm:px-5">Qty</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell md:px-5">
                    Purchase
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium lg:table-cell lg:px-5">
                    By
                  </th>
                  <th className="px-4 py-2.5 font-medium sm:px-5">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 sm:px-5">
                      {formatDateTime(entry.addedAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 sm:px-5">
                      {entry.itemName}
                      <span className="mt-0.5 block text-xs font-normal text-slate-400 sm:hidden">
                        {categoryLabel(entry.category)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 sm:table-cell sm:px-5">
                      {categoryLabel(entry.category)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-emerald-700 sm:px-5">
                      +{quantityLabel(entry)}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell md:px-5">
                      {formatMoney(entry.purchasePrice)}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell lg:px-5">
                      {entry.managerName}
                    </td>
                    <td className="px-4 py-3 sm:px-5">{typeBadge(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-500 sm:px-5">
            Total added:{" "}
            <span className="font-medium text-slate-700">
              {entries.reduce((sum, e) => sum + e.quantity, 0)}
            </span>{" "}
            units in selected period
          </div>
        </>
      )}
    </div>
  );
}
