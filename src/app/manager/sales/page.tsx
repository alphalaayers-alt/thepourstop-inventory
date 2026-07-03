"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDashboardStats,
  getOrdersForDate,
  getOrdersInLastMonths,
  getTodayOrders,
} from "@/lib/analytics";
import type { Order } from "@/types/inventory";
import { formatBusinessDayHours } from "@/lib/business-day";
import { formatDateKey, toDateKey } from "@/lib/format";
import { SalesHistory } from "@/components/sales/SalesHistory";
import { SalesRangeFilter, type SalesRange } from "@/components/sales/SalesRangeFilter";
import { TodayItemsSoldCard } from "@/components/sales/TodayItemsSoldCard";
import { StatCard } from "@/components/ui/StatCard";

export default function ManagerSalesPage() {
  const { session, hasPermission } = useAuth();
  const [range, setRange] = useState<SalesRange>("today");
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [threeMonthOrders, setThreeMonthOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState(getDashboardStats());

  function refresh() {
    setTodayOrders(getTodayOrders());
    setThreeMonthOrders(getOrdersInLastMonths(3));
    setStats(getDashboardStats());
  }

  useEffect(() => {
    refresh();
  }, []);

  const dateOrders = useMemo(
    () => getOrdersForDate(selectedDate),
    [selectedDate]
  );

  const displayedOrders = useMemo(() => {
    if (range === "today") return todayOrders;
    if (range === "3months") return threeMonthOrders;
    return dateOrders;
  }, [range, todayOrders, threeMonthOrders, dateOrders]);

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
    return {
      title: `Sales · ${formatDateKey(selectedDate)}`,
      description: `${billLabel} completed on this date`,
      emptyMessage: `No sales on ${formatDateKey(selectedDate)}`,
    };
  }, [range, displayedOrders.length, selectedDate]);

  return (
    <div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Today's Sales" value={stats.todaySales} accent="green" />
        <StatCard
          label="Today's Bills"
          value={String(stats.todayOrders)}
          accent="blue"
        />
        <TodayItemsSoldCard orders={todayOrders} />
      </div>

      <SalesHistory
        orders={displayedOrders}
        title={listMeta.title}
        description={listMeta.description}
        emptyMessage={listMeta.emptyMessage}
        headerAction={
          <SalesRangeFilter
            range={range}
            selectedDate={selectedDate}
            onRangeChange={setRange}
            onDateChange={setSelectedDate}
            managerName={session?.name}
            showDownload={hasPermission("downloadSalesReport")}
          />
        }
      />
    </div>
  );
}
