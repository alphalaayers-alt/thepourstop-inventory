"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { initializeTables } from "@/lib/tables";
import { AdminSidebar } from "./AdminSidebar";
import { ResponsiveShell } from "./ResponsiveShell";
import { adminNavItems } from "./admin-nav";

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    initializeTables();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if (session.role === "manager") {
      router.replace("/manager");
      return;
    }

    if (session.role !== "super_admin") {
      router.replace("/login");
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  if (!session || session.role !== "super_admin") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <ResponsiveShell
      mobileTitle="The Pour Stop"
      mobileSubtitle="Super Admin"
      accent="slate"
      bottomNavItems={adminNavItems}
      sidebar={({ onNavigate }) => <AdminSidebar onNavigate={onNavigate} />}
    >
      {children}
    </ResponsiveShell>
  );
}
