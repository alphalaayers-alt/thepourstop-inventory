import { InventoryGrid } from "@/components/inventory/InventoryGrid";

export default function ManagerInventoryPage() {
  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">Stock levels, items, and reports</p>
      </div>
      <InventoryGrid />
    </div>
  );
}
