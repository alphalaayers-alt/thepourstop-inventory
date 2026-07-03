import { ManagersTable } from "@/components/managers/ManagerTable";

export default function ManagersPage() {
  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Managers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create managers and control exactly what each person can access.
        </p>
      </div>
      <ManagersTable />
    </div>
  );
}
