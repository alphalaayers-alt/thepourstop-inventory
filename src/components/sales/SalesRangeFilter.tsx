"use client";

import { formatBusinessDayHours } from "@/lib/business-day";
import { toDateKey } from "@/lib/format";
import { downloadTodaySalesReportPdf } from "@/lib/daily-sales-report";
import { showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/Button";

export type SalesRange = "today" | "3months" | "date" | "all";

interface SalesRangeFilterProps {
  range: SalesRange;
  selectedDate: string;
  onRangeChange: (range: SalesRange) => void;
  onDateChange: (dateKey: string) => void;
  managerName?: string;
  showDownload?: boolean;
  showAllTime?: boolean;
  downloadLabel?: string;
}

export function SalesRangeFilter({
  range,
  selectedDate,
  onRangeChange,
  onDateChange,
  managerName,
  showDownload = true,
  showAllTime = false,
  downloadLabel = "Download shift report",
}: SalesRangeFilterProps) {
  const todayKey = toDateKey(new Date());
  const shiftHours = formatBusinessDayHours();

  function handleDownloadReport() {
    downloadTodaySalesReportPdf(managerName);
    showSuccess("Report downloaded", `Shift report (${shiftHours}) is ready.`);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {showDownload && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleDownloadReport}
        >
          {downloadLabel}
        </Button>
      )}

      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        <Button
          type="button"
          size="sm"
          variant={range === "today" ? "primary" : "ghost"}
          className={range === "today" ? "" : "bg-transparent shadow-none"}
          onClick={() => onRangeChange("today")}
        >
          Today
        </Button>
        <Button
          type="button"
          size="sm"
          variant={range === "3months" ? "primary" : "ghost"}
          className={range === "3months" ? "" : "bg-transparent shadow-none"}
          onClick={() => onRangeChange("3months")}
        >
          Last 3 months
        </Button>
        {showAllTime && (
          <Button
            type="button"
            size="sm"
            variant={range === "all" ? "primary" : "ghost"}
            className={range === "all" ? "" : "bg-transparent shadow-none"}
            onClick={() => onRangeChange("all")}
          >
            All time
          </Button>
        )}
      </div>

      <label
        className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm transition-colors ${
          range === "date"
            ? "border-slate-900 ring-2 ring-slate-200"
            : "border-slate-200"
        }`}
      >
        <span className="hidden text-slate-500 sm:inline">Pick date</span>
        <input
          type="date"
          value={selectedDate}
          max={todayKey}
          onChange={(e) => {
            if (!e.target.value) return;
            onDateChange(e.target.value);
            onRangeChange("date");
          }}
          className="cursor-pointer border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
          aria-label="Select date"
        />
      </label>
    </div>
  );
}
