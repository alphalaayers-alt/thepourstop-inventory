import type { StockAddition } from "@/types/inventory";
import { endOfDay, startOfDay } from "./format";
import { getItem, setItem, storageKeys } from "./storage";

function generateId(): string {
  return crypto.randomUUID();
}

export function getStockAdditions(): StockAddition[] {
  return (getItem<StockAddition[]>(storageKeys.stockAdditions) ?? []).sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );
}

export function logStockAddition(
  entry: Omit<StockAddition, "id">
): StockAddition {
  const record: StockAddition = { ...entry, id: generateId() };
  const log = getStockAdditions();
  log.unshift(record);
  setItem(storageKeys.stockAdditions, log.slice(0, 2000));
  return record;
}

export function getStockAdditionsInRange(from: Date, to: Date): StockAddition[] {
  return getStockAdditions().filter((entry) => {
    const added = new Date(entry.addedAt);
    return added >= from && added <= to;
  });
}

export function getTodayStockAdditions(): StockAddition[] {
  const now = new Date();
  return getStockAdditionsInRange(startOfDay(now), endOfDay(now));
}
