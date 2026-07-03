"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/data/categories";
import {
  addCategory,
  deleteCategory,
  getCategories,
  getCategoryItemCount,
  initializeCategories,
} from "@/lib/categories";
import { confirmAction, showError, showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/Button";

interface CategoryManagerModalProps {
  onClose: () => void;
  onChanged: () => void;
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  );
}

function CategoryTag({
  category,
  itemCount,
  onDelete,
}: {
  category: Category;
  itemCount: number;
  onDelete: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 py-1.5 pl-3 pr-1.5 text-sm font-medium text-teal-900 shadow-sm">
      <span className="truncate">{category.name}</span>
      <span
        className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-teal-700"
        title={`${itemCount} item${itemCount !== 1 ? "s" : ""}`}
      >
        {itemCount}
      </span>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-teal-600 transition-colors hover:bg-teal-100 hover:text-red-600"
        aria-label={`Delete ${category.name}`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

export function CategoryManagerModal({ onClose, onChanged }: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  function load() {
    initializeCategories();
    setCategories(getCategories());
  }

  useEffect(() => {
    load();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      showError("Enter a name", "Type a category name before adding.");
      return;
    }

    setIsAdding(true);
    const result = addCategory(newName);
    if (result.success) {
      setNewName("");
      showSuccess("Category added", `"${trimmed}" was created.`);
      load();
      onChanged();
    } else {
      showError("Could not add category", result.error);
    }
    setIsAdding(false);
  }

  async function handleDelete(slug: string, name: string) {
    const confirmed = await confirmAction({
      title: "Delete category?",
      text: `Remove "${name}"? Items in this category may be affected.`,
      confirmText: "Yes, delete",
    });
    if (!confirmed) return;
    const result = deleteCategory(slug);
    if (result.success) {
      showSuccess("Category deleted", `"${name}" was removed.`);
      load();
      onChanged();
    } else {
      showError("Could not delete category", result.error);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-categories-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close manage categories dialog"
      />

      <div className="relative flex max-h-[min(90vh,680px)] w-full max-w-md min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl sm:max-w-lg">
        <div className="relative shrink-0 bg-gradient-to-br from-teal-700 via-emerald-700 to-emerald-800 px-4 pb-4 pt-4 text-white sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Close"
          >
            <CloseIcon />
          </button>

          <div className="flex items-start gap-3 pr-10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <TagIcon />
            </div>
            <div>
              <h2 id="manage-categories-title" className="text-lg font-semibold tracking-tight">
                Manage Categories
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-emerald-50/90">
                Add or remove categories for inventory items
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleAdd}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/80"
        >
          <div className="min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5">
            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-1 text-sm font-semibold text-slate-900">New category</p>
              <p className="mb-3 text-xs text-slate-500">
                Create a label for grouping menu and stock items
              </p>
              <input
                type="text"
                placeholder="e.g. Energy Drinks"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
            </section>

            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Your categories</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {categories.length} tag{categories.length !== 1 ? "s" : ""} · tap × to remove
                  </p>
                </div>
              </div>

              {categories.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  No categories yet — add one above
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <CategoryTag
                      key={cat.id}
                      category={cat}
                      itemCount={getCategoryItemCount(cat.slug)}
                      onDelete={() => handleDelete(cat.slug, cat.name)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={onClose}
            >
              Done
            </Button>
            <Button
              type="submit"
              isLoading={isAdding}
              disabled={!newName.trim()}
              className="w-full bg-teal-700 hover:bg-teal-800 sm:w-auto disabled:bg-slate-300"
            >
              + Add Category
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
