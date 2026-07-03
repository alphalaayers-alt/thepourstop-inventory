export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export const DEFAULT_CATEGORIES: { name: string; slug: string }[] = [
  { name: "Soft Beverages", slug: "soft_beverage" },
  { name: "Beer", slug: "beer" },
  { name: "Cocktails", slug: "cocktail" },
  { name: "Whisky", slug: "whisky" },
  { name: "Premium Whisky", slug: "premium_whisky" },
  { name: "Single Malt", slug: "single_malt" },
  { name: "Vodka", slug: "vodka" },
  { name: "Rum", slug: "rum" },
  { name: "Gin", slug: "gin" },
  { name: "Tequila", slug: "tequila" },
  { name: "Liqueur", slug: "liqueur" },
  { name: "Wine", slug: "wine" },
  { name: "Other", slug: "other" },
];
