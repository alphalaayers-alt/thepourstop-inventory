"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSellableItems, initializeAppData, isLowStock, deleteInventoryItem, STOCK_UPDATED_EVENT } from "@/lib/catalog";
import { getCategories, initializeCategories } from "@/lib/categories";
import type { InventoryItem } from "@/types/inventory";
import {
  formatStockQuantity,
  formatStockPegs,
  categoryLabel,
} from "@/lib/format";
import { confirmAction, showError, showSuccess } from "@/lib/toast";
import { SellPriceDisplay } from "@/components/inventory/SellPriceDisplay";
import { EditInventoryModal } from "@/components/inventory/EditInventoryModal";
import { AddInventoryModal } from "@/components/inventory/AddInventoryModal";
import { AddStockModal } from "@/components/inventory/AddStockModal";
import { CategoryManagerModal } from "@/components/inventory/CategoryManagerModal";
import { StockReportModal } from "@/components/inventory/StockReportModal";
import { StockAddedSection } from "@/components/inventory/StockAddedSection";
import { InStockSection } from "@/components/inventory/InStockSection";
import { useAuth } from "@/contexts/AuthContext";
import type { ManagerPermissions } from "@/types/auth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { Category } from "@/data/categories";

type StockFilter = "all" | "in_stock" | "low_stock" | "no_stock";
type InventoryView = "items" | "stock_added" | "in_stack";

function getStockStatus(item: InventoryItem): StockFilter {
  if (item.stockQuantity <= 0) return "no_stock";
  if (isLowStock(item)) return "low_stock";
  return "in_stock";
}

function statusBadge(item: InventoryItem) {
  const status = getStockStatus(item);
  if (status === "no_stock") return <Badge variant="neutral">No Stock</Badge>;
  if (status === "low_stock") return <Badge variant="warning">Low Stock</Badge>;
  return <Badge variant="success">In Stock</Badge>;
}

import { StatCard } from "@/components/ui/StatCard";
import { MenuCatalogSyncButton } from "@/components/inventory/MenuCatalogSyncButton";

interface InventoryGridProps {
  /** Super admin always has full access */
  fullAccess?: boolean;
}

