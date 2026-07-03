"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { initializeTables } from "@/lib/tables";
import { getManagerBottomNavItems, ManagerSidebar } from "./ManagerSidebar";
import { ResponsiveShell } from "./ResponsiveShell";

export function ManagerLayoutShell({ children }: { children: React.ReactNode }) {
  const { session, isLoading, canAccessRoute, getDefaultManagerRoute, hasPermission } =
    useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isFullHeightPage = pathname === "/manager/billing";

  const bottomNavItems = useMemo(
    () => getManagerBottomNavItems(hasPermission),
    [hasPermission]
  );

  useEffect(() => {
    initializeTables();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.replace("/login");
      } else if (session.role !== "manager") {
        router.replace("/login");
      } else if (!canAccessRoute(pathname)) {
        router.replace(getDefaultManagerRoute());
      }
    }
  }, [session, isLoading, router, pathname, canAccessRoute, getDefaultManagerRoute]);

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />
      </div>
    );
  }

  if (!session || session.role !== "manager" || !canAccessRoute(pathname)) return null;

  return (
    <ResponsiveShell
      mobileTitle="The Pour Stop"
      mobileSubtitle="Manager"
      accent="emerald"
      fullHeightMain={isFullHeightPage}
      mainClassName={isFullHeightPage ? "max-w-[1400px]" : ""}
      bottomNavItems={bottomNavItems}
      sidebar={({ onNavigate }) => <ManagerSidebar onNavigate={onNavigate} />}
    >
      {children}
    </ResponsiveShell>
  );
}
