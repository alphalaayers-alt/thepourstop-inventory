import type {
  BillActivity,
  BeverageCategory,
  MenuItem,
  Order,
  PourSizePrice,
  SellableItem,
  StockEntry,
  StockUnitType,
  CreateInventoryInput,
  RestockInput,
} from "@/types/inventory";
import { getItem, setItem, removeItem, storageKeys } from "./storage";
import { useCloudDatabase } from "./data-backend";
import { initializeCategories } from "./categories";
import { resetAllTables } from "./tables";
import { logStockAddition } from "./stock-additions";
import {
  getItemPourSizes,
  getMinPourMl,
  getMenuBottleSizeMl,
  getPrimaryPourOption,
  normalizePourSizes,
  sanitizePourSizes,
} from "./pour-sizes";
import {
  SPIRIT_MENU_SEED,
  buildPourSizesFromSeed,
} from "@/data/spirit-menu-seed";
import { SOFT_BEVERAGE_MENU_SEED } from "@/data/soft-beverage-menu-seed";
import { BEER_MENU_SEED } from "@/data/beer-menu-seed";
import type { BottleMenuSeed } from "@/data/soft-beverage-menu-seed";

const DATA_VERSION = 3;

function generateId(): string {
  return crypto.randomUUID();
}

// ─── Menu ───────────────────────────────────────────────────────────────────

export function getMenu(): MenuItem[] {
  return getItem<MenuItem[]>(storageKeys.menu) ?? [];
}

function saveMenu(items: MenuItem[]): void {
  setItem(storageKeys.menu, items);
}

export function getMenuItem(id: string): MenuItem | undefined {
  return getMenu().find((m) => m.id === id);
}

// ─── Stock ──────────────────────────────────────────────────────────────────

export function getStockEntries(): StockEntry[] {
  return getItem<StockEntry[]>(storageKeys.stock) ?? [];
}

function saveStock(entries: StockEntry[]): void {
  setItem(storageKeys.stock, entries);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pourstop:stock-updated"));
  }
}

export const STOCK_UPDATED_EVENT = "pourstop:stock-updated";

export function getStock(menuItemId: string): StockEntry | undefined {
  return getStockEntries().find((s) => s.menuItemId === menuItemId);
}

// ─── Joined catalog view ────────────────────────────────────────────────────

