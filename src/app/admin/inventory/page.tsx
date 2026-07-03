import { InventoryGrid } from "@/components/inventory/InventoryGrid";

export default function AdminInventoryPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">
          Full inventory control — add, edit, delete items and manage stock.
        </p>
      </div>
      <InventoryGrid fullAccess />
    </div>
  );
}
