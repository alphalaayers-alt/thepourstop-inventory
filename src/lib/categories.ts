import type { Category } from "@/data/categories";
import type { MenuItem } from "@/types/inventory";
import { DEFAULT_CATEGORIES } from "@/data/categories";
import { getItem, setItem, storageKeys } from "./storage";

function generateId(): string {
  return crypto.randomUUID();
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function getCategories(): Category[] {
  return getItem<Category[]>(storageKeys.categories) ?? [];
}

function saveCategories(categories: Category[]): void {
  setItem(storageKeys.categories, categories);
}

export function initializeCategories(): Category[] {
  const existing = getCategories();
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const categories: Category[] = DEFAULT_CATEGORIES.map((c) => ({
    id: generateId(),
    name: c.name,
    slug: c.slug,
    createdAt: now,
  }));

  saveCategories(categories);
  return categories;
}

export function getCategoryName(slug: string): string {
  const cat = getCategories().find((c) => c.slug === slug);
  if (cat) return cat.name;
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getCategorySlugs(): string[] {
  return getCategories().map((c) => c.slug);
}

export function addCategory(
  name: string
): { success: true; category: Category } | { success: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Category name is required." };
  }

  const slug = toSlug(trimmed);
  if (!slug) {
    return { success: false, error: "Enter a valid category name." };
  }

  const categories = getCategories();
  if (categories.some((c) => c.slug === slug)) {
    return { success: false, error: "This category already exists." };
  }

  const category: Category = {
    id: generateId(),
    name: trimmed,
    slug,
    createdAt: new Date().toISOString(),
  };

  saveCategories([...categories, category]);
  return { success: true, category };
}

export function deleteCategory(
  slug: string
): { success: true } | { success: false; error: string } {
  const categories = getCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    return { success: false, error: "Category not found." };
  }

  const itemsInCategory = getMenuItems().filter(
    (m) => m.isActive && m.category === slug
  ).length;

  if (itemsInCategory > 0) {
    return {
      success: false,
      error: `Cannot delete — ${itemsInCategory} item(s) use this category. Reassign or delete them first.`,
    };
  }

  if (categories.length <= 1) {
    return { success: false, error: "At least one category must remain." };
  }

  saveCategories(categories.filter((c) => c.slug !== slug));
  return { success: true };
}

export function getCategoryItemCount(slug: string): number {
  return getMenuItems().filter((m) => m.isActive && m.category === slug).length;
}

function getMenuItems(): MenuItem[] {
  return getItem<MenuItem[]>(storageKeys.menu) ?? [];
}