export function toSellable(menu: MenuItem, stock?: StockEntry): SellableItem {
  const entry =
    stock ??
    ({
      menuItemId: menu.id,
      stockQuantity: 0,
      purchasePrice: 0,
      lowStockThreshold: menu.unitType === "bottle" ? 5 : 150,
      updatedAt: menu.createdAt,
    } satisfies StockEntry);

  return {
    id: menu.id,
    name: menu.name,
    category: menu.category,
    unitType: menu.unitType,
    sellPrice: menu.sellPrice,
    servingSizeMl: menu.servingSizeMl,
    pourSizes: menu.pourSizes,
    bottleSizeMl: menu.bottleSizeMl,
    purchasePrice: entry.purchasePrice,
    stockQuantity: entry.stockQuantity,
    lowStockThreshold: entry.lowStockThreshold,
    createdAt: menu.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function getSellableItems(): SellableItem[] {
  const menu = getMenu().filter((m) => m.isActive);
  const stockMap = new Map(getStockEntries().map((s) => [s.menuItemId, s]));
  return menu.map((m) => toSellable(m, stockMap.get(m.id)));
}

export function getSellableItem(id: string): SellableItem | undefined {
  const menu = getMenuItem(id);
  if (!menu) return undefined;
  return toSellable(menu, getStock(id));
}

export function searchSellableItems(query: string): SellableItem[] {
  const q = query.toLowerCase().trim();
  const all = getSellableItems();
  if (!q) return getAvailableSellable();
  return all.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  );
}

export function getAvailableSellable(): SellableItem[] {
  return getSellableItems().filter((item) => {
    if (item.unitType === "bottle") return item.stockQuantity > 0;
    return item.stockQuantity >= getMinPourMl(item);
  });
}

export function isLowStock(item: SellableItem): boolean {
  return item.stockQuantity <= item.lowStockThreshold;
}

export function calcStockNeeded(
  item: SellableItem,
  quantity: number,
  servingSizeMl?: number
): number {
  if (item.unitType === "bottle") return quantity;
  const ml = servingSizeMl ?? item.servingSizeMl;
  return quantity * ml;
}

export function getReservedStock(
  menuItemId: string,
  excludeOrderId?: string
): number {
  const orders = getItem<Order[]>(storageKeys.orders) ?? [];
  return orders
    .filter((o) => o.status === "active" && o.id !== excludeOrderId)
    .flatMap((o) => o.items)
    .filter((i) => i.menuItemId === menuItemId && !i.served)
    .reduce((sum, i) => sum + i.stockDeducted, 0);
}

export function getAvailableStockForOrder(
  menuItemId: string,
  excludeOrderId?: string
): number {
  const item = getSellableItem(menuItemId);
  if (!item) return 0;
  const reserved = getReservedStock(menuItemId, excludeOrderId);
  return item.stockQuantity - reserved;
}

export function canFulfillQuantity(
  menuItemId: string,
  quantity: number,
  excludeOrderId?: string,
  servingSizeMl?: number
): { ok: true } | { ok: false; error: string } {
  const item = getSellableItem(menuItemId);
  if (!item) return { ok: false, error: "Item not found." };

  const needed = calcStockNeeded(item, quantity, servingSizeMl);
  const available = getAvailableStockForOrder(menuItemId, excludeOrderId);

  if (available < needed) {
    const unit = item.unitType === "pour" ? "ml" : "bottles";
    return {
      ok: false,
      error: `Not enough stock for ${item.name}. Available: ${available}${item.unitType === "pour" ? " ml" : ` ${unit}`}.`,
    };
  }
  return { ok: true };
}

// ─── Stock mutations (on bill complete / restock) ─────────────────────────────

export function deductStock(
  menuItemId: string,
  quantity: number,
  servingSizeMl?: number
): { success: true; item: SellableItem } | { success: false; error: string } {
  const item = getSellableItem(menuItemId);
  if (!item) return { success: false, error: "Item not found." };

  const deductAmount = calcStockNeeded(item, quantity, servingSizeMl);
  const entries = getStockEntries();
  const index = entries.findIndex((s) => s.menuItemId === menuItemId);
  if (index === -1) return { success: false, error: "Stock entry not found." };

  if (entries[index].stockQuantity < deductAmount) {
    return {
      success: false,
      error: `Not enough stock for ${item.name}.`,
    };
  }

  entries[index] = {
    ...entries[index],
    stockQuantity: entries[index].stockQuantity - deductAmount,
    updatedAt: new Date().toISOString(),
  };
  saveStock(entries);
  const updated = getSellableItem(menuItemId);
  return updated
    ? { success: true, item: updated }
    : { success: false, error: "Update failed." };
}

export function restoreStock(
  menuItemId: string,
  quantity: number,
  servingSizeMl?: number
): { success: true; item: SellableItem } | { success: false; error: string } {
  const item = getSellableItem(menuItemId);
  if (!item) return { success: false, error: "Item not found." };

  const restoreAmount = calcStockNeeded(item, quantity, servingSizeMl);
  const entries = getStockEntries();
  const index = entries.findIndex((s) => s.menuItemId === menuItemId);
  if (index === -1) return { success: false, error: "Stock entry not found." };

  entries[index] = {
    ...entries[index],
    stockQuantity: entries[index].stockQuantity + restoreAmount,
    updatedAt: new Date().toISOString(),
  };
  saveStock(entries);
  const updated = getSellableItem(menuItemId);
  return updated
    ? { success: true, item: updated }
    : { success: false, error: "Update failed." };
}

export function createMenuAndStock(
  input: CreateInventoryInput
): { success: true; item: SellableItem } | { success: false; error: string } {
  if (!input.name.trim()) return { success: false, error: "Item name is required." };
  if (input.quantity <= 0) return { success: false, error: "Quantity must be greater than zero." };

  const nameKey = input.name.trim().toLowerCase();
  const duplicate = getMenu().find(
    (m) => m.isActive && m.name.trim().toLowerCase() === nameKey
  );
  if (duplicate) {
    return {
      success: false,
      error: `"${input.name.trim()}" is already on the menu. Use Add Stock to increase quantity.`,
    };
  }

  let sellPrice = input.sellPrice ?? 0;
  let servingSizeMl = 1;
  let pourSizes: PourSizePrice[] | undefined;

  if (input.unitType === "bottle") {
    if (sellPrice < 0) return { success: false, error: "Sell price cannot be negative." };
  } else {
    const sizes = normalizePourSizes(input.pourSizes ?? []);
    if (sizes.length === 0) {
      return { success: false, error: "Add at least one pour size with ml and price." };
    }
    const hasCombo = sizes.some((s) => (s.pours ?? 1) > 1 || s.isCombo);
    if (hasCombo && sizes.filter((s) => (s.pours ?? 1) > 1 || s.isCombo).every((s) => s.price <= 0)) {
      return { success: false, error: "Set a price for the combo deal." };
    }
    pourSizes = sizes;
    const primary = getPrimaryPourOption(sizes);
    servingSizeMl = primary.totalMl;
    sellPrice = primary.price;
  }

  const resolvedBottleSizeMl =
    input.unitType === "pour"
      ? input.bottleSizeMl ?? getMenuBottleSizeMl(pourSizes ?? [])
      : undefined;

  const now = new Date().toISOString();
  const menuItem: MenuItem = {
    id: generateId(),
    name: input.name.trim(),
    category: input.category,
    unitType: input.unitType,
    sellPrice,
    servingSizeMl,
    pourSizes,
    bottleSizeMl: resolvedBottleSizeMl,
    isActive: true,
    createdAt: now,
  };

  const stock: StockEntry = {
    menuItemId: menuItem.id,
    stockQuantity: input.quantity,
    purchasePrice: input.purchasePrice,
    lowStockThreshold:
      input.lowStockThreshold ?? (input.unitType === "bottle" ? 5 : 150),
    updatedAt: now,
  };

  saveMenu([...getMenu(), menuItem]);
  saveStock([...getStockEntries(), stock]);

  logStockAddition({
    menuItemId: menuItem.id,
    itemName: menuItem.name,
    category: menuItem.category,
    unitType: menuItem.unitType,
    quantity: input.quantity,
    purchasePrice: input.purchasePrice,
    type: "initial",
    managerName: input.managerName ?? "Manager",
    addedAt: now,
  });

  const sellable = toSellable(menuItem, stock)!;
  return { success: true, item: sellable };
}

export function restockItem(
  input: RestockInput
): { success: true; item: SellableItem } | { success: false; error: string } {
  if (input.quantity <= 0) return { success: false, error: "Quantity must be greater than zero." };

  const item = getSellableItem(input.itemId);
  if (!item) return { success: false, error: "Item not found." };

  const entries = getStockEntries();
  const index = entries.findIndex((s) => s.menuItemId === input.itemId);
  const now = new Date().toISOString();

  if (index === -1) {
    const menuItem = getMenuItem(input.itemId);
    if (!menuItem?.isActive) return { success: false, error: "Item not found." };

    const entry: StockEntry = {
      menuItemId: input.itemId,
      stockQuantity: input.quantity,
      purchasePrice: input.purchasePrice ?? 0,
      lowStockThreshold: menuItem.unitType === "bottle" ? 5 : 150,
      updatedAt: now,
    };
    saveStock([...entries, entry]);

    logStockAddition({
      menuItemId: item.id,
      itemName: item.name,
      category: item.category,
      unitType: item.unitType,
      quantity: input.quantity,
      purchasePrice: entry.purchasePrice,
      type: "restock",
      managerName: input.managerName ?? "Manager",
      addedAt: now,
    });

    const updated = getSellableItem(input.itemId);
    return updated
      ? { success: true, item: updated }
      : { success: false, error: "Update failed." };
  }

  entries[index] = {
    ...entries[index],
    stockQuantity: entries[index].stockQuantity + input.quantity,
    purchasePrice: input.purchasePrice ?? entries[index].purchasePrice,
    updatedAt: now,
  };
  saveStock(entries);

  logStockAddition({
    menuItemId: item.id,
    itemName: item.name,
    category: item.category,
    unitType: item.unitType,
    quantity: input.quantity,
    purchasePrice: input.purchasePrice ?? entries[index].purchasePrice,
    type: "restock",
    managerName: input.managerName ?? "Manager",
    addedAt: now,
  });

  const updated = getSellableItem(input.itemId);
  return updated
    ? { success: true, item: updated }
    : { success: false, error: "Item not found." };
}

// ─── Activity log ───────────────────────────────────────────────────────────

export function getActivityLog(): BillActivity[] {
  return (getItem<BillActivity[]>(storageKeys.activity) ?? []).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function logActivity(entry: Omit<BillActivity, "id">): void {
  const log = getActivityLog();
  log.unshift({ ...entry, id: generateId() });
  setItem(storageKeys.activity, log.slice(0, 500));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pourstop:activity-updated"));
  }
}

export const ACTIVITY_UPDATED_EVENT = "pourstop:activity-updated";

// ─── Init: menu only, no fake bills/stock ────────────────────────────────────

function purgeTransactionalData(): void {
  setItem(storageKeys.orders, []);
  setItem(storageKeys.activity, []);
  setItem(storageKeys.stock, []);
  setItem(storageKeys.stockAdditions, []);
  removeItem(storageKeys.inventory);
  resetAllTables();
}

/** Wipe all sales history, stock, and menu items — manager adds fresh data. */
export function resetAllShopData(): void {
  purgeTransactionalData();
  saveMenu([]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STOCK_UPDATED_EVENT));
    window.dispatchEvent(new CustomEvent(ACTIVITY_UPDATED_EVENT));
  }
}

