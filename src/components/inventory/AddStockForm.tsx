"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSellableItems, restockItem } from "@/lib/catalog";
import { categoryLabel, formatStockQuantity } from "@/lib/format";
import { getBasePegMl } from "@/lib/pour-sizes";
import type { SellableItem } from "@/types/inventory";
import { showError, showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  PourStockBottlesInput,
  createStockBottleRow,
  totalMlFromStockBottleRows,
  type StockBottleRow,
} from "./PourStockBottlesInput";

interface AddStockFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  inModal?: boolean;
}

const LIST_PREVIEW_COUNT = 5;

function parsePositive(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatCompactStock(item: Pick<SellableItem, "unitType" | "stockQuantity">): string {
  return formatStockQuantity(item);
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
      />
    </svg>
  );
}

function SelectedItemBar({
  item,
  onChange,
}: {
  item: SellableItem;
  onChange: () => void;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-teal-200 bg-white p-3 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
          {item.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {categoryLabel(item.category)} · {formatCompactStock(item)} in stock
          </p>
        </div>
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
        >
          Change
        </button>
      </div>
    </div>
  );
}

export function AddStockForm({ onSuccess, onCancel, inModal = false }: AddStockFormProps) {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [pourBottleRows, setPourBottleRows] = useState<StockBottleRow[]>(() => [
    createStockBottleRow(),
  ]);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const items = getSellableItems();
  const searchQuery = search.trim();
  const isSearching = searchQuery.length > 0;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        categoryLabel(item.category).toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const displayItems = useMemo(() => {
    if (isSearching) return filtered;
    return filtered.slice(0, LIST_PREVIEW_COUNT);
  }, [filtered, isSearching]);

  const hiddenCount = !isSearching ? Math.max(0, filtered.length - LIST_PREVIEW_COUNT) : 0;

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const pourMlToAdd = useMemo(() => {
    if (!selected || selected.unitType !== "pour") return 0;
    return totalMlFromStockBottleRows(pourBottleRows);
  }, [selected, pourBottleRows]);

  const bottleQtyToAdd = useMemo(() => {
    if (!selected || selected.unitType !== "bottle") return 0;
    return parsePositive(quantity);
  }, [selected, quantity]);
  const purchasePricePlaceholder = "Enter purchase amount";

  function resetQuantityFields() {
    setQuantity("");
    setPourBottleRows([createStockBottleRow()]);
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    setError("");
    setSearch("");
    resetQuantityFields();
    setPurchasePrice("");
  }

  function handleChangeItem() {
    setSelectedId(null);
    resetQuantityFields();
    setPurchasePrice("");
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedId || !selected) {
      showError("Select an item", "Pick a menu item before adding stock.");
      return;
    }

    const addQuantity =
      selected.unitType === "pour" ? pourMlToAdd : bottleQtyToAdd;

    if (addQuantity <= 0) {
      if (selected.unitType === "pour") {
        showError(
          "Enter bottle details",
          "Add at least one row with bottle count and ml per bottle."
        );
      } else {
        showError("Enter quantity", "Add at least one bottle or can.");
      }
      return;
    }

    setIsLoading(true);
    const result = restockItem({
      itemId: selectedId,
      quantity: addQuantity,
      purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
      managerName: session?.name ?? "Manager",
    });

    if (result.success) {
      showSuccess("Stock added", `Stock updated for ${selected.name}.`);
      onSuccess?.();
    } else {
      showError("Could not add stock", result.error);
      setIsLoading(false);
    }
  }

  const sectionClass = inModal
    ? "min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    : "";

  return (
    <form
      onSubmit={handleSubmit}
      className={
        inModal
          ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/80"
          : "space-y-4"
      }
    >
      <div
        className={
          inModal
            ? "min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5"
            : "space-y-4"
        }
      >
        {!selected ? (
          <section className={sectionClass}>
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-900">Select item</p>
              <p className="text-xs text-slate-500">
                Pick from recent items or search by name
              </p>
            </div>

            <div className="relative min-w-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Search item name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus={inModal}
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            {hiddenCount > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Showing {LIST_PREVIEW_COUNT} of {items.length} — search for more
              </p>
            )}

            <div className="mt-3 space-y-1">
              {displayItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  {isSearching ? "No items match your search" : "No items in menu yet"}
                </p>
              ) : (
                displayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-left transition-colors hover:border-teal-200 hover:bg-teal-50/40"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {categoryLabel(item.category)} · {formatCompactStock(item)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        ) : (
          <div className="min-w-0 space-y-4">
            <SelectedItemBar item={selected} onChange={handleChangeItem} />

            <section className={sectionClass}>
              <p className="mb-3 text-sm font-semibold text-slate-900">Add quantity</p>

              <div className="min-w-0 space-y-4">
                {selected.unitType === "pour" ? (
                  <PourStockBottlesInput
                    compact={inModal}
                    rows={pourBottleRows}
                    onChange={setPourBottleRows}
                    menuBottleSizeMl={selected.bottleSizeMl}
                    currentStockMl={selected.stockQuantity}
                    pegMl={getBasePegMl(selected)}
                  />
                ) : (
                  <Input
                    label="Quantity (bottles)"
                    type="number"
                    min={1}
                    placeholder="e.g. 12"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    hint={
                      bottleQtyToAdd > 0
                        ? `New total: ${selected.stockQuantity + bottleQtyToAdd} bottle${
                            selected.stockQuantity + bottleQtyToAdd !== 1 ? "s" : ""
                          }`
                        : undefined
                    }
                  />
                )}

                <Input
                  label="Purchase price"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={purchasePricePlaceholder}
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  hint={
                    selected.unitType === "bottle"
                      ? "Per bottle/can"
                      : "Total cost for this addition"
                  }
                />
              </div>
            </section>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div
        className={
          inModal
            ? "flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-5"
            : "flex gap-3 pt-2"
        }
      >
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            className={inModal ? "w-full sm:w-auto" : ""}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!selectedId}
          className={
            inModal
              ? "w-full bg-teal-700 hover:bg-teal-800 sm:w-auto disabled:bg-slate-300"
              : ""
          }
        >
          Add Stock
        </Button>
      </div>
    </form>
  );
}
