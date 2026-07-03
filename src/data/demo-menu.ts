import type { BeverageCategory, StockUnitType } from "@/types/inventory";

/** Menu catalog — sell prices only (no stock; stock is added via Inventory) */
export interface MenuSeedItem {
  name: string;
  category: BeverageCategory;
  unitType: StockUnitType;
  sellPrice: number;
  servingSizeMl: number;
  bottleSizeMl?: number;
}

export const MENU_ITEMS: MenuSeedItem[] = [
  // Beer (bottle price) — see beer-menu-seed.ts for full list
  { name: "Carlsberg Elephant", category: "beer", unitType: "bottle", sellPrice: 400, servingSizeMl: 1 },
  { name: "Druk 11000", category: "beer", unitType: "bottle", sellPrice: 400, servingSizeMl: 1 },
  { name: "Kingfisher Ultra Max", category: "beer", unitType: "bottle", sellPrice: 400, servingSizeMl: 1 },
  { name: "Kingfisher Strong", category: "beer", unitType: "bottle", sellPrice: 400, servingSizeMl: 1 },
  { name: "Kingfisher Ultra", category: "beer", unitType: "bottle", sellPrice: 400, servingSizeMl: 1 },
  { name: "Bee Young", category: "beer", unitType: "bottle", sellPrice: 400, servingSizeMl: 1 },
  { name: "Corona (Pint)", category: "beer", unitType: "bottle", sellPrice: 350, servingSizeMl: 1 },
  { name: "Heineken (Pint)", category: "beer", unitType: "bottle", sellPrice: 350, servingSizeMl: 1 },
  { name: "Breezer Cranberry", category: "beer", unitType: "bottle", sellPrice: 250, servingSizeMl: 1 },
  { name: "Breezer Orange", category: "beer", unitType: "bottle", sellPrice: 250, servingSizeMl: 1 },
  // Whisky & Rum (30ml peg + combos) — see spirit-menu-seed.ts for full price list
  { name: "Old Monk", category: "rum", unitType: "pour", sellPrice: 199, servingSizeMl: 30, bottleSizeMl: 750 },
  { name: "Blender's Pride", category: "whisky", unitType: "pour", sellPrice: 149, servingSizeMl: 30, bottleSizeMl: 750 },
  { name: "Signature Premium", category: "whisky", unitType: "pour", sellPrice: 199, servingSizeMl: 30, bottleSizeMl: 750 },
  { name: "J/W Red Label", category: "whisky", unitType: "pour", sellPrice: 249, servingSizeMl: 30, bottleSizeMl: 750 },
  // Vodka
  { name: "Magic Moments", category: "vodka", unitType: "pour", sellPrice: 149, servingSizeMl: 30, bottleSizeMl: 750 },
  // Tequila & Liqueur (30ml peg only)
  { name: "Camino Silver", category: "tequila", unitType: "pour", sellPrice: 380, servingSizeMl: 30, bottleSizeMl: 750 },
  { name: "Camino Gold", category: "tequila", unitType: "pour", sellPrice: 380, servingSizeMl: 30, bottleSizeMl: 750 },
  { name: "Jagermeister", category: "liqueur", unitType: "pour", sellPrice: 299, servingSizeMl: 30, bottleSizeMl: 700 },
  // Soft Beverages (bottle price — no pegs)
  { name: "Red Bull", category: "soft_beverage", unitType: "bottle", sellPrice: 200, servingSizeMl: 1 },
  { name: "Fresh Lime Soda / Water", category: "soft_beverage", unitType: "bottle", sellPrice: 120, servingSizeMl: 1 },
  { name: "Tonic Water", category: "soft_beverage", unitType: "bottle", sellPrice: 149, servingSizeMl: 1 },
  { name: "Ginger Ale", category: "soft_beverage", unitType: "bottle", sellPrice: 120, servingSizeMl: 1 },
  { name: "Diet Coke", category: "soft_beverage", unitType: "bottle", sellPrice: 99, servingSizeMl: 1 },
  { name: "Canned Juice (By Glass)", category: "soft_beverage", unitType: "bottle", sellPrice: 130, servingSizeMl: 1 },
  // Wine
  { name: "Sula Cabernet (Red Wine)", category: "wine", unitType: "bottle", sellPrice: 2000, servingSizeMl: 1 },
  // Cocktails
  { name: "Long Island Iced Tea", category: "cocktail", unitType: "bottle", sellPrice: 549, servingSizeMl: 1 },
  { name: "Sex On The Beach", category: "cocktail", unitType: "bottle", sellPrice: 449, servingSizeMl: 1 },
];

/** @deprecated use MENU_ITEMS */
export const DEMO_MENU_ITEMS = MENU_ITEMS;

export const CATEGORY_ORDER: BeverageCategory[] = [
  "soft_beverage",
  "beer",
  "cocktail",
  "whisky",
  "premium_whisky",
  "single_malt",
  "vodka",
  "rum",
  "gin",
  "tequila",
  "liqueur",
  "wine",
  "other",
];

export const CATEGORY_LABELS: Record<BeverageCategory, string> = {
  soft_beverage: "Soft Beverages",
  beer: "Beer",
  cocktail: "Cocktails",
  whisky: "Whisky",
  premium_whisky: "Premium Whisky",
  single_malt: "Single Malt",
  vodka: "Vodka",
  rum: "Rum",
  gin: "Gin",
  tequila: "Tequila",
  liqueur: "Liqueur",
  wine: "Wine",
  other: "Other",
};