/** Default pour prices for spirits — 30ml peg only */
function seedPourSizes(basePrice30ml: number): PourSizePrice[] {
  return [{ ml: 30, price: basePrice30ml, pours: 1 }];
}

function menuItemNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Idempotent — adds spirit menu items with 0 stock and full combo pricing. */
export function seedSpiritMenuItems(): void {
  const menu = getMenu();
  const stock = getStockEntries();
  const stockByMenuId = new Map(stock.map((entry) => [entry.menuItemId, entry]));
  const now = new Date().toISOString();
  let menuChanged = false;
  let stockChanged = false;
  const updatedMenu = [...menu];
  const updatedStock = [...stock];

  for (const seed of SPIRIT_MENU_SEED) {
    const pourSizes = normalizePourSizes(buildPourSizesFromSeed(seed));
    const primary = getPrimaryPourOption(pourSizes);
    const nameKey = menuItemNameKey(seed.name);

    const existingIndex = updatedMenu.findIndex(
      (item) => item.isActive && menuItemNameKey(item.name) === nameKey
    );

    if (existingIndex >= 0) {
      const existing = updatedMenu[existingIndex];
      const next: MenuItem = {
        ...existing,
        category: seed.category,
        unitType: "pour",
        pourSizes,
        servingSizeMl: 30,
        sellPrice: primary.price,
        bottleSizeMl: existing.bottleSizeMl ?? 750,
      };

      if (JSON.stringify(next) !== JSON.stringify(existing)) {
        updatedMenu[existingIndex] = next;
        menuChanged = true;
      }

      if (!stockByMenuId.has(existing.id)) {
        updatedStock.push({
          menuItemId: existing.id,
          stockQuantity: 0,
          purchasePrice: 0,
          lowStockThreshold: 150,
          updatedAt: now,
        });
        stockChanged = true;
      }
      continue;
    }

    const id = generateId();
    const menuItem: MenuItem = {
      id,
      name: seed.name,
      category: seed.category,
      unitType: "pour",
      sellPrice: primary.price,
      servingSizeMl: 30,
      pourSizes,
      bottleSizeMl: 750,
      isActive: true,
      createdAt: now,
    };

    updatedMenu.push(menuItem);
    updatedStock.push({
      menuItemId: id,
      stockQuantity: 0,
      purchasePrice: 0,
      lowStockThreshold: 150,
      updatedAt: now,
    });
    menuChanged = true;
    stockChanged = true;
  }

  if (menuChanged) saveMenu(updatedMenu);
  if (stockChanged) saveStock(updatedStock);
}

