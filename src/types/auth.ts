export type UserRole = "super_admin" | "manager";

export interface ManagerPermissions {
  viewDashboard: boolean;
  viewInventory: boolean;
  addInventoryItem: boolean;
  editInventoryItem: boolean;
  deleteInventoryItem: boolean;
  addStock: boolean;
  manageCategories: boolean;
  viewStockHistory: boolean;
  downloadStockReport: boolean;
  manageTables: boolean;
  walkInBilling: boolean;
  viewSales: boolean;
  downloadSalesReport: boolean;
  viewActivity: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
  isActive: boolean;
  permissions?: ManagerPermissions;
}

export interface Session {
  userId: string;
  role: UserRole;
  email: string;
  name: string;
}

export interface CreateManagerInput {
  name: string;
  email: string;
  password: string;
  permissions?: Partial<ManagerPermissions>;
}

export interface UpdateManagerInput {
  name?: string;
  email?: string;
  password?: string;
  permissions?: Partial<ManagerPermissions>;
  isActive?: boolean;
}
