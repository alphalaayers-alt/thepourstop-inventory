import type { ManagerPermissions, Session, User } from "@/types/auth";
import { getItem, storageKeys } from "./storage";

export const PERMISSION_GROUPS: {
  label: string;
  description: string;
  permissions: {
    key: keyof ManagerPermissions;
    label: string;
    description: string;
  }[];
}[] = [
  {
    label: "Dashboard",
    description: "Overview and live activity",
    permissions: [
      {
        key: "viewDashboard",
        label: "View dashboard",
        description: "See today's stats, charts, and bill activity",
      },
      {
        key: "viewActivity",
        label: "View bill activity",
        description: "See live bill changes and completions",
      },
    ],
  },
  {
    label: "Inventory",
    description: "Stock and menu items",
    permissions: [
      {
        key: "viewInventory",
        label: "View inventory",
        description: "Browse stock levels and sell prices",
      },
      {
        key: "addInventoryItem",
        label: "Add new items",
        description: "Create new menu / inventory items",
      },
      {
        key: "editInventoryItem",
        label: "Edit items",
        description: "Change names, prices, and pour sizes",
      },
      {
        key: "deleteInventoryItem",
        label: "Delete items",
        description: "Remove items from inventory",
      },
      {
        key: "addStock",
        label: "Add stock",
        description: "Record new stock purchases",
      },
      {
        key: "manageCategories",
        label: "Manage categories",
        description: "Create, rename, or delete categories",
      },
      {
        key: "viewStockHistory",
        label: "View stock history",
        description: "See stock-added and in-stack logs",
      },
      {
        key: "downloadStockReport",
        label: "Download stock report",
        description: "Export stock report PDF",
      },
    ],
  },
  {
    label: "Tables & Billing",
    description: "Table service and walk-in sales",
    permissions: [
      {
        key: "manageTables",
        label: "Manage tables",
        description: "Create tables, edit names, and run table bills",
      },
      {
        key: "walkInBilling",
        label: "Walk-in billing",
        description: "Quick billing for walk-in customers",
      },
    ],
  },
  {
    label: "Sales & Reports",
    description: "Sales history and daily reports",
    permissions: [
      {
        key: "viewSales",
        label: "View sales",
        description: "See completed bills and sale details",
      },
      {
        key: "downloadSalesReport",
        label: "Download sales report",
        description: "Export daily sales PDF",
      },
    ],
  },
];

export const DEFAULT_MANAGER_PERMISSIONS: ManagerPermissions = {
  viewDashboard: true,
  viewInventory: true,
  addInventoryItem: true,
  editInventoryItem: true,
  deleteInventoryItem: true,
  addStock: true,
  manageCategories: true,
  viewStockHistory: true,
  downloadStockReport: true,
  manageTables: true,
  walkInBilling: true,
  viewSales: true,
  downloadSalesReport: true,
  viewActivity: true,
};

export const ROUTE_PERMISSIONS: Record<string, keyof ManagerPermissions> = {
  "/manager": "viewDashboard",
  "/manager/inventory": "viewInventory",
  "/manager/tables": "manageTables",
  "/manager/billing": "walkInBilling",
  "/manager/sales": "viewSales",
};

export function normalizeManagerPermissions(
  permissions?: Partial<ManagerPermissions> | null
): ManagerPermissions {
  return { ...DEFAULT_MANAGER_PERMISSIONS, ...permissions };
}

export function getUserById(userId: string): User | undefined {
  const users = getItem<User[]>(storageKeys.users) ?? [];
  return users.find((u) => u.id === userId);
}

export function getPermissionsForSession(session: Session | null): ManagerPermissions | null {
  if (!session) return null;
  if (session.role === "super_admin") return null;
  const user = getUserById(session.userId);
  if (!user) return { ...DEFAULT_MANAGER_PERMISSIONS, viewDashboard: false };
  return normalizeManagerPermissions(user.permissions);
}

export function isSuperAdmin(session: Session | null): boolean {
  return session?.role === "super_admin";
}

export function hasPermission(
  session: Session | null,
  permission: keyof ManagerPermissions
): boolean {
  if (!session) return false;
  if (session.role === "super_admin") return true;
  const permissions = getPermissionsForSession(session);
  return permissions?.[permission] ?? false;
}

export function canAccessRoute(session: Session | null, pathname: string): boolean {
  if (!session) return false;
  if (session.role === "super_admin") return true;

  const routeKey = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (!routeKey) return true;
  return hasPermission(session, ROUTE_PERMISSIONS[routeKey]);
}

export function getDefaultManagerRoute(session: Session | null): string {
  if (!session) return "/login";
  if (session.role === "super_admin") return "/admin";

  const order: (keyof typeof ROUTE_PERMISSIONS)[] = [
    "/manager",
    "/manager/billing",
    "/manager/inventory",
    "/manager/tables",
    "/manager/sales",
  ];

  for (const route of order) {
    if (hasPermission(session, ROUTE_PERMISSIONS[route])) {
      return route;
    }
  }

  return "/login";
}

export function countEnabledPermissions(permissions: ManagerPermissions): number {
  return Object.values(permissions).filter(Boolean).length;
}
