import type { BeverageCategory } from "@/types/inventory";

/** Bottle / unit price — sold as one item, not by peg */
export interface BottleMenuSeed {
  name: string;
  category: BeverageCategory;
  sellPrice: number;
}

export const SOFT_BEVERAGE_MENU_SEED: BottleMenuSeed[] = [
  { name: "Red Bull", category: "soft_beverage", sellPrice: 200 },
  { name: "Fresh Lime Soda / Water", category: "soft_beverage", sellPrice: 120 },
  { name: "Tonic Water", category: "soft_beverage", sellPrice: 149 },
  { name: "Ginger Ale", category: "soft_beverage", sellPrice: 120 },
  { name: "Diet Coke", category: "soft_beverage", sellPrice: 99 },
  { name: "Canned Juice (By Glass)", category: "soft_beverage", sellPrice: 130 },
];