/** Idempotent — adds bottle-priced menu items with 0 stock (no peg pricing). */
function seedBottleMenuItems(seeds: BottleMenuSeed[]): void {
  const menu = getMenu();
  const stock = getStockEntries();
  const stockByMenuId = new Map(stock.map((entry) => [entry.menuItemId, entry]));
  const now = new Date().toISOString();
  let menuChanged = false;
  let stockChanged = false;
  const updatedMenu = [...menu];
  const updatedStock = [...stock];

  for (const seed of seeds) {
    const nameKey = menuItemNameKey(seed.name);

    const existingIndex = updatedMenu.findIndex(
      (item) => item.isActive && menuItemNameKey(item.name) === nameKey
    );

    if (existingIndex >= 0) {
      const existing = updatedMenu[existingIndex];
      const next: MenuItem = {
        ...existing,
        category: seed.category,
        unitType: "bottle",
        sellPrice: seed.sellPrice,
        servingSizeMl: 1,
        pourSizes: undefined,
        bottleSizeMl: undefined,
      };

      if (JSON.stringify(next) !== JSON.stringify(existing)) {
        updatedMenu[existingIndex] = next;
        menuChanged = true;
      }

      if (!stockByMenuId.has(existing.id)) {
        updatedStock.push({
          menuItemId: existing.id,
          stockQuantity: 0,
          purchasePrice: 0,
          lowStockThreshold: 5,
          updatedAt: now,
        });
        stockChanged = true;
      }
      continue;
    }

    const id = generateId();
    const menuItem: MenuItem = {
      id,
      name: seed.name,
      category: seed.category,
      unitType: "bottle",
      sellPrice: seed.sellPrice,
      servingSizeMl: 1,
      isActive: true,
      createdAt: now,
    };

    updatedMenu.push(menuItem);
    updatedStock.push({
      menuItemId: id,
      stockQuantity: 0,
      purchasePrice: 0,
      lowStockThreshold: 5,
      updatedAt: now,
    });
    menuChanged = true;
    stockChanged = true;
  }

  if (menuChanged) saveMenu(updatedMenu);
  if (stockChanged) saveStock(updatedStock);
}

