import { DEFAULT_CATEGORIES } from "@/data/categories";
import { BEER_MENU_SEED } from "@/data/beer-menu-seed";
import { SOFT_BEVERAGE_MENU_SEED } from "@/data/soft-beverage-menu-seed";
import { SPIRIT_MENU_SEED, buildPourSizesFromSeed } from "@/data/spirit-menu-seed";
import { getPrimaryPourOption, normalizePourSizes } from "@/lib/pour-sizes";
import type { MenuItem, PourSizePrice, StockEntry, StockUnitType } from "@/types/inventory";

export interface MenuSeedCatalogItem {
  name: string;
  category: string;
  unitType: StockUnitType;
  sellPrice: number;
  servingSizeMl: number;
  pourSizes?: PourSizePrice[];
  bottleSizeMl?: number;
  lowStockThreshold: number;
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function getMenuSeedCatalog(): MenuSeedCatalogItem[] {
  const spirits: MenuSeedCatalogItem[] = SPIRIT_MENU_SEED.map((seed) => {
    const pourSizes = normalizePourSizes(buildPourSizesFromSeed(seed));
    const primary = getPrimaryPourOption(pourSizes);
    return {
      name: seed.name,
      category: seed.category,
      unitType: "pour",
      sellPrice: primary.price,
      servingSizeMl: 30,
      pourSizes,
      bottleSizeMl: 750,
      lowStockThreshold: 150,
    };
  });

  const beers: MenuSeedCatalogItem[] = BEER_MENU_SEED.map((seed) => ({
    name: seed.name,
    category: seed.category,
    unitType: "bottle",
    sellPrice: seed.sellPrice,
    servingSizeMl: 1,
    lowStockThreshold: 5,
  }));

  const soft: MenuSeedCatalogItem[] = SOFT_BEVERAGE_MENU_SEED.map((seed) => ({
    name: seed.name,
    category: seed.category,
    unitType: "bottle",
    sellPrice: seed.sellPrice,
    servingSizeMl: 1,
    lowStockThreshold: 5,
  }));

  return [...spirits, ...beers, ...soft];
}

export function getDefaultCategoryRows() {
  const now = new Date().toISOString();
  return DEFAULT_CATEGORIES.map((cat) => ({
    name: cat.name,
    slug: cat.slug,
    created_at: now,
  }));
}

/** Merge seed catalog with existing menu IDs (match by item name). */
export function buildMenuSyncPayload(existingMenu: MenuItem[]): {
  menu: MenuItem[];
  stock: StockEntry[];
} {
  const catalog = getMenuSeedCatalog();
  const existingByName = new Map(
    existingMenu.map((item) => [nameKey(item.name), item])
  );
  const now = new Date().toISOString();
  const menu: MenuItem[] = [];
  const stock: StockEntry[] = [];

  for (const seed of catalog) {
    const existing = existingByName.get(nameKey(seed.name));
    const id = existing?.id ?? crypto.randomUUID();
    const createdAt = existing?.createdAt ?? now;

    menu.push({
      id,
      name: seed.name,
      category: seed.category,
      unitType: seed.unitType,
      sellPrice: seed.sellPrice,
      servingSizeMl: seed.servingSizeMl,
      pourSizes: seed.pourSizes,
      bottleSizeMl: seed.bottleSizeMl,
      isActive: true,
      createdAt,
    });

    stock.push({
      menuItemId: id,
      stockQuantity: 0,
      purchasePrice: 0,
      lowStockThreshold: seed.lowStockThreshold,
      updatedAt: now,
    });
  }

  return { menu, stock };
}

export const MENU_SEED_ITEM_COUNT = getMenuSeedCatalog().length;
