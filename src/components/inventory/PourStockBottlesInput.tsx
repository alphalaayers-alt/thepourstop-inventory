"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface StockBottleRow {
  id: string;
  count: string;
  ml: string;
}

export function createStockBottleRow(): StockBottleRow {
  return { id: crypto.randomUUID(), count: "", ml: "" };
}

function parsePositive(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function totalMlFromStockBottleRows(rows: StockBottleRow[]): number {
  return rows.reduce((sum, row) => {
    const count = parsePositive(row.count);
    const ml = parsePositive(row.ml);
    if (count > 0 && ml > 0) return sum + count * ml;
    return sum;
  }, 0);
}

export function stockBottleRowBreakdown(rows: StockBottleRow[]): string[] {
  return rows
    .map((row) => {
      const count = parsePositive(row.count);
      const ml = parsePositive(row.ml);
      if (count <= 0 || ml <= 0) return null;
      return `${count} × ${ml.toLocaleString("en-IN")} ml = ${(count * ml).toLocaleString("en-IN")} ml`;
    })
    .filter((line): line is string => line != null);
}

interface PourStockBottlesInputProps {
  rows: StockBottleRow[];
  onChange: (rows: StockBottleRow[]) => void;
  menuBottleSizeMl?: number;
  currentStockMl?: number;
  pegMl?: number;
  /** Tighter layout for modals — single column, no nested boxes */
  compact?: boolean;
}

export function PourStockBottlesInput({
  rows,
  onChange,
  menuBottleSizeMl,
  currentStockMl,
  pegMl,
  compact = false,
}: PourStockBottlesInputProps) {
  const totalToAdd = useMemo(() => totalMlFromStockBottleRows(rows), [rows]);
  const breakdown = useMemo(() => stockBottleRowBreakdown(rows), [rows]);

  function updateRow(id: string, field: "count" | "ml", value: string) {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    onChange([...rows, createStockBottleRow()]);
  }

  function removeRow(id: string) {
    if (rows.length <= 1) {
      onChange([createStockBottleRow()]);
      return;
    }
    onChange(rows.filter((row) => row.id !== id));
  }

  const mlPlaceholder =
    menuBottleSizeMl && menuBottleSizeMl > 0
      ? `e.g. ${menuBottleSizeMl} ml`
      : "e.g. 750 ml";

  const summaryBlock =
    breakdown.length > 0 ? (
      <div
        className={
          compact
            ? "rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900"
            : "rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900"
        }
      >
        {breakdown.map((line) => (
          <p key={line} className="text-xs sm:text-sm">
            {line}
          </p>
        ))}
        <p className="mt-1.5 text-sm font-semibold">
          Adding {totalToAdd.toLocaleString("en-IN")} ml
          {currentStockMl != null && (
            <span className="block text-xs font-normal text-emerald-800/90">
              New total: {(currentStockMl + totalToAdd).toLocaleString("en-IN")} ml
              {pegMl != null && pegMl > 0 && (
                <> · {Math.floor((currentStockMl + totalToAdd) / pegMl)} pegs</>
              )}
            </span>
          )}
        </p>
      </div>
    ) : null;

  if (compact) {
    return (
      <div className="min-w-0 space-y-3">
        {menuBottleSizeMl != null && menuBottleSizeMl > 0 && (
          <p className="text-xs text-slate-500">
            Standard bottle size: {menuBottleSizeMl} ml
          </p>
        )}

        {rows.map((row, index) => (
          <div
            key={row.id}
            className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3"
          >
            {rows.length > 1 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  Bottle size {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="grid min-w-0 grid-cols-2 gap-3">
              <Input
                label="Bottles"
                type="number"
                min={1}
                placeholder="e.g. 4"
                value={row.count}
                onChange={(e) => updateRow(row.id, "count", e.target.value)}
              />
              <Input
                label="Ml each"
                type="number"
                min={1}
                placeholder={mlPlaceholder}
                value={row.ml}
                onChange={(e) => updateRow(row.id, "ml", e.target.value)}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
        >
          + Add another bottle size
        </button>

        {summaryBlock}
      </div>
    );
  }

  return (
    <div className="col-span-full space-y-3 rounded-lg border border-sky-200/80 bg-sky-50/40 p-4">
      <div>
        <p className="text-sm font-medium text-slate-800">Stock in bottles</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Add one row per bottle size — e.g. 4 bottles at 450 ml and 2 bottles at 250 ml.
          Total ml is calculated automatically.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border border-sky-100 bg-white p-3 sm:grid-cols-2"
          >
            <Input
              label={index === 0 ? "Number of bottles" : "Bottles"}
              type="number"
              min={1}
              placeholder="Enter count"
              value={row.count}
              onChange={(e) => updateRow(row.id, "count", e.target.value)}
            />
            <Input
              label={index === 0 ? "Ml per bottle" : "Ml"}
              type="number"
              min={1}
              placeholder={mlPlaceholder}
              value={row.ml}
              onChange={(e) => updateRow(row.id, "ml", e.target.value)}
              hint={
                index === 0 && menuBottleSizeMl
                  ? `Menu bottle size: ${menuBottleSizeMl} ml`
                  : undefined
              }
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="sm:col-span-2 sm:justify-self-end"
              onClick={() => removeRow(row.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" size="sm" onClick={addRow}>
        + Add another bottle size
      </Button>

      {summaryBlock}
    </div>
  );
}