export function seedSoftBeverageMenuItems(): void {
  seedBottleMenuItems(SOFT_BEVERAGE_MENU_SEED);
}

export function seedBeerMenuItems(): void {
  seedBottleMenuItems(BEER_MENU_SEED);
}

/** Seed all default menu items (spirits + soft beverages). */
export function seedDefaultMenuItems(): void {
  initializeCategories();
  seedSpiritMenuItems();
  seedBeerMenuItems();
  seedSoftBeverageMenuItems();
}

/** Returns saved menu — no demo seed; manager adds items via Inventory. */
export function initializeMenu(): MenuItem[] {
  return getMenu();
}

/** Clean legacy pour sizes (old 60/120/250 auto sizes, duplicate combos) */
function migratePourSizeCombos(): void {
  const menu = getMenu();
  let changed = false;
  const updated = menu.map((item) => {
    if (item.unitType !== "pour" || !item.pourSizes?.length) return item;

    const cleaned = sanitizePourSizes(item.pourSizes);
    if (JSON.stringify(cleaned) === JSON.stringify(item.pourSizes)) return item;

    changed = true;
    const primary = getPrimaryPourOption(cleaned);
    return {
      ...item,
      pourSizes: cleaned,
      servingSizeMl: primary.totalMl,
      sellPrice: primary.price,
    };
  });
  if (changed) saveMenu(updated);
}

