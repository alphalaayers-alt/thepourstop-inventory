import { formatMoney } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: "default" | "green" | "amber" | "blue";
}

const accents = {
  default: "text-slate-900",
  green: "text-emerald-600",
  amber: "text-amber-600",
  blue: "text-blue-600",
};

export function StatCard({ label, value, subtext, accent = "default" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
      <p className={`mt-1.5 text-xl font-semibold sm:mt-2 sm:text-2xl ${accents[accent]}`}>
        {typeof value === "number" ? formatMoney(value) : value}
      </p>
      {subtext && <p className="mt-1 text-xs text-slate-400">{subtext}</p>}
    </div>
  );
}
