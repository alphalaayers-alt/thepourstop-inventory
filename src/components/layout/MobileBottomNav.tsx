"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface MobileNavItem {
  label: string;
  href: string;
  icon: ReactNode;
  match?: (pathname: string, href: string) => boolean;
}

interface MobileBottomNavProps {
  items: MobileNavItem[];
  accent?: "slate" | "emerald";
}

export function MobileBottomNav({ items, accent = "slate" }: MobileBottomNavProps) {
  const pathname = usePathname();
  const activeClass =
    accent === "emerald"
      ? "text-emerald-700"
      : "text-slate-900";
  const activeBg =
    accent === "emerald"
      ? "bg-emerald-50"
      : "bg-slate-100";

  if (items.length === 0) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-white/90 lg:hidden"
      aria-label="Main navigation"
    >
      <div
        className="grid h-16"
        style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const isActive = item.match
            ? item.match(pathname, item.href)
            : item.href === pathname ||
              (item.href !== "/admin" &&
                item.href !== "/manager" &&
                pathname.startsWith(item.href)) ||
              (item.href === "/admin" && pathname === "/admin") ||
              (item.href === "/manager" && pathname === "/manager");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors ${
                isActive ? activeClass : "text-slate-500"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isActive ? activeBg : ""
                }`}
              >
                {item.icon}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
