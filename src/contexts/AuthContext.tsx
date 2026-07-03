"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ManagerPermissions, Session } from "@/types/auth";
import {
  getSession,
  initializeUsers,
  login as authLogin,
  logout as authLogout,
  repairSession,
} from "@/lib/auth";
import { cloudLogin, cloudLogout, cloudRestoreSession } from "@/lib/cloud/auth";
import { useCloudDatabase } from "@/lib/data-backend";
import { initializeAppData } from "@/lib/catalog";
import { initializeTables } from "@/lib/tables";
import {
  canAccessRoute,
  getDefaultManagerRoute,
  getPermissionsForSession,
  hasPermission,
  isSuperAdmin,
} from "@/lib/permissions";

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  isCloudMode: boolean;
  permissions: ManagerPermissions | null;
  isSuperAdmin: boolean;
  hasPermission: (permission: keyof ManagerPermissions) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  getDefaultManagerRoute: () => string;
  login: (
    email: string,
    password: string
  ) => Promise<
    | { success: true; role: Session["role"] }
    | { success: false; error: string }
  >;
  logout: () => void;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isCloudMode = useCloudDatabase();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (isCloudMode) {
          const restored = await cloudRestoreSession();
          if (!cancelled) {
            setSession(restored);
            if (restored) {
              initializeTables();
            }
          }
        } else {
          initializeUsers();
          initializeAppData();
          initializeTables();
          if (!cancelled) {
            setSession(repairSession());
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [isCloudMode]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (isCloudMode) {
        const result = await cloudLogin(email, password);
        if (result.success) {
          initializeTables();
          setSession(result.session);
          return { success: true as const, role: result.session.role };
        }
        return { success: false as const, error: result.error };
      }

      const result = authLogin(email, password);
      if (result.success) {
        setSession(result.session);
        return { success: true as const, role: result.session.role };
      }
      return { success: false as const, error: result.error };
    },
    [isCloudMode]
  );

  const logout = useCallback(() => {
    if (isCloudMode) {
      void cloudLogout();
    } else {
      authLogout();
    }
    setSession(null);
  }, [isCloudMode]);

  const refreshSession = useCallback(() => {
    if (isCloudMode) {
      void cloudRestoreSession().then(setSession);
    } else {
      setSession(getSession());
    }
  }, [isCloudMode]);

  const permissions = getPermissionsForSession(session);
  const superAdmin = isSuperAdmin(session);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isCloudMode,
        permissions,
        isSuperAdmin: superAdmin,
        hasPermission: (permission) => hasPermission(session, permission),
        canAccessRoute: (pathname) => canAccessRoute(session, pathname),
        getDefaultManagerRoute: () => getDefaultManagerRoute(session),
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
