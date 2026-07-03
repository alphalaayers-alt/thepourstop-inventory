"use client";

interface MobileTopBarProps {
  title: string;
  subtitle?: string;
  accent?: "slate" | "emerald";
  onMenuOpen: () => void;
}

export function MobileTopBar({
  title,
  subtitle,
  accent = "slate",
  onMenuOpen,
}: MobileTopBarProps) {
  const badgeClass =
    accent === "emerald"
      ? "bg-emerald-700"
      : "bg-slate-900";

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex min-h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),0px)] backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden">
      <button
        type="button"
        onClick={onMenuOpen}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
        aria-label="Open menu"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${badgeClass}`}>
        PS
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