/** Add multi-ml pour sizes to spirits saved before this feature */
function migrateMenuPourSizes(): void {
  const menu = getMenu();
  let changed = false;
  const updated = menu.map((item) => {
    if (item.unitType === "pour" && (!item.pourSizes || item.pourSizes.length === 0)) {
      changed = true;
      const pourSizes = seedPourSizes(item.sellPrice);
      return { ...item, pourSizes, servingSizeMl: 30 };
    }
    return item;
  });
  if (changed) saveMenu(updated);
}

/** Run once on app load — migrations only; menu starts empty for manager setup. */
export function initializeAppData(): void {
  if (!useCloudDatabase()) {
    const version = getItem<number>(storageKeys.dataVersion) ?? 0;

    if (version < DATA_VERSION) {
      resetAllShopData();
      setItem(storageKeys.dataVersion, DATA_VERSION);
    }

    migrateMenuPourSizes();
    migratePourSizeCombos();
  }

  seedDefaultMenuItems();
  initializeMenu();
  if (!useCloudDatabase()) {
    initializeCategories();
  }
}

// Backward-compatible aliases
export const getInventory = getSellableItems;
export const getInventoryItem = getSellableItem;
export const getAvailableInventory = getAvailableSellable;
export const initializeDemoData = initializeAppData;
export const initializeDemoInventory = initializeAppData;
export const createInventoryItem = createMenuAndStock;

export function deleteInventoryItem(
  id: string
): { success: true } | { success: false; error: string } {
  const menu = getMenu();
  if (!menu.some((m) => m.id === id)) {
    return { success: false, error: "Item not found." };
  }
  saveMenu(menu.map((m) => (m.id === id ? { ...m, isActive: false } : m)));
  saveStock(getStockEntries().filter((s) => s.menuItemId !== id));
  return { success: true };
}

