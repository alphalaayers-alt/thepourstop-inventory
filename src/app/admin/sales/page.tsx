"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDashboardStats,
  getOrdersForDate,
  getOrdersInLastMonths,
  getTodayOrders,
} from "@/lib/analytics";
import { getCompletedOrders } from "@/lib/orders";
import type { Order } from "@/types/inventory";
import { formatBusinessDayHours } from "@/lib/business-day";
import { formatDateKey, toDateKey } from "@/lib/format";
import { SalesHistory } from "@/components/sales/SalesHistory";
import { SalesRangeFilter, type SalesRange } from "@/components/sales/SalesRangeFilter";
import { TodayItemsSoldCard } from "@/components/sales/TodayItemsSoldCard";
import { StatCard } from "@/components/ui/StatCard";

export default function AdminSalesPage() {
  const [range, setRange] = useState<SalesRange>("today");
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [threeMonthOrders, setThreeMonthOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState(getDashboardStats());

  function refresh() {
    setAllOrders(getCompletedOrders());
    setTodayOrders(getTodayOrders());
    setThreeMonthOrders(getOrdersInLastMonths(3));
    setStats(getDashboardStats());
  }

  useEffect(() => {
    refresh();
  }, []);

  const dateOrders = useMemo(
    () => getOrdersForDate(selectedDate),
    [selectedDate, allOrders]
  );

  const displayedOrders = useMemo(() => {
    if (range === "today") return todayOrders;
    if (range === "3months") return threeMonthOrders;
    if (range === "all") return allOrders;
    return dateOrders;
  }, [range, todayOrders, threeMonthOrders, dateOrders, allOrders]);

  const listMeta = useMemo(() => {
    const count = displayedOrders.length;
    const billLabel = `${count} bill${count !== 1 ? "s" : ""}`;

    if (range === "today") {
      return {
        title: "Current Shift Sales",
        description: `${billLabel} · ${formatBusinessDayHours()}`,
        emptyMessage: "No sales in the current shift yet",
      };
    }
    if (range === "3months") {
      return {
        title: "Last 3 Months",
        description: `${billLabel} in the last 3 months`,
        emptyMessage: "No sales in the last 3 months",
      };
    }
    if (range === "all") {
      return {
        title: "All Sales",
        description: `${billLabel} since the system started`,
        emptyMessage: "No sales recorded yet",
      };
    }
    return {
      title: `Sales · ${formatDateKey(selectedDate)}`,
      description: `${billLabel} completed on this date`,
      emptyMessage: `No sales on ${formatDateKey(selectedDate)}`,
    };
  }, [range, displayedOrders.length, selectedDate]);

  const totalRevenue = allOrders.reduce((s, o) => s + o.total, 0);
  const tableSales = allOrders.filter((o) => o.type === "table").reduce((s, o) => s + o.total, 0);
  const walkInSales = allOrders.filter((o) => o.type === "walk_in").reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">All Sales</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete sales history, daily reports, and full admin control.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Sales" value={stats.todaySales} accent="green" />
        <StatCard label="Total Revenue (All Time)" value={totalRevenue} accent="green" />
        <StatCard label="Table Sales" value={tableSales} />
        <StatCard label="Walk-in Sales" value={walkInSales} />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Today's Bills" value={String(stats.todayOrders)} accent="blue" />
        <TodayItemsSoldCard orders={todayOrders} />
        <StatCard label="All Completed Bills" value={String(allOrders.length)} />
      </div>

      <SalesHistory
        orders={displayedOrders}
        title={listMeta.title}
        description={listMeta.description}
        emptyMessage={listMeta.emptyMessage}
        allowDelete
        onOrdersChange={refresh}
        headerAction={
          <SalesRangeFilter
            range={range}
            selectedDate={selectedDate}
            onRangeChange={setRange}
            onDateChange={setSelectedDate}
            showAllTime
            showDownload
            downloadLabel="Download shift report"
          />
        }
      />
    </div>
  );
}
