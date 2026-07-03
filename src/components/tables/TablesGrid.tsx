"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCompletedOrders, getActiveOrderForTable } from "@/lib/orders";
import {
  addTable,
  deleteTable,
  getTables,
  getTableDisplayName,
  updateTableName,
} from "@/lib/tables";
import { endOfDay, formatMoney, startOfDay } from "@/lib/format";
import type { Table } from "@/types/inventory";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { TableOrderModal } from "@/components/tables/TableOrderModal";
import { confirmAction, showError, showSuccess, showWarning } from "@/lib/toast";

function getTableStats(tables: Table[]) {
  let running = 0;
  let openBilling = 0;

  for (const table of tables) {
    const activeOrder = getActiveOrderForTable(table.id);
    const isRunning = table.status === "running" || !!activeOrder;
    if (isRunning) {
      running += 1;
      if (activeOrder) openBilling += activeOrder.total;
    }
  }

  const todayCompleted = getCompletedOrders().filter((o) => {
    if (o.type !== "table") return false;
    const date = new Date(o.completedAt ?? o.createdAt);
    return date >= startOfDay() && date <= endOfDay();
  }).length;

  return {
    available: tables.length - running,
    running,
    openBilling,
    completedToday: todayCompleted,
  };
}

export function TablesGrid() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [actionsTableId, setActionsTableId] = useState<string | null>(null);

  const load = useCallback(() => {
    setTables(getTables());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!actionsTableId) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-table-actions]")) {
        setActionsTableId(null);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [actionsTableId]);

  const stats = useMemo(() => getTableStats(tables), [tables]);

  function handleAddTable() {
    addTable();
    load();
    showSuccess("Table added", "A new table is ready to use.");
  }

  function openEdit(table: Table) {
    setActionsTableId(null);
    setEditingTable(table);
    setEditName(getTableDisplayName(table));
    setEditError("");
  }

  function closeEdit() {
    setEditingTable(null);
    setEditName("");
    setEditError("");
  }

  function handleSaveEdit() {
    if (!editingTable) return;
    const result = updateTableName(editingTable.id, editName);
    if (result.success) {
      showSuccess("Table updated", `Saved as "${editName.trim() || `Table ${editingTable.number}`}".`);
      closeEdit();
      load();
    } else {
      setEditError(result.error);
    }
  }

  async function handleDelete(table: Table) {
    setActionsTableId(null);
    const activeOrder = getActiveOrderForTable(table.id);
    if (activeOrder) {
      showWarning(
        "Cannot delete table",
        `Complete or cancel the open bill on ${getTableDisplayName(table)} first.`
      );
      return;
    }

    const displayName = getTableDisplayName(table);
    const confirmed = await confirmAction({
      title: "Delete table?",
      text: `Remove "${displayName}"? This cannot be undone.`,
      confirmText: "Yes, delete",
    });
    if (!confirmed) return;

    const result = deleteTable(table.id);
    if (result.success) {
      if (selectedTableId === table.id) setSelectedTableId(null);
      showSuccess("Table deleted", `"${displayName}" was removed.`);
      load();
    } else {
      showError("Could not delete table", result.error);
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Tables</h1>
        <Button onClick={handleAddTable}>+ Add new table</Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Available tables"
          value={String(stats.available)}
          accent="green"
        />
        <StatCard
          label="Running tables"
          value={String(stats.running)}
          accent="amber"
        />
        <StatCard
          label="Open billing"
          value={stats.openBilling}
          subtext="Active table bills"
          accent="blue"
        />
        <StatCard
          label="Completed bills"
          value={String(stats.completedToday)}
          subtext="Today"
          accent="default"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {tables.map((table) => {
          const activeOrder = getActiveOrderForTable(table.id);
          const isRunning = table.status === "running" || !!activeOrder;
          const displayName = getTableDisplayName(table);
          const itemCount = activeOrder?.items.length ?? 0;

          return (
            <Card
              key={table.id}
              className={`relative flex h-[220px] min-h-[220px] flex-col overflow-hidden transition-all hover:shadow-md ${
                isRunning
                  ? "border-amber-200 bg-gradient-to-b from-amber-50/90 to-white"
                  : "hover:border-slate-300"
              }`}
            >
              <div
                className="absolute right-3 top-3 z-10"
                data-table-actions
              >
                {actionsTableId === table.id ? (
                  <div className="w-28 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                      onClick={() => openEdit(table)}
                    >
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                      onClick={() => handleDelete(table)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white/90 text-slate-500 shadow-sm backdrop-blur-sm transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionsTableId((current) =>
                        current === table.id ? null : table.id
                      );
                    }}
                    aria-label="Table actions"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedTableId(table.id)}
                className="flex h-full w-full flex-col items-center justify-center px-5 pb-5 pt-8 text-center transition-colors hover:bg-white/50"
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold shadow-sm ${
                    isRunning
                      ? "bg-amber-500 text-white shadow-amber-200/60"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {table.number}
                </div>

                <p className="mt-4 max-w-full truncate text-base font-semibold text-slate-900">
                  {displayName}
                </p>

                <span
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    isRunning
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isRunning ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                  {isRunning ? "Running" : "Available"}
                </span>

                {isRunning && activeOrder ? (
                  <div className="mt-3 space-y-0.5">
                    <p className="text-lg font-bold tabular-nums text-amber-800">
                      {formatMoney(activeOrder.total)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {itemCount} item{itemCount !== 1 ? "s" : ""} · Tap to manage
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">Tap to start order</p>
                )}
              </button>
            </Card>
          );
        })}
      </div>

      {selectedTableId && (
        <TableOrderModal
          tableId={selectedTableId}
          onClose={() => setSelectedTableId(null)}
          onUpdated={load}
        />
      )}

      {editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={closeEdit}
            aria-label="Close"
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Edit table name</h2>
            <p className="mt-1 text-sm text-slate-500">
              Table {editingTable.number}
            </p>
            <div className="mt-4 space-y-3">
              <Input
                label="Table name"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  setEditError("");
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                }}
              />
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" onClick={handleSaveEdit}>
                  Save
                </Button>
                <Button className="flex-1" variant="secondary" onClick={closeEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
