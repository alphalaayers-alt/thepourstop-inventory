"use client";

import { useEffect, useState } from "react";
import type { BeverageCategory, InventoryItem, StockUnitType } from "@/types/inventory";
import { useAuth } from "@/contexts/AuthContext";
import { updateInventoryItem } from "@/lib/catalog";
import { getCategories, initializeCategories } from "@/lib/categories";
import { getItemPourSizes, ensureEditorPourSizes, getMenuBottleSizeMl } from "@/lib/pour-sizes";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PourSizesEditor } from "./PourSizesEditor";
import { showError, showSuccess } from "@/lib/toast";

interface EditInventoryModalProps {
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
}

export function EditInventoryModal({ item, onClose, onSaved }: EditInventoryModalProps) {
  const { session } = useAuth();
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<BeverageCategory>(item.category);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>(
    []
  );
  const [unitType, setUnitType] = useState<StockUnitType>(item.unitType);
  const [purchasePrice, setPurchasePrice] = useState(String(item.purchasePrice));
  const [sellPrice, setSellPrice] = useState(String(item.sellPrice));
  const [pourSizes, setPourSizes] = useState(() =>
    ensureEditorPourSizes(getItemPourSizes(item))
  );
  const [stockQuantity, setStockQuantity] = useState(String(item.stockQuantity));
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(item.lowStockThreshold)
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializeCategories();
    const cats = getCategories();
    setCategoryOptions(cats.map((c) => ({ value: c.slug, label: c.name })));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleUnitTypeChange(next: StockUnitType) {
    setUnitType(next);
    if (next === "pour" && pourSizes.length === 0) {
      setPourSizes(
        item.unitType === "pour"
          ? getItemPourSizes(item)
          : [{ ml: 30, price: Number(sellPrice) || 0 }]
      );
    }
    if (next === "bottle" && item.unitType === "pour") {
      const first = getItemPourSizes({ ...item, pourSizes })[0];
      if (first) setSellPrice(String(first.price));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = updateInventoryItem(item.id, {
      name,
      category,
      unitType,
      purchasePrice: Number(purchasePrice),
      stockQuantity: Number(stockQuantity),
      lowStockThreshold: Number(lowStockThreshold),
      ...(unitType === "bottle"
        ? { sellPrice: Number(sellPrice) }
        : { pourSizes }),
      ...(unitType === "pour" && {
        bottleSizeMl: getMenuBottleSizeMl(pourSizes, item.bottleSizeMl),
      }),
      managerName: session?.name ?? "Manager",
    });

    if (result.success) {
      showSuccess("Changes saved", `"${name.trim()}" was updated.`);
      onSaved();
      onClose();
    } else {
      showError("Could not save", result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative max-h-[90vh] w-[70%] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Edit Item</h2>
        <p className="mt-1 text-sm text-slate-500">Update name, category, stock, and prices</p>

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Item Name"
            placeholder="e.g. Kingfisher Ultra Max"
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

          <Select
            label="Sell Type"
            value={unitType}
            onChange={(e) => handleUnitTypeChange(e.target.value as StockUnitType)}
            options={[
              { value: "bottle", label: "Bottle / Can (sold per unit)" },
              { value: "pour", label: "Pour (stock in ml, sold by peg size)" },
            ]}
          />

          <Input
            label={unitType === "bottle" ? "Stock (bottles/cans)" : "Stock (ml)"}
            type="number"
            min={0}
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            required
          />

          <Input
            label="Purchase Price"
            type="number"
            min={0}
            step="0.01"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            required
            hint={unitType === "bottle" ? "Per bottle/can" : "Total purchase price for stock"}
          />

          <Input
            label="Low Stock Alert"
            type="number"
            min={0}
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            required
            hint={
              unitType === "bottle"
                ? "Alert when bottles fall below this"
                : "Alert when ml falls below this"
            }
          />

          {unitType === "bottle" ? (
            <Input
              label="Sell Price"
              type="number"
              min={0}
              step="0.01"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              required
              hint="Per bottle/can"
            />
          ) : (
            <PourSizesEditor sizes={pourSizes} onChange={setPourSizes} />
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 sm:col-span-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2 sm:col-span-2">
            <Button type="submit" isLoading={isLoading}>
              Save Changes
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
