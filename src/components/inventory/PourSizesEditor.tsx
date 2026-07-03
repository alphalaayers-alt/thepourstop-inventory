"use client";

import { useState, type ReactNode } from "react";
import type { PourSizePrice } from "@/types/inventory";
import {
  DEFAULT_PEG_ML,
  comboPegTaken,
  createPourComboId,
  fullBottleLabel,
  fullBottleMlTaken,
  mergePourSizes,
  splitPourSizes,
} from "@/lib/pour-sizes";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PourSizesEditorProps {
  sizes: PourSizePrice[];
  onChange: (sizes: PourSizePrice[]) => void;
  compact?: boolean;
}

function comboLabel(pours: number): string {
  return `${pours} Peg Combo`;
}

function refreshComboLabel(
  pours: number,
  ml: number,
  currentLabel?: string
): string {
  const trimmed = currentLabel?.trim();
  if (!trimmed) return comboLabel(pours);
  if (/^\d+\s*Peg Combo$/i.test(trimmed)) return comboLabel(pours);
  if (/^\d+×\d+ml Combo$/i.test(trimmed)) return `${pours}×${ml}ml Combo`;
  return trimmed;
}

function parsePriceInput(value: string): number {
  if (value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function defaultFullBottleDraft(): PourSizePrice {
  return {
    id: createPourComboId(),
    ml: 0,
    price: 0,
    pours: 1,
    isFullBottle: true,
    label: "",
  };
}

function defaultBlankCombo(): PourSizePrice {
  return {
    id: createPourComboId(),
    ml: 0,
    pours: 0,
    price: 0,
    isCombo: true,
    label: "",
  };
}

function AddLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
    >
      {children}
    </button>
  );
}

