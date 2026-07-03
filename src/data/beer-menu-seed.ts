import type { BeverageCategory } from "@/types/inventory";

/** Bottle price — sold as one unit */
export interface BottleMenuSeed {
  name: string;
  category: BeverageCategory;
  sellPrice: number;
}

export const BEER_MENU_SEED: BottleMenuSeed[] = [
  { name: "Carlsberg Elephant", category: "beer", sellPrice: 400 },
  { name: "Druk 11000", category: "beer", sellPrice: 400 },
  { name: "Kingfisher Ultra Max", category: "beer", sellPrice: 400 },
  { name: "Kingfisher Strong", category: "beer", sellPrice: 400 },
  { name: "Kingfisher Ultra", category: "beer", sellPrice: 400 },
  { name: "Bee Young", category: "beer", sellPrice: 400 },
  { name: "Corona (Pint)", category: "beer", sellPrice: 350 },
  { name: "Heineken (Pint)", category: "beer", sellPrice: 350 },
  { name: "Breezer Cranberry", category: "beer", sellPrice: 250 },
  { name: "Breezer Orange", category: "beer", sellPrice: 250 },
];
