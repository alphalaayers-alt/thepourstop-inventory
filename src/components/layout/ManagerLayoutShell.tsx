"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { initializeTables } from "@/lib/tables";
import { ManagerSidebar } from "./ManagerSidebar";

export function ManagerLayoutShell({ children }: { children: React.ReactNode }) {
  const { session, isLoading, canAccessRoute, getDefaultManagerRoute } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isFullHeightPage = pathname === "/manager/billing";

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />
      </div>
    );
  }

  if (!session || session.role !== "manager" || !canAccessRoute(pathname)) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <ManagerSidebar />
      <main
        className={`min-h-0 flex-1 ${isFullHeightPage ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        <div
          className={`mx-auto flex w-full max-w-[1400px] flex-col ${
            isFullHeightPage ? "h-full min-h-0 px-4 py-3 sm:px-6 sm:py-4" : "px-8 py-8"
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