export function PourSizesEditor({ sizes, onChange, compact = false }: PourSizesEditorProps) {
  const split = splitPourSizes(sizes);
  const { base30, fullBottles, custom, combos } = split;
  const [comboHint, setComboHint] = useState("");
  const [fullBottleHint, setFullBottleHint] = useState("");

  function emit(
    base: PourSizePrice,
    customRows: PourSizePrice[],
    comboRows: PourSizePrice[],
    fullBottleRows: PourSizePrice[] = fullBottles
  ) {
    onChange(
      mergePourSizes(
        base,
        customRows,
        comboRows.map((combo) => ({
          ...combo,
          id: combo.id ?? createPourComboId(),
          isCombo: true,
        })),
        fullBottleRows
      )
    );
  }

  function updateBase30(price: number) {
    emit({ ...base30, ml: DEFAULT_PEG_ML, pours: 1, price, isCombo: false }, custom, combos);
  }

  function updateFullBottle(
    bottleId: string,
    field: "ml" | "price",
    value: number
  ) {
    const current = fullBottles.find((bottle) => bottle.id === bottleId);
    if (!current) return;

    const ml = field === "ml" ? value : current.ml;
    const price = field === "price" ? value : current.price;

    if (field === "ml" && fullBottleMlTaken(fullBottles, ml, bottleId)) {
      setFullBottleHint(`${ml}ml full bottle already added. Use a different size.`);
      return;
    }

    setFullBottleHint("");
    emit(base30, custom, combos, fullBottles.map((bottle) =>
      bottle.id === bottleId
        ? {
            ...bottle,
            ml,
            price,
            pours: 1,
            isCombo: false,
            isFullBottle: true,
            label: ml > 0 ? fullBottleLabel(ml) : "",
          }
        : bottle
    ));
  }

  function addFullBottle() {
    setFullBottleHint("");
    emit(base30, custom, combos, [...fullBottles, defaultFullBottleDraft()]);
  }

  function removeFullBottle(bottleId: string) {
    setFullBottleHint("");
    emit(
      base30,
      custom,
      combos,
      fullBottles.filter((bottle) => bottle.id !== bottleId)
    );
  }

  function updateCustom(index: number, field: "ml" | "price", value: number) {
    const next = [...custom];
    next[index] = { ...next[index], [field]: value, pours: 1, isCombo: false };
    emit(base30, next, combos);
  }

  function addCustom() {
    emit(base30, [...custom, { id: createPourComboId(), ml: 0, price: 0, pours: 1 }], combos);
  }

  function removeCustom(index: number) {
    emit(base30, custom.filter((_, i) => i !== index), combos);
  }

  function updateCombo(
    comboId: string,
    field: "pours" | "ml" | "price" | "label",
    value: number | string
  ) {
    const current = combos.find((combo) => combo.id === comboId);
    if (!current) return;

    const pours =
      field === "pours" ? Number(value) || 0 : current.pours ?? 0;
    const ml = field === "ml" ? Number(value) || 0 : current.ml ?? 0;

    if (
      pours > 0 &&
      ml > 0 &&
      (field === "pours" || field === "ml") &&
      comboPegTaken(combos, pours, ml, comboId)
    ) {
      setComboHint(`${pours} peg combo already exists. Use a different peg count.`);
      return;
    }

    const label =
      field === "label"
        ? String(value)
        : field === "pours" || field === "ml"
          ? pours > 0 && ml > 0
            ? refreshComboLabel(pours, ml, current.label)
            : current.label ?? ""
          : current.label;

    const next = combos.map((combo) =>
      combo.id === comboId
        ? {
            ...combo,
            pours,
            ml,
            price:
              field === "price"
                ? typeof value === "string"
                  ? parsePriceInput(value)
                  : value
                : combo.price,
            label,
            isCombo: true,
          }
        : combo
    );

    setComboHint("");
    emit(base30, custom, next);
  }

  function addBlankCombo() {
    setComboHint("");
    emit(base30, custom, [...combos, defaultBlankCombo()]);
  }

  function removeCombo(comboId: string) {
    setComboHint("");
    emit(
      base30,
      custom,
      combos.filter((combo) => combo.id !== comboId)
    );
  }

  if (compact) {
    return (
      <div className="min-w-0 space-y-4">
        <Input
          label="30ml peg price"
          type="number"
          min={0}
          step="0.01"
          placeholder="Enter sell amount"
          value={base30.price || ""}
          onChange={(e) => updateBase30(Number(e.target.value))}
          required
        />

        {fullBottles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Full bottle prices (optional)</p>
            {fullBottles.map((bottle) => {
              if (!bottle.id) return null;
              return (
                <div
                  key={bottle.id}
                  className="min-w-0 space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Full bottle</span>
                    <button
                      type="button"
                      onClick={() => removeFullBottle(bottle.id!)}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-3">
                    <Input
                      label="Size (ml)"
                      type="number"
                      min={1}
                      placeholder="e.g. 750"
                      value={bottle.ml || ""}
                      onChange={(e) =>
                        updateFullBottle(bottle.id!, "ml", Number(e.target.value))
                      }
                    />
                    <Input
                      label="Sell price"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Enter sell amount"
                      value={bottle.price || ""}
                      onChange={(e) =>
                        updateFullBottle(bottle.id!, "price", Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {fullBottleHint && <p className="text-xs text-amber-700">{fullBottleHint}</p>}

        <AddLink onClick={addFullBottle}>+ Add full bottle price</AddLink>

        {combos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Combo deals (optional)</p>
            {combos.map((row) => {
              if (!row.id) return null;
              const comboId = row.id;
              return (
                <div
                  key={comboId}
                  className="min-w-0 space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Combo</span>
                    <button
                      type="button"
                      onClick={() => removeCombo(comboId)}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-3">
                    <Input
                      label="Pegs"
                      type="number"
                      min={2}
                      placeholder="e.g. 6"
                      value={row.pours || ""}
                      onChange={(e) => updateCombo(comboId, "pours", e.target.value)}
                    />
                    <Input
                      label="Ml each"
                      type="number"
                      min={1}
                      placeholder="e.g. 30"
                      value={row.ml || ""}
                      onChange={(e) => updateCombo(comboId, "ml", e.target.value)}
                    />
                    <Input
                      label="Combo price"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Enter sell amount"
                      value={row.price || ""}
                      onChange={(e) => updateCombo(comboId, "price", e.target.value)}
                    />
                    <Input
                      label="Name (optional)"
                      placeholder="e.g. 6 Peg Combo"
                      value={row.label ?? ""}
                      onChange={(e) => updateCombo(comboId, "label", e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {comboHint && <p className="text-xs text-amber-700">{comboHint}</p>}

        <AddLink onClick={addBlankCombo}>+ Add combo deal</AddLink>

        {custom.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Other pour sizes</p>
            {custom.map((row, index) => (
              <div
                key={row.id ?? index}
                className="min-w-0 space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Custom size</span>
                  <button
                    type="button"
                    onClick={() => removeCustom(index)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-3">
                  <Input
                    label="Size (ml)"
                    type="number"
                    min={1}
                    placeholder="e.g. 60"
                    value={row.ml || ""}
                    onChange={(e) => updateCustom(index, "ml", Number(e.target.value))}
                  />
                  <Input
                    label="Sell price"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Enter sell amount"
                    value={row.price || ""}
                    onChange={(e) => updateCustom(index, "price", Number(e.target.value))}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <AddLink onClick={addCustom}>+ Add custom pour size</AddLink>
      </div>
    );
  }

  return (
    <div className="col-span-full min-w-0 space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">Pour prices</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Set the 30ml peg price, optional full-bottle prices, and combo deals if you
          offer them.
        </p>
      </div>

      <div className="rounded-lg border border-emerald-200/80 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
          Single peg — 30ml
        </p>
        <div className="max-w-xs min-w-0">
          <Input
            label="Sell price"
            type="number"
            min={0}
            step="0.01"
            placeholder="Enter sell amount"
            value={base30.price || ""}
            onChange={(e) => updateBase30(Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="rounded-lg border border-sky-200/80 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-800">
          Full bottle (optional)
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Add one or more bottle sizes if you sell whole bottles. Leave price blank for
          sizes you only sell by the peg.
        </p>

        {fullBottles.length > 0 && (
          <div className="space-y-3">
            {fullBottles.map((bottle) => {
              if (!bottle.id) return null;
              return (
                <div
                  key={bottle.id}
                  className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-sky-100 bg-sky-50/40 p-3 sm:grid-cols-2"
                >
                  <Input
                    label="Bottle size (ml)"
                    type="number"
                    min={1}
                    placeholder="Enter bottle size e.g. 750"
                    value={bottle.ml || ""}
                    onChange={(e) =>
                      updateFullBottle(bottle.id!, "ml", Number(e.target.value))
                    }
                  />
                  <Input
                    label="Full bottle sell price"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Enter full bottle sell price"
                    value={bottle.price || ""}
                    onChange={(e) =>
                      updateFullBottle(bottle.id!, "price", Number(e.target.value))
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="sm:col-span-2 sm:justify-self-end"
                    onClick={() => removeFullBottle(bottle.id!)}
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {fullBottleHint && (
          <p className="mt-2 text-sm text-amber-700">{fullBottleHint}</p>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={addFullBottle}
        >
          + Add full bottle size
        </Button>
      </div>

      {custom.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Custom ml sizes
          </p>
          {custom.map((row, index) => (
            <div
              key={row.id ?? index}
              className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-2"
            >
              <Input
                label="Size (ml)"
                type="number"
                min={1}
                placeholder="Enter pour size in ml"
                value={row.ml || ""}
                onChange={(e) => updateCustom(index, "ml", Number(e.target.value))}
              />
              <Input
                label="Sell price"
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter sell price"
                value={row.price || ""}
                onChange={(e) => updateCustom(index, "price", Number(e.target.value))}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="sm:col-span-2 sm:justify-self-end"
                onClick={() => removeCustom(index)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {combos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Combo deals
          </p>
          {combos.map((row) => {
            if (!row.id) return null;
            const comboId = row.id;
            return (
            <div
              key={comboId}
              className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-amber-200/80 bg-amber-50/30 p-3 sm:grid-cols-2"
            >
              <Input
                label="Number of pegs"
                type="number"
                min={2}
                placeholder="Enter peg count"
                value={row.pours || ""}
                onChange={(e) => updateCombo(comboId, "pours", e.target.value)}
              />
              <Input
                label="Ml per peg"
                type="number"
                min={1}
                placeholder="Enter ml per peg"
                value={row.ml || ""}
                onChange={(e) => updateCombo(comboId, "ml", e.target.value)}
              />
              <Input
                label="Combo sell price"
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter combo sell price"
                value={row.price || ""}
                onChange={(e) => updateCombo(comboId, "price", e.target.value)}
              />
              <div className="flex min-w-0 items-end gap-2 sm:col-span-2">
                <Input
                  label="Display name (optional)"
                  placeholder="Enter combo name"
                  value={row.label ?? ""}
                  onChange={(e) => updateCombo(comboId, "label", e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => removeCombo(comboId)}
                >
                  ×
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {comboHint && (
        <p className="text-sm text-amber-700">{comboHint}</p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Combo deals (optional)
        </p>
        {combos.length === 0 ? (
          <p className="text-xs text-slate-500">
            Add a combo row only if you offer peg combo deals.
          </p>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={addBlankCombo}>
          + Add combo deal
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={addCustom}>
          + Custom ml size
        </Button>
      </div>
    </div>
  );
}
