import type {
  CreateManagerInput,
  Session,
  UpdateManagerInput,
  User,
} from "@/types/auth";
import { getItem, setItem, removeItem, storageKeys } from "./storage";
import { useCloudDatabase } from "./data-backend";
import { DEFAULT_MANAGER_PERMISSIONS, normalizeManagerPermissions } from "./permissions";

const DEFAULT_SUPER_ADMIN: Omit<User, "id" | "createdAt"> = {
  name: "Super Admin",
  email: "admin@pourstop.com",
  password: "admin123",
  role: "super_admin",
  isActive: true,
};

function createDefaultSuperAdmin(): User {
  return {
    ...DEFAULT_SUPER_ADMIN,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
}

function ensureSuperAdminAccount(users: User[]): User[] {
  if (users.some((u) => u.role === "super_admin")) {
    return users;
  }
  return [createDefaultSuperAdmin(), ...users];
}

export function initializeUsers(): User[] {
  if (useCloudDatabase()) {
    return getItem<User[]>(storageKeys.users) ?? [];
  }

  const existing = getItem<User[]>(storageKeys.users);
  if (!existing || existing.length === 0) {
    const users = [createDefaultSuperAdmin()];
    saveUsers(users);
    return users;
  }

  const withSuperAdmin = ensureSuperAdminAccount(existing);
  if (withSuperAdmin.length !== existing.length) {
    saveUsers(withSuperAdmin);
  }
  return withSuperAdmin;
}

function generateId(): string {
  return crypto.randomUUID();
}

export function getUsers(): User[] {
  if (useCloudDatabase()) {
    return getItem<User[]>(storageKeys.users) ?? [];
  }

  const users = getItem<User[]>(storageKeys.users);
  if (!users || users.length === 0) {
    return initializeUsers();
  }
  const withSuperAdmin = ensureSuperAdminAccount(users);
  if (withSuperAdmin.length !== users.length) {
    saveUsers(withSuperAdmin);
  }
  return withSuperAdmin;
}

export function saveUsers(users: User[]): void {
  setItem(storageKeys.users, users);
}

export function getSession(): Session | null {
  return getItem<Session>(storageKeys.session);
}

/** Drop invalid sessions and keep role/email in sync with stored users. */
export function repairSession(): Session | null {
  const session = getSession();
  if (!session) return null;

  const user = getUsers().find((u) => u.id === session.userId);
  if (!user || !user.isActive) {
    clearSession();
    return null;
  }

  if (
    session.role !== user.role ||
    session.email !== user.email ||
    session.name !== user.name
  ) {
    const repaired: Session = {
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    };
    setSession(repaired);
    return repaired;
  }

  return session;
}

export function setSession(session: Session): void {
  setItem(storageKeys.session, session);
}

export function clearSession(): void {
  removeItem(storageKeys.session);
}

export function login(
  email: string,
  password: string
): { success: true; session: Session } | { success: false; error: string } {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase().trim()
  );

  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  if (!user.isActive) {
    return { success: false, error: "This account has been deactivated." };
  }

  if (user.password !== password) {
    return { success: false, error: "Invalid email or password." };
  }

  const session: Session = {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  };

  setSession(session);
  return { success: true, session };
}

export function logout(): void {
  clearSession();
}

export function getUserById(userId: string): User | undefined {
  return getUsers().find((u) => u.id === userId);
}

export function getManagerById(managerId: string): User | undefined {
  const user = getUserById(managerId);
  return user?.role === "manager" ? user : undefined;
}

export function createManager(
  input: CreateManagerInput
): { success: true; user: User } | { success: false; error: string } {
  const users = getUsers();
  const email = input.email.toLowerCase().trim();

  if (!input.name.trim()) {
    return { success: false, error: "Name is required." };
  }

  if (!email) {
    return { success: false, error: "Email is required." };
  }

  if (input.password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  if (users.some((u) => u.email.toLowerCase() === email)) {
    return { success: false, error: "A user with this email already exists." };
  }

  const manager: User = {
    id: generateId(),
    name: input.name.trim(),
    email,
    password: input.password,
    role: "manager",
    createdAt: new Date().toISOString(),
    isActive: true,
    permissions: normalizeManagerPermissions(input.permissions),
  };

  saveUsers([...users, manager]);
  return { success: true, user: manager };
}

export function updateManager(
  managerId: string,
  input: UpdateManagerInput
): { success: true; user: User } | { success: false; error: string } {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === managerId && u.role === "manager");

  if (index === -1) {
    return { success: false, error: "Manager not found." };
  }

  const current = users[index];
  const email = input.email?.toLowerCase().trim();

  if (input.name !== undefined && !input.name.trim()) {
    return { success: false, error: "Name is required." };
  }

  if (email !== undefined && !email) {
    return { success: false, error: "Email is required." };
  }

  if (email && users.some((u) => u.id !== managerId && u.email.toLowerCase() === email)) {
    return { success: false, error: "A user with this email already exists." };
  }

  if (input.password !== undefined && input.password.length > 0 && input.password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  const updated: User = {
    ...current,
    name: input.name?.trim() ?? current.name,
    email: email ?? current.email,
    password:
      input.password && input.password.length > 0 ? input.password : current.password,
    isActive: input.isActive ?? current.isActive,
    permissions: input.permissions
      ? normalizeManagerPermissions({
          ...current.permissions,
          ...input.permissions,
        })
      : normalizeManagerPermissions(current.permissions),
  };

  users[index] = updated;
  saveUsers(users);
  return { success: true, user: updated };
}

export function getManagers(): User[] {
  return getUsers().filter((u) => u.role === "manager");
}

export function toggleManagerStatus(
  managerId: string
): { success: true } | { success: false; error: string } {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === managerId && u.role === "manager");

  if (index === -1) {
    return { success: false, error: "Manager not found." };
  }

  users[index] = { ...users[index], isActive: !users[index].isActive };
  saveUsers(users);
  return { success: true };
}

export function deleteManager(
  managerId: string
): { success: true } | { success: false; error: string } {
  const users = getUsers();
  const manager = users.find((u) => u.id === managerId && u.role === "manager");

  if (!manager) {
    return { success: false, error: "Manager not found." };
  }

  saveUsers(users.filter((u) => u.id !== managerId));
  return { success: true };
}
