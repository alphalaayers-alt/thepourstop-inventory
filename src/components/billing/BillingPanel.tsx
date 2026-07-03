"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Order, OrderLineItem, SellableItem } from "@/types/inventory";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAvailableStockForOrder,
  searchSellableItems,
} from "@/lib/catalog";
import {
  addItemToOrder,
  completeOrder,
  createOrder,
  decrementLineItem,
  getOrderById,
  incrementLineItem,
  removeItemFromOrder,
  serveItemToOrder,
  updateOrderLineQuantity,
} from "@/lib/orders";
import { formatMoney, formatSellPrice, formatStock } from "@/lib/format";
import { getBillingPourOptions } from "@/lib/pour-sizes";
import type { BillDiscountOption } from "@/lib/discounts";
import { calculateOrderTotals } from "@/lib/discounts";
import { printBill } from "@/lib/bill-print";
import { showError, showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BillCheckout } from "@/components/billing/BillCheckout";
import type { BillPayment } from "@/lib/payments";
import {
  defaultBillPayment,
  syncPaymentToTotal,
  validateBillPayment,
} from "@/lib/payments";
import {
  DiscountSelector,
  getSelectedDiscountOption,
} from "@/components/billing/DiscountSelector";
import { PaymentSelector } from "@/components/billing/PaymentSelector";

function orderLineKey(line: Pick<OrderLineItem, "menuItemId" | "servingSizeMl" | "pourOptionId">) {
  return `${line.menuItemId}-${line.pourOptionId ?? line.servingSizeMl}`;
}

function adjustDraftLineQuantity(line: OrderLineItem, quantity: number): OrderLineItem {
  const perUnitStock =
    line.quantity > 0 ? line.stockDeducted / line.quantity : line.stockDeducted;
  return {
    ...line,
    quantity,
    lineTotal: line.unitPrice * quantity,
    stockDeducted: perUnitStock * quantity,
  };
}

interface BillingPanelProps {
  type: "table" | "walk_in";
  tableId?: string;
  tableNumber?: number;
  tableName?: string;
  existingOrderId?: string | null;
  deductOnServe?: boolean;
  compact?: boolean;
  /** Embedded in table order popup — receipt-style layout */
  tableModal?: boolean;
  /** Full-page walk-in billing layout */
  pageMode?: boolean;
  onComplete?: (order: Order) => void;
  /** Table popup: close after an item is served */
  onItemServed?: () => void;
  /** Table popup: checkout (final bill) view opened or closed */
  onCheckoutViewChange?: (open: boolean) => void;
}

