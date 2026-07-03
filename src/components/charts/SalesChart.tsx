"use client";

import { formatMoney } from "@/lib/format";
import type { DailySales } from "@/types/inventory";

interface SalesChartProps {
  data: DailySales[];
  title?: string;
}

export function SalesChart({ data, title = "Sales" }: SalesChartProps) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="flex h-48 items-end gap-2">
        {data.map((day) => {
          const height = (day.total / maxTotal) * 100;
          const label = new Date(day.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          });

          return (
            <div
              key={day.date}
              className="group flex flex-1 flex-col items-center gap-2"
            >
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-slate-900 transition-all group-hover:bg-slate-700"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${label}: ${formatMoney(day.total)}`}
                />
              </div>
              <span className="text-[10px] text-slate-400">{label}</span>
            </div>
          );
        })}
      </div>
      {data.every((d) => d.total === 0) && (
        <p className="mt-4 text-center text-sm text-slate-400">No sales data yet</p>
      )}
    </div>
  );
}
