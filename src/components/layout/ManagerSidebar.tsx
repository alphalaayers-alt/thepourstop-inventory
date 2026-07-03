"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { ManagerPermissions } from "@/types/auth";
import { managerNavItems, managerNavPermissions } from "./manager-nav";

interface ManagerSidebarProps {
  onNavigate?: () => void;
}

const sidebarLabels: Record<string, string> = {
  "/manager": "Dashboard",
  "/manager/inventory": "Inventory",
  "/manager/tables": "Tables",
  "/manager/billing": "Quick Billing",
  "/manager/sales": "Sales",
};

export function ManagerSidebar({ onNavigate }: ManagerSidebarProps) {
  const pathname = usePathname();
  const { session, logout, hasPermission } = useAuth();

  const visibleItems = managerNavItems.filter((item) => {
    const perm = managerNavPermissions[item.href];
    return perm ? hasPermission(perm) : true;
  });

  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
            PS
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">The Pour Stop</p>
            <p className="text-xs text-slate-500">Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const isActive = item.match
            ? item.match(pathname, item.href)
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-700 text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.icon}
              {sidebarLabels[item.href] ?? item.label}
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
          type="button"
          onClick={() => {
            logout();
            onNavigate?.();
          }}
          className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function getManagerBottomNavItems(
  hasPermission: (permission: keyof ManagerPermissions) => boolean
) {
  return managerNavItems.filter((item) => {
    const perm = managerNavPermissions[item.href];
    return perm ? hasPermission(perm) : true;
  });
}