export function updateInventoryItem(
  menuItemId: string,
  input: {
    name?: string;
    category?: BeverageCategory;
    unitType?: StockUnitType;
    sellPrice?: number;
    stockQuantity?: number;
    purchasePrice?: number;
    servingSizeMl?: number;
    pourSizes?: PourSizePrice[];
    bottleSizeMl?: number;
    lowStockThreshold?: number;
    managerName?: string;
  }
): { success: true; item: SellableItem } | { success: false; error: string } {
  const menu = getMenu();
  const menuIndex = menu.findIndex((m) => m.id === menuItemId && m.isActive);
  if (menuIndex === -1) {
    return { success: false, error: "Item not found." };
  }

  const menuItem = { ...menu[menuIndex] };

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) return { success: false, error: "Item name is required." };
    menuItem.name = trimmed;
  }

  if (input.category !== undefined) {
    menuItem.category = input.category;
  }

  if (input.unitType !== undefined) {
    menuItem.unitType = input.unitType;
    if (input.unitType === "bottle") {
      menuItem.servingSizeMl = 1;
      menuItem.pourSizes = undefined;
    }
  }

  if (input.bottleSizeMl !== undefined) {
    menuItem.bottleSizeMl = input.bottleSizeMl;
  }

  const effectiveType = menuItem.unitType;

  if (effectiveType === "bottle") {
    if (input.sellPrice !== undefined) {
      if (input.sellPrice < 0) {
        return { success: false, error: "Sell price cannot be negative." };
      }
      menuItem.sellPrice = input.sellPrice;
    }
    menuItem.pourSizes = undefined;
    menuItem.servingSizeMl = 1;
  } else if (input.pourSizes !== undefined) {
    const sizes = normalizePourSizes(input.pourSizes);
    if (sizes.length === 0) {
      return { success: false, error: "Add at least one pour size with ml and price." };
    }
    menuItem.pourSizes = sizes;
    const primary = getPrimaryPourOption(sizes);
    menuItem.servingSizeMl = primary.totalMl;
    menuItem.sellPrice = primary.price;
    menuItem.bottleSizeMl =
      input.bottleSizeMl ?? getMenuBottleSizeMl(sizes) ?? menuItem.bottleSizeMl;
  } else if (input.sellPrice !== undefined || input.servingSizeMl !== undefined) {
    const sizes = getItemPourSizes(menuItem);
    const idx = sizes.findIndex(
      (s) => s.ml === (input.servingSizeMl ?? menuItem.servingSizeMl)
    );
    if (idx >= 0) {
      sizes[idx] = {
        ml: input.servingSizeMl ?? sizes[idx].ml,
        price: input.sellPrice ?? sizes[idx].price,
      };
      menuItem.pourSizes = normalizePourSizes(sizes);
      menuItem.servingSizeMl = menuItem.pourSizes[0].ml;
      menuItem.sellPrice = menuItem.pourSizes[0].price;
    }
  }

  menu[menuIndex] = menuItem;
  saveMenu(menu);

  const now = new Date().toISOString();
  const entries = getStockEntries();
  const stockIndex = entries.findIndex((s) => s.menuItemId === menuItemId);

  const defaultThreshold = effectiveType === "bottle" ? 5 : 150;

  if (stockIndex === -1) {
    if (
      input.stockQuantity !== undefined ||
      input.purchasePrice !== undefined ||
      input.lowStockThreshold !== undefined
    ) {
      entries.push({
        menuItemId,
        stockQuantity: input.stockQuantity ?? 0,
        purchasePrice: input.purchasePrice ?? 0,
        lowStockThreshold: input.lowStockThreshold ?? defaultThreshold,
        updatedAt: now,
      });
      saveStock(entries);
    }
  } else {
    const entry = { ...entries[stockIndex] };
    const previousQty = entry.stockQuantity;
    if (input.stockQuantity !== undefined) {
      if (input.stockQuantity < 0) {
        return { success: false, error: "Stock cannot be negative." };
      }
      entry.stockQuantity = input.stockQuantity;
    }
    if (input.purchasePrice !== undefined) {
      if (input.purchasePrice < 0) {
        return { success: false, error: "Purchase price cannot be negative." };
      }
      entry.purchasePrice = input.purchasePrice;
    }
    if (input.lowStockThreshold !== undefined) {
      entry.lowStockThreshold = input.lowStockThreshold;
    } else if (input.unitType !== undefined) {
      entry.lowStockThreshold = defaultThreshold;
    }
    entry.updatedAt = now;
    entries[stockIndex] = entry;
    saveStock(entries);

    if (
      input.stockQuantity !== undefined &&
      input.stockQuantity > previousQty
    ) {
      logStockAddition({
        menuItemId,
        itemName: menuItem.name,
        category: menuItem.category,
        unitType: menuItem.unitType,
        quantity: input.stockQuantity - previousQty,
        purchasePrice: entry.purchasePrice,
        type: "adjustment",
        managerName: input.managerName ?? "Manager",
        addedAt: now,
      });
    }
  }

  const updated = getSellableItem(menuItemId);
  return updated
    ? { success: true, item: updated }
    : { success: false, error: "Update failed." };
}
