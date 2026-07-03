"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MENU_SEED_ITEM_COUNT } from "@/lib/menu-seed-sync";
import { confirmAction, showError, showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { refreshCloudData } from "@/lib/cloud/refresh";

export function MenuCatalogSyncButton() {
  const { isCloudMode, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isCloudMode || !isSuperAdmin) return null;

  async function handleSync() {
    const confirmed = await confirmAction({
      title: "Sync menu to live server?",
      text: `This uploads all ${MENU_SEED_ITEM_COUNT} catalog items (names, prices, categories, combos) to Supabase and sets stock to 0 for each. Existing items are matched by name and updated.`,
      confirmText: "Yes, sync now",
      icon: "question",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/sync-menu", { method: "POST" });
      const data = (await res.json()) as {
        success?: boolean;
        synced?: number;
        error?: string;
        message?: string;
      };

      if (!res.ok || !data.success) {
        showError("Sync failed", data.error ?? "Could not sync menu.");
        return;
      }

      await refreshCloudData();
      showSuccess(
        "Menu synced",
        data.message ?? `Updated ${data.synced ?? 0} items on the live server.`
      );
      window.dispatchEvent(new CustomEvent("pourstop:stock-updated"));
    } catch {
      showError("Sync failed", "Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={handleSync}
      isLoading={loading}
      title="Upload catalog from app to Supabase (0 stock)"
    >
      Sync to Live
    </Button>
  );
}
