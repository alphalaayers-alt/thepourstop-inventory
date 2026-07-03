"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { ManagerPermissions } from "@/types/auth";

const navItems: {
  label: string;
  href: string;
  permission: keyof ManagerPermissions;
}[] = [
  { label: "Dashboard", href: "/manager", permission: "viewDashboard" },
  { label: "Inventory", href: "/manager/inventory", permission: "viewInventory" },
  { label: "Tables", href: "/manager/tables", permission: "manageTables" },
  { label: "Quick Billing", href: "/manager/billing", permission: "walkInBilling" },
  { label: "Sales", href: "/manager/sales", permission: "viewSales" },
];

export function ManagerSidebar() {
  const pathname = usePathname();
  const { session, logout, hasPermission } = useAuth();

  const visibleItems = navItems.filter((item) => hasPermission(item.permission));

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
            PS
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">The Pour Stop</p>
            <p className="text-xs text-slate-500">Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/manager"
              ? pathname === "/manager"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-700 text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {visibleItems.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-400">
            No pages enabled. Contact your super admin.
          </p>
        )}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-slate-900">{session?.name}</p>
          <p className="truncate text-xs text-slate-500">{session?.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