export function InventoryGrid({ fullAccess = false }: InventoryGridProps) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const can = (permission: keyof ManagerPermissions) =>
    fullAccess || isSuperAdmin || hasPermission(permission);

  const canAddStock = can("addStock");
  const canAddItem = can("addInventoryItem");
  const canEditItem = can("editInventoryItem");
  const canDeleteItem = can("deleteInventoryItem");
  const canManageCategories = can("manageCategories");
  const canDownloadReport = can("downloadStockReport");
  const canViewStockHistory = can("viewStockHistory");
  const hasItemActions = canEditItem || canDeleteItem;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [filterMenuPosition, setFilterMenuPosition] = useState({ top: 0, left: 0 });
  const filterButtonRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStockReportModal, setShowStockReportModal] = useState(false);
  const [view, setView] = useState<InventoryView>("items");
  const [stockAddedRefreshKey, setStockAddedRefreshKey] = useState(0);

  function loadCategories() {
    initializeCategories();
    setCategories(getCategories());
  }

  function load() {
    setItems(getSellableItems());
    loadCategories();
    setStockAddedRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    initializeAppData();
    load();

    const refresh = () => load();
    window.addEventListener(STOCK_UPDATED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener(STOCK_UPDATED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const stats = useMemo(() => {
    const inStock = items.filter((i) => getStockStatus(i) === "in_stock").length;
    const lowStock = items.filter((i) => getStockStatus(i) === "low_stock").length;
    const noStock = items.filter((i) => getStockStatus(i) === "no_stock").length;
    return { total: items.length, inStock, lowStock, noStock };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        categoryLabel(item.category).toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const matchesStock =
        stockFilter === "all" || getStockStatus(item) === stockFilter;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [items, search, categoryFilter, stockFilter]);

  const activeFilterCount =
    (categoryFilter !== "all" ? 1 : 0) + (stockFilter !== "all" ? 1 : 0);

  function updateFilterMenuPosition() {
    if (!filterButtonRef.current) return;
    const rect = filterButtonRef.current.getBoundingClientRect();
    setFilterMenuPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });
  }

  function toggleFilterMenu() {
    if (filterMenuOpen) {
      setFilterMenuOpen(false);
      return;
    }
    updateFilterMenuPosition();
    setFilterMenuOpen(true);
  }

  useEffect(() => {
    if (!filterMenuOpen) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        filterButtonRef.current?.contains(target) ||
        filterMenuRef.current?.contains(target)
      ) {
        return;
      }
      setFilterMenuOpen(false);
    }

    function handleReposition() {
      updateFilterMenuPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [filterMenuOpen]);

  function clearFilters() {
    setCategoryFilter("all");
    setStockFilter("all");
  }

  function toggleView(next: InventoryView) {
    setView((current) => (current === next ? "items" : next));
  }

  const inStackCount = useMemo(
    () => items.filter((item) => item.stockQuantity > 0).length,
    [items]
  );

  async function handleDelete(item: InventoryItem) {
    const confirmed = await confirmAction({
      title: "Delete item?",
      text: `Remove "${item.name}" from inventory? This cannot be undone.`,
      confirmText: "Yes, delete",
      icon: "warning",
    });
    if (!confirmed) return;
    const result = deleteInventoryItem(item.id);
    if (result.success) {
      showSuccess("Item deleted", `"${item.name}" was removed.`);
      load();
    } else {
      showError("Could not delete", result.error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stock overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Items" value={String(stats.total)} accent="blue" />
        <StatCard label="In Stock" value={String(stats.inStock)} accent="green" />
        <StatCard
          label="Low Stock"
          value={String(stats.lowStock)}
          accent={stats.lowStock > 0 ? "amber" : "default"}
        />
        <StatCard
          label="No Stock"
          value={String(stats.noStock)}
          accent={stats.noStock > 0 ? "amber" : "default"}
        />
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-x-3 sm:gap-y-2">
          {(canAddStock || canAddItem) && (
            <div className="flex shrink-0 items-center gap-1.5">
              {canAddStock && (
                <Button
                  size="sm"
                  variant={showAddStockModal ? "primary" : "secondary"}
                  onClick={() => setShowAddStockModal(true)}
                >
                  + Add Stock
                </Button>
              )}
              {canAddItem && (
                <Button
                  size="sm"
                  variant={showAddModal ? "primary" : "secondary"}
                  onClick={() => setShowAddModal(true)}
                >
                  + New Item
                </Button>
              )}
              {fullAccess && <MenuCatalogSyncButton />}
            </div>
          )}

          {canManageCategories && (
            <>
              {(canAddStock || canAddItem) && (
                <span className="hidden h-6 w-px shrink-0 bg-slate-200 md:block" aria-hidden />
              )}
              <Button
                size="sm"
                variant={showCategoryModal ? "primary" : "secondary"}
                onClick={() => setShowCategoryModal(true)}
              >
                Categories
              </Button>
            </>
          )}

          {view === "items" && (
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="relative" ref={filterButtonRef}>
                <Button
                  size="sm"
                  variant={activeFilterCount > 0 || filterMenuOpen ? "primary" : "secondary"}
                  onClick={toggleFilterMenu}
                  aria-expanded={filterMenuOpen}
                  aria-haspopup="true"
                >
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                  <svg
                    className={`ml-1 h-3.5 w-3.5 transition-transform ${filterMenuOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="shrink-0 px-2 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {canDownloadReport && (
            <>
              <span className="hidden h-6 w-px shrink-0 bg-slate-200 md:block" aria-hidden />
              <Button
                size="sm"
                variant={showStockReportModal ? "primary" : "secondary"}
                onClick={() => setShowStockReportModal(true)}
              >
                <span className="hidden lg:inline">Download Stock Report</span>
                <span className="lg:hidden">Report</span>
              </Button>
            </>
          )}

          {canViewStockHistory && (
            <>
              <span className="hidden h-6 w-px shrink-0 bg-slate-200 md:block" aria-hidden />
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  size="sm"
                  variant={view === "stock_added" ? "primary" : "secondary"}
                  onClick={() => toggleView("stock_added")}
                >
                  Stock Added
                </Button>
                <Button
                  size="sm"
                  variant={view === "in_stack" ? "primary" : "secondary"}
                  onClick={() => toggleView("in_stack")}
                >
                  In Stack
                </Button>
              </div>
            </>
          )}

          {view === "items" && (
            <>
              <span className="hidden h-6 w-px shrink-0 bg-slate-200 md:block" aria-hidden />
              <div className="relative w-full min-w-[11rem] basis-full sm:basis-auto sm:w-56 md:w-64 lg:w-72">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
                <input
                  type="search"
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {view === "stock_added" ? (
        <StockAddedSection refreshKey={stockAddedRefreshKey} />
      ) : view === "in_stack" ? (
        <InStockSection items={items} />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-slate-600">No items found</p>
          <p className="mt-1 text-xs text-slate-400">
            {items.length === 0
              ? "Add stock for menu items to get started"
              : "Try a different search or filter"}
          </p>
          {items.length === 0 && (canAddStock || canAddItem) && (
            <div className="mt-4 flex justify-center gap-2">
              {canAddStock && (
                <Button size="sm" onClick={() => setShowAddStockModal(true)}>
                  + Add Stock
                </Button>
              )}
              {canAddItem && (
                <Button size="sm" variant="secondary" onClick={() => setShowAddModal(true)}>
                  + New Item
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {categoryLabel(item.category)}
                  </p>
                </div>
                {statusBadge(item)}
              </div>

              <div className="mb-3 min-h-[4.75rem] rounded-lg bg-emerald-50 px-3 py-2">
                <p className="text-xs text-emerald-800">Sell Price</p>
                <div className="mt-1">
                  <SellPriceDisplay item={item} />
                </div>
              </div>

              <dl className="flex-1 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Stock</dt>
                  <dd className="font-medium text-slate-900">
                    {formatStockQuantity(item)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Available</dt>
                  <dd className="font-medium text-slate-900">
                    {formatStockPegs(item)}
                  </dd>
                </div>
              </dl>

              {hasItemActions && (
                <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3">
                  {canEditItem && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingItem(item)}
                    >
                      Edit
                    </Button>
                  )}
                  {canDeleteItem && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {view === "items" && (
        <p className="text-center text-xs text-slate-400">
          Showing {filtered.length} of {items.length} items
        </p>
      )}
      {view === "in_stack" && (
        <p className="text-center text-xs text-slate-400">
          {inStackCount} item{inStackCount !== 1 ? "s" : ""} in stack
        </p>
      )}

      {canEditItem && editingItem && (
        <EditInventoryModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={load}
        />
      )}

      {canAddItem && showAddModal && (
        <AddInventoryModal
          onClose={() => setShowAddModal(false)}
          onSaved={load}
        />
      )}

      {canAddStock && showAddStockModal && (
        <AddStockModal
          onClose={() => setShowAddStockModal(false)}
          onSaved={load}
        />
      )}

      {canManageCategories && showCategoryModal && (
        <CategoryManagerModal
          onClose={() => setShowCategoryModal(false)}
          onChanged={() => {
            load();
            if (categoryFilter !== "all" && !getCategories().some((c) => c.slug === categoryFilter)) {
              setCategoryFilter("all");
            }
          }}
        />
      )}

      {canDownloadReport && showStockReportModal && (
        <StockReportModal onClose={() => setShowStockReportModal(false)} />
      )}

      {filterMenuOpen &&
        view === "items" &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={filterMenuRef}
            className="fixed z-[100] w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
            style={{ top: filterMenuPosition.top, left: filterMenuPosition.left }}
            role="dialog"
            aria-label="Filter items"
          >
            <p className="mb-3 text-sm font-semibold text-slate-900">Filter items</p>
            <div className="space-y-3">
              <Select
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: "all", label: "All categories" },
                  ...categories.map((cat) => ({
                    value: cat.slug,
                    label: cat.name,
                  })),
                ]}
              />
              <Select
                label="Stock status"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                options={[
                  { value: "all", label: "All stock levels" },
                  { value: "in_stock", label: "In stock" },
                  { value: "low_stock", label: "Low stock" },
                  { value: "no_stock", label: "No stock" },
                ]}
              />
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Clear filters
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
