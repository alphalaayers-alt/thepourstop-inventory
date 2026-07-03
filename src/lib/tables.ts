import type { Table } from "@/types/inventory";
import { getItem, setItem, storageKeys } from "./storage";

const TABLE_COUNT = 10;

function generateId(): string {
  return crypto.randomUUID();
}

function normalizeTable(table: Table & { status?: string }): Table {
  const legacyStatus = table.status as string;
  return {
    ...table,
    name: table.name?.trim() || `Table ${table.number}`,
    status: legacyStatus === "occupied" || legacyStatus === "running" ? "running" : "available",
  };
}

export function initializeTables(): Table[] {
  const existing = getItem<Table[]>(storageKeys.tables);
  if (existing && existing.length > 0) {
    const normalized = existing.map((t) => normalizeTable(t));
    saveTables(normalized);
    return normalized;
  }

  const tables: Table[] = Array.from({ length: TABLE_COUNT }, (_, i) => ({
    id: generateId(),
    number: i + 1,
    name: `Table ${i + 1}`,
    status: "available" as const,
    activeOrderId: null,
  }));

  setItem(storageKeys.tables, tables);
  return tables;
}

export function getTables(): Table[] {
  const tables = getItem<Table[]>(storageKeys.tables);
  if (!tables || tables.length === 0) return initializeTables();
  return tables.map((t) => normalizeTable(t));
}

function saveTables(tables: Table[]): void {
  setItem(storageKeys.tables, tables);
}

export function getTableById(id: string): Table | undefined {
  return getTables().find((t) => t.id === id);
}

export function getTableByNumber(number: number): Table | undefined {
  return getTables().find((t) => t.number === number);
}

export function updateTableName(
  tableId: string,
  name: string
): { success: true; table: Table } | { success: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Table name is required." };

  const tables = getTables();
  const index = tables.findIndex((t) => t.id === tableId);
  if (index === -1) return { success: false, error: "Table not found." };

  tables[index] = { ...tables[index], name: trimmed };
  saveTables(tables);
  return { success: true, table: tables[index] };
}

export function setTableRunning(tableId: string, orderId: string): void {
  const tables = getTables();
  const index = tables.findIndex((t) => t.id === tableId);
  if (index === -1) return;
  tables[index] = {
    ...tables[index],
    status: "running",
    activeOrderId: orderId,
  };
  saveTables(tables);
}

/** @deprecated use setTableRunning */
export const setTableOccupied = setTableRunning;

export function resetAllTables(): void {
  const tables = getTables().map((t) => ({
    ...t,
    status: "available" as const,
    activeOrderId: null,
  }));
  saveTables(tables);
}

export function setTableAvailable(tableId: string): void {
  const tables = getTables();
  const index = tables.findIndex((t) => t.id === tableId);
  if (index === -1) return;
  tables[index] = {
    ...tables[index],
    status: "available",
    activeOrderId: null,
  };
  saveTables(tables);
}

export function getTableDisplayName(table: Table): string {
  return table.name.trim() || `Table ${table.number}`;
}

export function addTable(): { success: true; table: Table } {
  const tables = getTables();
  const maxNumber = tables.reduce((max, t) => Math.max(max, t.number), 0);
  const nextNumber = maxNumber + 1;
  const newTable: Table = {
    id: generateId(),
    number: nextNumber,
    name: `Table ${nextNumber}`,
    status: "available",
    activeOrderId: null,
  };
  saveTables([...tables, newTable]);
  return { success: true, table: newTable };
}

export function deleteTable(
  tableId: string
): { success: true } | { success: false; error: string } {
  const tables = getTables();
  if (tables.length <= 1) {
    return { success: false, error: "At least one table must remain." };
  }

  const index = tables.findIndex((t) => t.id === tableId);
  if (index === -1) return { success: false, error: "Table not found." };

  const table = tables[index];
  if (table.status === "running" || table.activeOrderId) {
    return {
      success: false,
      error: "Close the open bill before deleting this table.",
    };
  }

  saveTables(tables.filter((t) => t.id !== tableId));
  return { success: true };
}
