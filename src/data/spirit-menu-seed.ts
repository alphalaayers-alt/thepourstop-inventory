import type { BeverageCategory, PourSizePrice } from "@/types/inventory";

/** 30ml peg; optional 6 / 12 / 25 peg combo prices */
export interface SpiritMenuSeed {
  name: string;
  category: BeverageCategory;
  peg30: number;
  combo6?: number;
  combo12?: number;
  combo25?: number;
}

export const SPIRIT_MENU_SEED: SpiritMenuSeed[] = [
  { name: "J/W Red Label", category: "whisky", peg30: 249, combo6: 1245, combo12: 2241, combo25: 4980 },
  { name: "Ballantine's", category: "whisky", peg30: 289, combo6: 1445, combo12: 2601, combo25: 5780 },
  { name: "Black Dog - 12 Years", category: "whisky", peg30: 299, combo6: 1495, combo12: 2691, combo25: 5980 },
  { name: "Teachers 50", category: "whisky", peg30: 249, combo6: 1245, combo12: 2241, combo25: 4980 },
  { name: "100 Pipers - 12 Years", category: "whisky", peg30: 299, combo6: 1495, combo12: 2691, combo25: 5980 },
  { name: "Black & White", category: "whisky", peg30: 199, combo6: 995, combo12: 1791, combo25: 3980 },
  { name: "Blender's Pride", category: "whisky", peg30: 149, combo6: 745, combo12: 1341, combo25: 2980 },
  { name: "Signature Premium", category: "whisky", peg30: 199, combo6: 999, combo12: 1791, combo25: 3980 },
  { name: "Jack Daniel's", category: "whisky", peg30: 399, combo6: 1995, combo12: 3591, combo25: 7980 },
  { name: "Jameson Irish Whiskey", category: "whisky", peg30: 349, combo6: 1745, combo12: 3141, combo25: 6980 },
  { name: "Jim Beam", category: "whisky", peg30: 340, combo6: 1700, combo12: 3060, combo25: 6800 },
  { name: "Bacardi White", category: "rum", peg30: 249, combo6: 1245, combo12: 2241, combo25: 4980 },
  { name: "Bacardi Lemon", category: "rum", peg30: 230, combo6: 1150, combo12: 2070, combo25: 4600 },
  { name: "Bacardi Black", category: "rum", peg30: 230, combo6: 1150, combo12: 2070, combo25: 4600 },
  { name: "Old Monk", category: "rum", peg30: 199, combo6: 995, combo12: 1791, combo25: 3980 },
  // Gin
  { name: "Bombay Sapphire", category: "gin", peg30: 249, combo6: 1245, combo12: 2241, combo25: 4980 },
  { name: "Beefeater", category: "gin", peg30: 210, combo6: 1050, combo12: 1890, combo25: 4200 },
  // Vodka
  { name: "Magic Moments", category: "vodka", peg30: 149, combo6: 745, combo12: 1620, combo25: 2984 },
  { name: "Absolut Vodka", category: "vodka", peg30: 249, combo6: 1245, combo12: 2241, combo25: 4980 },
  // Single Malt
  { name: "Glenfiddich - 12 Years", category: "single_malt", peg30: 399, combo6: 1995, combo12: 3591, combo25: 7980 },
  { name: "The Glenlivet - 12 Years", category: "single_malt", peg30: 399, combo6: 1995, combo12: 3591, combo25: 7980 },
  { name: "Indri", category: "single_malt", peg30: 449, combo6: 2245, combo12: 4041, combo25: 8980 },
  // Premium Whisky
  { name: "Chivas 18 Years", category: "premium_whisky", peg30: 650, combo6: 3250, combo12: 5850, combo25: 13000 },
  { name: "J/W Black Label", category: "premium_whisky", peg30: 399, combo6: 1995, combo12: 3591, combo25: 7980 },
  { name: "J/W Gold Label", category: "premium_whisky", peg30: 599, combo6: 2995, combo12: 5391, combo25: 11980 },
  // Liqueur & Tequila (30ml peg only — no combos)
  { name: "Jagermeister", category: "liqueur", peg30: 299 },
  { name: "Camino Silver", category: "tequila", peg30: 380 },
  { name: "Camino Gold", category: "tequila", peg30: 380 },
];

export function buildPourSizesFromSeed(seed: SpiritMenuSeed): PourSizePrice[] {
  const sizes: PourSizePrice[] = [{ ml: 30, price: seed.peg30, pours: 1 }];

  if (seed.combo6 != null && seed.combo6 > 0) {
    sizes.push({ ml: 30, price: seed.combo6, pours: 6, isCombo: true });
  }
  if (seed.combo12 != null && seed.combo12 > 0) {
    sizes.push({ ml: 30, price: seed.combo12, pours: 12, isCombo: true });
  }
  if (seed.combo25 != null && seed.combo25 > 0) {
    sizes.push({ ml: 30, price: seed.combo25, pours: 25, isCombo: true });
  }

  return sizes;
}
