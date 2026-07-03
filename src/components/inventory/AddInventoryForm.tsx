"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createInventoryItem } from "@/lib/inventory";
import { getCategories, initializeCategories } from "@/lib/categories";
import { emptyPourSizeRows, ensureEditorPourSizes, getMenuBottleSizeMl } from "@/lib/pour-sizes";
import type { BeverageCategory, PourSizePrice, StockUnitType } from "@/types/inventory";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent } from "@/components/ui/Card";
import { PourSizesEditor } from "./PourSizesEditor";
import { UnitTypeToggle } from "./UnitTypeToggle";
import {
  PourStockBottlesInput,
  createStockBottleRow,
  totalMlFromStockBottleRows,
  type StockBottleRow,
} from "./PourStockBottlesInput";
import { showError, showSuccess } from "@/lib/toast";

interface AddInventoryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  bare?: boolean;
  inModal?: boolean;
}

export function AddInventoryForm({
  onSuccess,
  onCancel,
  bare = false,
  inModal = false,
}: AddInventoryFormProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<BeverageCategory>("beer");
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    initializeCategories();
    const cats = getCategories();
    setCategoryOptions(cats.map((c) => ({ value: c.slug, label: c.name })));
    setCategory((prev) =>
      cats.some((c) => c.slug === prev) ? prev : (cats[0]?.slug ?? "other")
    );
  }, []);

  const [unitType, setUnitType] = useState<StockUnitType>("bottle");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [pourSizes, setPourSizes] = useState(() => ensureEditorPourSizes(emptyPourSizeRows()));
  const [pourBottleRows, setPourBottleRows] = useState<StockBottleRow[]>(() => [
    createStockBottleRow(),
  ]);
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleUnitTypeChange(next: StockUnitType) {
    setUnitType(next);
    if (next === "pour") {
      if (pourSizes.length === 0) {
        setPourSizes(ensureEditorPourSizes(emptyPourSizeRows()));
      }
      setPourBottleRows([createStockBottleRow()]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const stockQuantity =
      unitType === "pour"
        ? totalMlFromStockBottleRows(pourBottleRows)
        : Number(quantity);

    if (unitType === "pour" && stockQuantity <= 0) {
      showError(
        "Enter stock bottles",
        "Add at least one row with bottle count and ml per bottle."
      );
      return;
    }

    setIsLoading(true);

    const result = createInventoryItem({
      name,
      category,
      unitType,
      purchasePrice: Number(purchasePrice),
      sellPrice: unitType === "bottle" ? Number(sellPrice) : undefined,
      pourSizes: unitType === "pour" ? pourSizes : undefined,
      quantity: stockQuantity,
      bottleSizeMl: unitType === "pour" ? getMenuBottleSizeMl(pourSizes) : undefined,
      managerName: session?.name ?? "Manager",
    });

    if (result.success) {
      showSuccess("Item added", `"${name.trim()}" is on the menu.`);
      if (onSuccess) onSuccess();
      else router.push("/manager/inventory");
    } else {
      showError("Could not add item", result.error);
      setIsLoading(false);
    }
  }

  function handleCancel() {
    if (onCancel) onCancel();
    else router.push("/manager/inventory");
  }

  const formClass = bare
    ? inModal
      ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/80"
      : "grid grid-cols-1 gap-4 sm:grid-cols-2"
    : "space-y-5";

  const form = (
    <form onSubmit={handleSubmit} className={formClass}>
      <Input
        label="Item name"
        placeholder="e.g. Magic Moments"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        hint="Use a unique name. To add more of an existing item, use Add Stock."
      />

      <Select
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        options={categoryOptions}
      />

      <Select
        label="How is this sold?"
        value={unitType}
        onChange={(e) => handleUnitTypeChange(e.target.value as StockUnitType)}
        options={[
          {
            value: "bottle",
            label: "Full bottle / can — sold as one complete unit",
          },
          {
            value: "pour",
            label: "By the peg — sold in pours (single peg or combo)",
          },
        ]}
      />

      {unitType === "bottle" ? (
        <Input
          label="Quantity in stock"
          type="number"
          min={1}
          placeholder="e.g. 24"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          hint="How many full bottles or cans you have right now"
        />
      ) : (
        <>
          <PourStockBottlesInput
            rows={pourBottleRows}
            onChange={setPourBottleRows}
            menuBottleSizeMl={getMenuBottleSizeMl(pourSizes)}
          />
          <PourSizesEditor sizes={pourSizes} onChange={setPourSizes} />
        </>
      )}

      <Input
        label="Purchase price"
        type="number"
        min={0}
        step="0.01"
        placeholder="Enter purchase amount"
        value={purchasePrice}
        onChange={(e) => setPurchasePrice(e.target.value)}
        required
        hint={
          unitType === "bottle"
            ? "What you paid for one bottle or can"
            : "Total amount you paid for this stock"
        }
      />

      {unitType === "bottle" ? (
        <Input
          label="Sell price"
          type="number"
          min={0}
          step="0.01"
          placeholder="Enter sell amount"
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          required
          hint="Customer price for one bottle or can"
        />
      ) : null}

      {error && (
        <div className={`rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ${bare ? "sm:col-span-2" : ""}`}>
          {error}
        </div>
      )}

      <div className={`flex gap-3 pt-2 ${bare ? "sm:col-span-2" : ""}`}>
        <Button type="submit" isLoading={isLoading}>
          Create Item
        </Button>
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );

  if (bare && !inModal) return form;

  if (bare && inModal) {
    return (
      <form onSubmit={handleSubmit} className={formClass}>
        <div className="min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5">
          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-900">Item details</p>
            <div className="space-y-4">
              <Input
                label="Item name"
                placeholder="e.g. Magic Moments"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categoryOptions}
              />

              <UnitTypeToggle value={unitType} onChange={handleUnitTypeChange} />

              {unitType === "bottle" && (
                <Input
                  label="Quantity in stock"
                  type="number"
                  min={1}
                  placeholder="e.g. 24"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              )}
            </div>
          </section>

          {unitType === "pour" && (
            <>
              <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-1 text-sm font-semibold text-slate-900">Opening stock</p>
                <p className="mb-3 text-xs text-slate-500">
                  How many bottles are you adding to start?
                </p>
                <PourStockBottlesInput
                  compact
                  rows={pourBottleRows}
                  onChange={setPourBottleRows}
                  menuBottleSizeMl={getMenuBottleSizeMl(pourSizes)}
                />
              </section>

              <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-1 text-sm font-semibold text-slate-900">Sell prices</p>
                <p className="mb-3 text-xs text-slate-500">
                  30ml peg price, plus combos or full bottles if you sell them
                </p>
                <PourSizesEditor compact sizes={pourSizes} onChange={setPourSizes} />
              </section>
            </>
          )}

          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-900">Purchase cost</p>
            <div className={`grid grid-cols-1 gap-4 ${unitType === "bottle" ? "sm:grid-cols-2" : ""}`}>
              <Input
                label="Purchase price"
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter purchase amount"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
                hint={unitType === "bottle" ? "Per bottle/can" : "Total cost of added stock"}
              />

              {unitType === "bottle" ? (
                <Input
                  label="Sell price"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Enter sell amount"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  required
                />
              ) : null}
            </div>
          </section>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full bg-teal-700 hover:bg-teal-800 sm:w-auto"
          >
            Create Item
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Card className="max-w-lg">
      <CardContent>{form}</CardContent>
    </Card>
  );
}
