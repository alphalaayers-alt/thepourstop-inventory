"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MobileTopBar } from "./MobileTopBar";
import { MobileBottomNav, type MobileNavItem } from "./MobileBottomNav";

interface ResponsiveShellProps {
  sidebar: ReactNode | ((props: { onNavigate: () => void }) => ReactNode);
  children: ReactNode;
  bottomNavItems: MobileNavItem[];
  mobileTitle?: string;
  mobileSubtitle?: string;
  accent?: "slate" | "emerald";
  fullHeightMain?: boolean;
  mainClassName?: string;
}

export function ResponsiveShell({
  sidebar,
  children,
  bottomNavItems,
  mobileTitle = "The Pour Stop",
  mobileSubtitle,
  accent = "slate",
  fullHeightMain = false,
  mainClassName = "",
}: ResponsiveShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const resolvedSidebar =
    typeof sidebar === "function"
      ? sidebar({ onNavigate: () => setMenuOpen(false) })
      : sidebar;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50">
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[min(100vw-3rem,18rem)] shrink-0 transform transition-transform duration-200 ease-out lg:relative lg:z-auto lg:w-64 lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {resolvedSidebar}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MobileTopBar
          title={mobileTitle}
          subtitle={mobileSubtitle}
          accent={accent}
          onMenuOpen={() => setMenuOpen(true)}
        />

        <main
          className={`min-h-0 flex-1 ${
            fullHeightMain ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"
          } pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0`}
        >
          <div
            className={`mx-auto w-full max-w-6xl ${
              fullHeightMain
                ? "flex h-full min-h-0 flex-col px-3 py-3 sm:px-4 sm:py-4 lg:px-8 lg:py-6"
                : "px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
            } ${mainClassName}`}
          >
            {children}
          </div>
        </main>

        <MobileBottomNav items={bottomNavItems} accent={accent} />
      </div>
    </div>
  );
}