export function BillingPanel({
  type,
  tableId,
  tableNumber,
  tableName,
  existingOrderId,
  deductOnServe = false,
  compact = false,
  tableModal = false,
  pageMode = false,
  onComplete,
  onItemServed,
  onCheckoutViewChange,
}: BillingPanelProps) {
  const { session } = useAuth();
  const [orderId, setOrderId] = useState<string | null>(existingOrderId ?? null);
  const [order, setOrder] = useState<Order | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SellableItem | null>(null);
  const [selectedPourTotalMl, setSelectedPourTotalMl] = useState<number | null>(null);
  const [selectedPourOptionId, setSelectedPourOptionId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showItemSearch, setShowItemSearch] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedDiscountId, setSelectedDiscountId] = useState("none");
  const [walkInPayment, setWalkInPayment] = useState<BillPayment>(() =>
    defaultBillPayment(0)
  );
  const [draftBillItems, setDraftBillItems] = useState<OrderLineItem[] | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    void refreshKey;
    return searchSellableItems(search);
  }, [search, refreshKey]);

  useEffect(() => {
    if (existingOrderId) {
      const existing = getOrderById(existingOrderId);
      if (existing?.status === "active") {
        setOrderId(existing.id);
        setOrder(existing);
        setCustomerName(existing.customerName);
        if (type === "table" && deductOnServe && existing.items.length > 0) {
          setShowItemSearch(false);
        }
      }
    }
  }, [existingOrderId, type, deductOnServe]);

  const isRunningTable = type === "table" && deductOnServe;
  const isTableModal = tableModal && isRunningTable;
  const tableBillLines = draftBillItems ?? order?.items ?? [];
  const hasTableBillEdits = useMemo(() => {
    if (!isTableModal || !order || !draftBillItems) return false;
    if (draftBillItems.length !== order.items.length) return true;
    return draftBillItems.some((draftLine) => {
      const saved = order.items.find(
        (line) => orderLineKey(line) === orderLineKey(draftLine)
      );
      return !saved || saved.quantity !== draftLine.quantity;
    });
  }, [isTableModal, order, draftBillItems]);
  const tableBillTotal = useMemo(
    () => tableBillLines.reduce((sum, line) => sum + line.lineTotal, 0),
    [tableBillLines]
  );

  useEffect(() => {
    if (isTableModal) {
      onCheckoutViewChange?.(showCheckout);
    }
  }, [showCheckout, isTableModal, onCheckoutViewChange]);

  useEffect(() => {
    setDraftBillItems(null);
  }, [orderId, existingOrderId]);

  const hasBillItems = Boolean(order && order.items.length > 0);
  const showSearchPanel = !isRunningTable || !hasBillItems || showItemSearch;

  function openAddMoreItems() {
    if (hasTableBillEdits) {
      showError("Unsaved changes", "Save or cancel your bill edits before adding items.");
      return;
    }
    setShowItemSearch(true);
    setSelected(null);
    setSearch("");
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function handleTableBillDraftIncrement(line: OrderLineItem) {
    setDraftBillItems((prev) => {
      const base = prev ?? order!.items.map((item) => ({ ...item }));
      return base.map((item) =>
        orderLineKey(item) === orderLineKey(line)
          ? adjustDraftLineQuantity(item, item.quantity + 1)
          : item
      );
    });
  }

  function handleTableBillDraftDecrement(line: OrderLineItem) {
    setDraftBillItems((prev) => {
      const base = prev ?? order!.items.map((item) => ({ ...item }));
      const target = base.find((item) => orderLineKey(item) === orderLineKey(line));
      if (!target) return base;
      if (target.quantity <= 1) {
        return base.filter((item) => orderLineKey(item) !== orderLineKey(line));
      }
      return base.map((item) =>
        orderLineKey(item) === orderLineKey(line)
          ? adjustDraftLineQuantity(item, item.quantity - 1)
          : item
      );
    });
  }

  function handleTableBillDraftRemove(line: OrderLineItem) {
    setDraftBillItems((prev) => {
      const base = prev ?? order!.items.map((item) => ({ ...item }));
      return base.filter((item) => orderLineKey(item) !== orderLineKey(line));
    });
  }

  function handleCancelBillEdits() {
    setDraftBillItems(null);
  }

  function handleSaveBillEdits(): boolean {
    if (!orderId || !order || !draftBillItems || !hasTableBillEdits) return true;

    const managerName = session?.name ?? "Manager";
    const activity = { managerName, logChange: true as const };
    let latestOrder = order;

    for (const savedLine of order.items) {
      const match = {
        servingSizeMl: savedLine.servingSizeMl,
        pourOptionId: savedLine.pourOptionId,
      };
      const draftLine = draftBillItems.find(
        (line) => orderLineKey(line) === orderLineKey(savedLine)
      );

      if (!draftLine) {
        const result = removeItemFromOrder(
          orderId,
          savedLine.menuItemId,
          match,
          activity
        );
        if (!result.success) {
          showError("Could not save changes", result.error);
          return false;
        }
        latestOrder = result.order;
        continue;
      }

      if (draftLine.quantity !== savedLine.quantity) {
        const result = updateOrderLineQuantity(
          orderId,
          savedLine.menuItemId,
          draftLine.quantity,
          match,
          activity
        );
        if (!result.success) {
          showError("Could not save changes", result.error);
          return false;
        }
        latestOrder = result.order;
      }
    }

    setOrder(latestOrder);
    setDraftBillItems(null);
    refresh();
    showSuccess("Bill updated", "Quantity changes saved to history.");
    return true;
  }

  function isDraftLineChanged(line: OrderLineItem): boolean {
    if (!order || !draftBillItems) return false;
    const saved = order.items.find((item) => orderLineKey(item) === orderLineKey(line));
    return !saved || saved.quantity !== line.quantity;
  }

  function refresh() {
    setRefreshKey((k) => k + 1);
    if (orderId) {
      const updated = getOrderById(orderId);
      if (updated) setOrder(updated);
    }
  }

  function ensureOrder(): string | null {
    if (orderId) return orderId;
    if (!session) return null;

    const newOrder = createOrder({
      type,
      tableId: tableId ?? null,
      tableNumber: tableNumber ?? null,
      customerName:
        customerName ||
        (type === "table"
          ? tableName ?? `Table ${tableNumber}`
          : "Walk-in Customer"),
      managerId: session.userId,
      managerName: session.name,
    });

    setOrderId(newOrder.id);
    setOrder(newOrder);
    return newOrder.id;
  }

  function handleSelectItem(item: SellableItem) {
    setSelected(item);
    setQty(1);
    if (item.unitType === "pour") {
      const options = getBillingPourOptions(item);
      const first = options[0];
      setSelectedPourTotalMl(first?.totalMl ?? item.servingSizeMl);
      setSelectedPourOptionId(first?.optionId ?? null);
    } else {
      setSelectedPourTotalMl(null);
      setSelectedPourOptionId(null);
    }
  }

  function handleAddToBill() {
    if (!selected) {
      showError("Select an item first", "Search and pick a drink from the menu.");
      return;
    }

    const id = ensureOrder();
    if (!id) return;

    const payload = {
      menuItemId: selected.id,
      quantity: qty,
      ...(selected.unitType === "pour" && {
        ...(selectedPourTotalMl != null && { servingSizeMl: selectedPourTotalMl }),
        ...(selectedPourOptionId && { pourOptionId: selectedPourOptionId }),
      }),
    };

    const result = deductOnServe
      ? serveItemToOrder(id, payload)
      : addItemToOrder(id, payload);

    if (result.success) {
      setOrder(result.order);
      setSelected(null);
      setSelectedPourTotalMl(null);
      setSelectedPourOptionId(null);
      setSearch("");
      setQty(1);
      if (deductOnServe) {
        if (tableModal) {
          onItemServed?.();
          return;
        }
        showSuccess("Item served", `${selected.name} — stock updated.`);
        if (type === "table") {
          setShowItemSearch(false);
        }
      } else {
        showSuccess("Added to bill", `${selected.name} × ${qty}`);
      }
      refresh();
    } else {
      showError("Could not add item", result.error);
    }
  }

  function handleLineIncrement(
    menuItemId: string,
    match?: { servingSizeMl?: number; pourOptionId?: string }
  ) {
    if (!orderId) return;
    const result = incrementLineItem(orderId, menuItemId, match);
    if (result.success) {
      setOrder(result.order);
      refresh();
    } else showError("Could not update quantity", result.error);
  }

  function handleLineDecrement(
    menuItemId: string,
    match?: { servingSizeMl?: number; pourOptionId?: string }
  ) {
    if (!orderId) return;
    const result = decrementLineItem(orderId, menuItemId, match);
    if (result.success) {
      setOrder(result.order);
      refresh();
    } else showError("Could not update quantity", result.error);
  }

  function handleRemove(
    menuItemId: string,
    match?: { servingSizeMl?: number; pourOptionId?: string }
  ) {
    if (!orderId) return;
    const result = removeItemFromOrder(orderId, menuItemId, match);
    if (result.success) {
      setOrder(result.order);
      refresh();
    }
  }

  function handleComplete() {
    if (!orderId) {
      showError("Nothing to bill", "Add items before completing the bill.");
      return;
    }

    const result = completeOrder(orderId);
    if (result.success) {
      showSuccess(
        "Bill completed",
        deductOnServe
          ? `${formatMoney(result.order.total)} — table is now available.`
          : `${formatMoney(result.order.total)} — stock updated in inventory.`
      );
      setOrder(null);
      setOrderId(null);
      setSelected(null);
      if (type === "walk_in") {
        setCustomerName("");
        setSelectedDiscountId("none");
        setWalkInPayment(defaultBillPayment(0));
      }
      refresh();
      onComplete?.(result.order);
    } else {
      showError("Could not complete bill", result.error);
    }
  }

  function handleOpenCheckout() {
    if (hasTableBillEdits) {
      showError("Unsaved changes", "Save your bill edits before completing the table.");
      return;
    }
    if (!orderId || !order || order.items.length === 0) {
      showError("Nothing to bill", "Add at least one item before completing the bill.");
      return;
    }
    setShowCheckout(true);
  }

  function handleConfirmCheckout(
    discount: BillDiscountOption,
    payment: BillPayment
  ) {
    if (!orderId) return;

    const check = validateBillPayment(
      payment,
      calculateOrderTotals(
        order?.items ?? [],
        discount.percent > 0 ? discount : null
      ).total
    );
    if (!check.ok) {
      showError("Payment incomplete", check.error);
      return;
    }

    setIsCompleting(true);
    const result = completeOrder(
      orderId,
      discount.percent > 0
        ? { label: discount.label, percent: discount.percent }
        : undefined,
      payment
    );
    setIsCompleting(false);

    if (result.success) {
      setShowCheckout(false);
      showSuccess(
        "Bill completed",
        type === "table"
          ? `${formatMoney(result.order.total)} — table is now available.`
          : `${formatMoney(result.order.total)} — stock updated.`
      );
      setOrder(null);
      setOrderId(null);
      setSelected(null);
      if (type === "walk_in") {
        setCustomerName("");
        setSelectedDiscountId("none");
        setWalkInPayment(defaultBillPayment(0));
      }
      refresh();
      onComplete?.(result.order);
    } else {
      showError("Could not complete bill", result.error);
    }
  }

  const title =
    type === "table"
      ? `${tableName ?? `Table ${tableNumber}`} — Bill`
      : "Quick Billing (No Table)";

  const gridClass = compact
    ? "grid gap-4 lg:grid-cols-5"
    : "grid gap-6 xl:grid-cols-5";
  const mainColClass = compact ? "lg:col-span-3" : "xl:col-span-3";
  const sideColClass = compact ? "lg:col-span-2" : "xl:col-span-2";

  const availableForSelected = selected
    ? getAvailableStockForOrder(selected.id, orderId ?? undefined)
    : 0;

  const pourOptions = selected ? getBillingPourOptions(selected) : [];
  const selectedPourOption =
    selected && selected.unitType === "pour"
      ? pourOptions.find((o) =>
          selectedPourOptionId
            ? o.optionId === selectedPourOptionId
            : o.totalMl === selectedPourTotalMl
        )
      : undefined;

  const selectedUnitPrice =
    selectedPourOption?.price ?? selected?.sellPrice ?? 0;

  const selectedPourMlSize = selectedPourTotalMl ?? selected?.servingSizeMl ?? 30;

  function renderWalkInAddItems(title: string, compact: boolean, fillHeight = false) {
    const showBrowseList = !selected;
    const resultsLimit = compact ? 24 : 24;
    const browseItems = results.slice(0, resultsLimit);

    return (
      <div
        className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ${
          fillHeight ? "h-full" : ""
        }`}
      >
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">Search and add to bill</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
          <Input
            ref={searchInputRef}
            label=""
            placeholder="Search drinks..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(null);
            }}
            autoFocus={!compact}
            className="!shrink-0 !rounded-xl !border-slate-200 !bg-slate-50/80 !py-2.5 !shadow-sm"
          />

          {showBrowseList && (
            <div
              className={
                fillHeight
                  ? "min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/30"
                  : "max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/30"
              }
            >
              {browseItems.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  {search.trim() ? "No matches" : "No items available"}
                </p>
              ) : (
                browseItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className="flex w-full items-center gap-3 border-b border-slate-100/80 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-white"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-700/10 text-xs font-bold text-teal-800">
                      {item.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 truncate text-sm font-medium text-slate-900">
                      {item.name}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {selected && (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
              <div className="rounded-lg bg-white px-3 py-2.5 shadow-sm ring-1 ring-emerald-100">
                <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
                {selected.unitType === "bottle" && (
                  <p className="mt-0.5 text-sm font-medium text-emerald-700">
                    {formatSellPrice(selected)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-base font-bold text-slate-700 hover:bg-slate-50"
                  >
                    −
                  </button>
                  <span className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums text-slate-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-base font-bold text-slate-700 hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAddToBill}
                  className="flex min-h-[2.5rem] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl bg-teal-700 px-3 py-2 text-white shadow-sm transition-colors hover:bg-teal-800"
                >
                  <span className="text-sm font-semibold">Add to bill</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums">
                    {formatMoney(selectedUnitPrice * qty)}
                  </span>
                </button>
              </div>

              {selected.unitType === "pour" && (
                <div className="flex flex-wrap gap-1.5">
                  {pourOptions.map((option) => {
                    const active =
                      selectedPourOptionId
                        ? selectedPourOptionId === option.optionId
                        : selectedPourTotalMl === option.totalMl;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setSelectedPourTotalMl(option.totalMl);
                          setSelectedPourOptionId(option.optionId ?? null);
                        }}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          active
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-teal-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isTableModal) {
    if (showCheckout && order && order.items.length > 0) {
      return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <BillCheckout
            order={order}
            billTitle={
              tableName ?? (tableNumber != null ? `Table ${tableNumber}` : order.customerName)
            }
            printTitle={tableName}
            orderSummarySubtitle="Items served on this table"
            confirmLabel="Confirm & close table"
            onBack={() => setShowCheckout(false)}
            onConfirm={handleConfirmCheckout}
            isLoading={isCompleting}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        {showSearchPanel ? (
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {hasBillItems ? "Add to order" : "New order"}
                </p>
                <p className="text-xs text-slate-400">
                  {hasBillItems ? "Search and serve more items" : "Search menu to start"}
                </p>
              </div>
              {hasBillItems && (
                <button
                  type="button"
                  onClick={() => setShowItemSearch(false)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  View bill
                </button>
              )}
            </div>

            <Input
              ref={searchInputRef}
              label=""
              placeholder="Search drinks..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
              }}
              autoFocus
              className="!rounded-xl !border-slate-200 !py-3 !shadow-sm"
            />

            <div className="max-h-48 space-y-0 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">
                  {search ? "No matches" : "Type to search menu"}
                </p>
              ) : (
                results.map((item) => {
                  const avail = getAvailableStockForOrder(item.id, orderId ?? undefined);
                  const isSelected = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors last:border-0 ${
                        isSelected ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="truncate text-xs text-slate-500">{formatSellPrice(item)}</p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-medium ${
                          avail > 0 ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {avail <= 0 ? "Out" : item.unitType === "pour" ? `${avail}ml` : avail}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {selected && (
              <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-base font-semibold text-slate-900">{selected.name}</p>
                  {selected.unitType === "bottle" && (
                    <p className="text-sm text-emerald-700">{formatSellPrice(selected)}</p>
                  )}
                </div>

                {selected.unitType === "pour" && (
                  <div className="flex flex-wrap gap-1.5">
                    {pourOptions.map((option) => {
                      const active =
                        selectedPourOptionId
                          ? selectedPourOptionId === option.optionId
                          : selectedPourTotalMl === option.totalMl;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => {
                            setSelectedPourTotalMl(option.totalMl);
                            setSelectedPourOptionId(option.optionId ?? null);
                          }}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            active
                              ? option.isCombo
                                ? "bg-amber-500 text-white"
                                : "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {option.label} · {formatMoney(option.price)}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg font-semibold text-slate-700"
                    >
                      −
                    </button>
                    <span className="min-w-[2rem] text-center text-base font-semibold">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => q + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg font-semibold text-slate-700"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatMoney(selectedUnitPrice * qty)}
                  </p>
                </div>

                <Button onClick={handleAddToBill} className="w-full" size="lg">
                  Serve · {formatMoney(selectedUnitPrice * qty)}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="border-b border-slate-100 bg-white px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Current bill</p>
                  <p className="text-xs text-slate-400">Items served on this table</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {order?.items.length ?? 0} item{(order?.items.length ?? 0) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {!order || order.items.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-slate-400">No items yet</p>
                <Button type="button" className="mt-4" onClick={openAddMoreItems}>
                  Start order
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2 bg-white p-4">
                  {tableBillLines.map((line) => (
                    <div
                      key={`${line.menuItemId}-${line.pourOptionId ?? line.servingSizeMl}`}
                      className={`rounded-xl border px-4 py-3.5 ${
                        isDraftLineChanged(line)
                          ? "border-amber-200 bg-amber-50/50"
                          : "border-slate-100 bg-slate-50/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{line.itemName}</p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {line.unitType === "pour"
                              ? line.pourLabel ?? `${line.servingSizeMl}ml`
                              : "Bottle"}
                            <span className="text-slate-300"> · </span>×{line.quantity}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {line.served
                              ? `Served ${new Date(line.servedAt ?? line.addedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                              : `Added ${new Date(line.addedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
                          </p>
                        </div>
                        <p className="shrink-0 text-base font-semibold tabular-nums text-slate-900">
                          {formatMoney(line.lineTotal)}
                        </p>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100/80 pt-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Served
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTableBillDraftDecrement(line)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-bold text-slate-700 hover:bg-slate-50"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="min-w-[1.75rem] text-center text-sm font-semibold tabular-nums">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTableBillDraftIncrement(line)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-bold text-slate-700 hover:bg-slate-50"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTableBillDraftRemove(line)}
                            className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-base font-bold text-red-600 hover:bg-red-100"
                            aria-label="Remove item"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {hasTableBillEdits && (
                  <div className="mx-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-medium text-amber-900">
                      Unsaved quantity changes — save to update stock and history
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={handleSaveBillEdits} className="flex-1">
                        Save changes
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCancelBillEdits}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="sticky bottom-0 mt-auto border-t border-slate-200 bg-white p-5">
                  <button
                    type="button"
                    onClick={openAddMoreItems}
                    className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-200/80 bg-emerald-50/40 py-3 text-sm font-medium text-emerald-800 transition-all hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200/60 text-sm leading-none text-emerald-800">
                      +
                    </span>
                    Add more items
                  </button>

                  <div className="mb-4 flex items-baseline justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-500">Total</span>
                    <span className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">
                      {formatMoney(hasTableBillEdits ? tableBillTotal : order.total)}
                    </span>
                  </div>

                  <Button onClick={handleOpenCheckout} className="w-full" size="lg">
                    Complete & close table
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const isWalkInPage = type === "walk_in" && pageMode;
  const walkInBillTitle = customerName.trim() || order?.customerName || "Walk-in Customer";
  const walkInSelectedDiscount = getSelectedDiscountOption(selectedDiscountId);
  const walkInTotals = useMemo(() => {
    if (!order?.items.length) return null;
    return calculateOrderTotals(order.items, {
      label: walkInSelectedDiscount.label,
      percent: walkInSelectedDiscount.percent,
    });
  }, [order?.items, walkInSelectedDiscount]);

  useEffect(() => {
    if (!walkInTotals) return;
    setWalkInPayment((prev) => syncPaymentToTotal(prev, walkInTotals.total));
  }, [walkInTotals?.total]);

  function handleWalkInPrint() {
    if (!order || !walkInTotals) return;
    printBill({ ...order, ...walkInTotals }, walkInBillTitle);
  }

  function handleWalkInComplete() {
    handleConfirmCheckout(walkInSelectedDiscount, walkInPayment);
  }

  if (isWalkInPage) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
        <div className="relative shrink-0 bg-gradient-to-r from-teal-700 via-emerald-700 to-emerald-800 px-4 py-4 text-white sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-100/90">
                Quick Billing
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                {hasBillItems ? "Final Bill" : "Walk-in order"}
              </h2>
              {hasBillItems && (
                <p className="mt-1 text-xs text-emerald-50/80">
                  {walkInBillTitle} · {order?.items.length ?? 0} item
                  {(order?.items.length ?? 0) !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
              <div className="min-w-0 flex-1 sm:w-52 sm:flex-none">
                <label className="mb-1 block text-[11px] font-medium text-emerald-100/90">
                  Customer name
                </label>
                <input
                  type="text"
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-emerald-100/60 outline-none focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/20"
                />
              </div>
              {hasBillItems && (
                <button
                  type="button"
                  onClick={handleWalkInPrint}
                  className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              )}
            </div>
          </div>
        </div>

        {!hasBillItems ? (
          <div className="flex min-h-0 flex-1 flex-col bg-slate-50/50 p-4 sm:p-6">
            <div className="mx-auto flex h-full w-full max-w-xl min-h-0 flex-col">
              {renderWalkInAddItems("Add items", false, true)}
            </div>
          </div>
        ) : (
          <>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto bg-slate-50/60 p-4 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:gap-5 lg:overflow-hidden lg:p-5">
              <div className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:max-h-none">
                {renderWalkInAddItems("Add more items", true, true)}
              </div>

              <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
                <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">Order summary</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {order!.items.length} item{order!.items.length !== 1 ? "s" : ""} on this bill
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                  <div className="space-y-2">
                    {order!.items.map((line) => (
                      <div
                        key={`${line.menuItemId}-${line.pourOptionId ?? line.servingSizeMl}`}
                        className="rounded-xl border border-slate-100 bg-slate-50/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {line.itemName}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {line.unitType === "pour"
                                ? line.pourLabel ?? `${line.servingSizeMl}ml`
                                : "Bottle"}{" "}
                              · {formatMoney(line.unitPrice)} each
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-bold tabular-nums text-teal-800">
                            {formatMoney(line.lineTotal)}
                          </p>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-200/60 pt-2.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Qty
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleLineDecrement(line.menuItemId, {
                                  servingSizeMl: line.servingSizeMl,
                                  pourOptionId: line.pourOptionId,
                                })
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              −
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleLineIncrement(line.menuItemId, {
                                  servingSizeMl: line.servingSizeMl,
                                  pourOptionId: line.pourOptionId,
                                })
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemove(line.menuItemId, {
                                  servingSizeMl: line.servingSizeMl,
                                  pourOptionId: line.pourOptionId,
                                })
                              }
                              className="ml-1 flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50 text-sm font-bold text-red-600 hover:bg-red-100"
                              aria-label="Remove item"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {walkInTotals && (
                  <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-semibold tabular-nums text-slate-900">
                        {formatMoney(walkInTotals.subtotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden lg:h-full">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
                  <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">Apply discount</h3>
                    <p className="mt-0.5 text-xs text-slate-500">One offer per bill</p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    <DiscountSelector
                      compact
                      selectedDiscountId={selectedDiscountId}
                      onSelect={setSelectedDiscountId}
                    />
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
                  <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">Payment method</h3>
                    <p className="mt-0.5 text-xs text-slate-500">Cash, online, or split</p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    <PaymentSelector
                      compact
                      total={walkInTotals?.total ?? 0}
                      payment={walkInPayment}
                      onChange={setWalkInPayment}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-800/20 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 px-4 py-3.5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-5 sm:gap-8">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Subtotal
                    </p>
                    <p className="mt-0.5 text-base font-medium tabular-nums text-slate-300">
                      {formatMoney(walkInTotals?.subtotal ?? 0)}
                    </p>
                  </div>
                  {walkInTotals && walkInTotals.discountAmount > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
                        You save
                      </p>
                      <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-400">
                        −{formatMoney(walkInTotals.discountAmount)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Amount payable
                    </p>
                    <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums text-white sm:text-3xl">
                      {formatMoney(walkInTotals?.total ?? 0)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleWalkInComplete}
                  size="lg"
                  isLoading={isCompleting}
                  className="w-full shrink-0 !bg-emerald-500 !px-8 !py-3 !text-base !font-semibold shadow-lg shadow-emerald-500/25 hover:!bg-emerald-400 sm:w-auto"
                >
                  Complete bill
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {showSearchPanel ? (
      <div className={`space-y-4 ${mainColClass}`}>
        <Card>
          <CardHeader
            title={hasBillItems && isRunningTable ? "Add more items" : "Search Menu"}
            description={
              deductOnServe
                ? hasBillItems && isRunningTable
                  ? "Customer wants more — search and Serve to add to this table bill"
                  : "Select item, then Serve — stock reduces right away"
                : "Prices from menu — stock deducted when bill is completed"
            }
          />
          <CardContent className="space-y-4">
            {type === "walk_in" && (
              <Input
                label="Customer Name"
                placeholder="Walk-in Customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            )}

            <Input
              ref={searchInputRef}
              label="Search item"
              placeholder="e.g. Kingfisher, Old Monk, Red Bull..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
              }}
              autoFocus
            />

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {results.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  {search ? "No items match your search" : "Type to search menu items"}
                </p>
              ) : (
                results.map((item) => {
                  const avail = getAvailableStockForOrder(
                    item.id,
                    orderId ?? undefined
                  );
                  const isSelected = selected?.id === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatSellPrice(item)} · Stock: {formatStock(item)}
                        </p>
                      </div>
                  <Badge variant={avail > 0 ? "success" : "warning"}>
                    {avail <= 0
                      ? "Out of stock"
                      : item.unitType === "pour"
                        ? `${avail}ml`
                        : `${avail} left`}
                  </Badge>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Selected</p>
                <p className="text-lg font-semibold text-slate-900">{selected.name}</p>
                {selected.unitType === "bottle" ? (
                  <p className="text-sm text-emerald-700">{formatSellPrice(selected)}</p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Choose pour size, then set quantity
                  </p>
                )}
              </div>

              {selected.unitType === "pour" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Pour option</p>
                  <div className="flex flex-wrap gap-2">
                    {pourOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setSelectedPourTotalMl(option.totalMl);
                          setSelectedPourOptionId(option.optionId ?? null);
                        }}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                          (selectedPourOptionId
                            ? selectedPourOptionId === option.optionId
                            : selectedPourTotalMl === option.totalMl)
                            ? option.isCombo
                              ? "border-amber-500 bg-amber-50 font-semibold text-amber-900"
                              : "border-emerald-500 bg-emerald-50 font-semibold text-emerald-800"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {option.label} — {formatMoney(option.price)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-lg font-bold hover:bg-slate-50"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center text-lg font-semibold">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-lg font-bold hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>
                {selected.unitType === "pour" && (
                  <span className="text-sm text-slate-500">
                    = {qty * selectedPourMlSize}ml total
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-500">
                Line total:{" "}
                <span className="font-semibold text-slate-900">
                  {formatMoney(selectedUnitPrice * qty)}
                </span>
                {" · "}
                Available:{" "}
                {selected.unitType === "pour"
                  ? `${availableForSelected}ml`
                  : `${availableForSelected} bottles`}
              </p>

              <Button onClick={handleAddToBill} className="w-full">
                {deductOnServe ? "Serve" : `Add to ${type === "table" ? "Bill" : "Bill"}`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      ) : null}

      <div
        className={
          showSearchPanel
            ? sideColClass
            : compact
              ? "col-span-full lg:col-span-5"
              : "col-span-full xl:col-span-5"
        }
      >
        <Card className={compact ? "" : "sticky top-8"}>
          <CardHeader
            title={title}
            description={
              order
                ? `${order.items.length} item(s) on bill`
                : deductOnServe
                  ? "Serve items to start the table"
                  : "Items stay on bill until completed"
            }
          />
          <CardContent className="space-y-4">
            {isRunningTable && hasBillItems && showSearchPanel && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setShowItemSearch(false)}
              >
                Back to bill
              </Button>
            )}

            {!order || order.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                {deductOnServe
                  ? "Search an item, set qty, tap Serve"
                  : "Search an item, set qty, add to bill"}
              </p>
            ) : (
              <div className="space-y-3">
                {isRunningTable && !showSearchPanel && (
                  <Button type="button" onClick={openAddMoreItems} className="w-full">
                    + Add more items
                  </Button>
                )}

                {order.items.map((line) => (
                  <div
                    key={`${line.menuItemId}-${line.pourOptionId ?? line.servingSizeMl}`}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {line.itemName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatMoney(line.unitPrice)}
                          {line.unitType === "pour" &&
                            ` / ${line.pourLabel ?? `${line.servingSizeMl}ml`}`}
                          {" · "}×{line.quantity}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {line.served
                            ? `Served ${new Date(line.servedAt ?? line.addedAt).toLocaleTimeString("en-IN")}`
                            : `Added ${new Date(line.addedAt).toLocaleTimeString("en-IN")}`}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700">
                        {formatMoney(line.lineTotal)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      {deductOnServe && (
                        <Badge variant="success">Served</Badge>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleLineDecrement(line.menuItemId, {
                              servingSizeMl: line.servingSizeMl,
                              pourOptionId: line.pourOptionId,
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-bold hover:bg-slate-100"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleLineIncrement(line.menuItemId, {
                              servingSizeMl: line.servingSizeMl,
                              pourOptionId: line.pourOptionId,
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-bold hover:bg-slate-100"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                        {!deductOnServe && line.unitType === "pour" && (
                          <span className="ml-2 text-xs text-slate-500">
                            {line.quantity * line.servingSizeMl}ml
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleRemove(line.menuItemId, {
                              servingSizeMl: line.servingSizeMl,
                              pourOptionId: line.pourOptionId,
                            })
                          }
                          className="ml-1 flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-sm font-bold text-red-600 hover:bg-red-100"
                          aria-label="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">Bill Total</span>
                    <span className="text-xl font-bold text-emerald-700">
                      {formatMoney(order.total)}
                    </span>
                  </div>
                </div>

                <Button onClick={handleComplete} className="w-full" size="lg">
                  {deductOnServe ? "Complete Bill & Close Table" : "Complete Bill & Update Inventory"}
                </Button>
                {!deductOnServe && (
                  <p className="text-center text-xs text-slate-400">
                    Stock is deducted only when bill is completed
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
