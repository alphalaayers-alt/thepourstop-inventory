"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getDashboardStats,
  getDailySalesForDays,
  getMonthlySales,
  getOrdersInLastMonths,
  getTodayOrders,
} from "@/lib/analytics";
import { formatMoney } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { SalesChart } from "@/components/charts/SalesChart";
import { SalesHistory } from "@/components/sales/SalesHistory";
import { Button } from "@/components/ui/Button";
import { ActivityHistory } from "@/components/sales/ActivityHistory";
import { useAuth } from "@/contexts/AuthContext";

export default function ManagerDashboardPage() {
  const { hasPermission } = useAuth();
  const [stats, setStats] = useState(getDashboardStats());
  const [weekSales, setWeekSales] = useState(getDailySalesForDays(7));
  const [monthlySales, setMonthlySales] = useState(getMonthlySales(3));
  const [todayOrders, setTodayOrders] = useState(getTodayOrders());

  useEffect(() => {
    setStats(getDashboardStats());
    setWeekSales(getDailySalesForDays(7));
    setMonthlySales(getMonthlySales(3));
    setTodayOrders(getTodayOrders());
  }, []);

  const threeMonthTotal = getOrdersInLastMonths(3).reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Manager Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Today&apos;s overview — sales, stock & customers
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission("walkInBilling") && (
            <Link href="/manager/billing">
              <Button>+ Quick Billing</Button>
            </Link>
          )}
          {hasPermission("addStock") && (
            <Link href="/manager/inventory">
              <Button variant="secondary">+ Add Stock</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Sales" value={stats.todaySales} accent="green" />
        <StatCard label="Today's Bills" value={String(stats.todayOrders)} accent="default" />
        <StatCard label="Today's Customers" value={String(stats.todayCustomers)} accent="blue" />
        <StatCard
          label="Low Stock Items"
          value={String(stats.lowStockCount)}
          accent={stats.lowStockCount > 0 ? "amber" : "default"}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <SalesChart data={weekSales} title="Last 7 Days Sales" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Last 3 Months</h3>
          <p className="text-3xl font-bold text-emerald-700">{formatMoney(threeMonthTotal)}</p>
          <p className="mt-1 text-sm text-slate-500">Total revenue</p>
          <div className="mt-6 space-y-3">
            {monthlySales.map((m) => (
              <div key={m.month} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {new Date(m.month + "-01").toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="font-medium text-slate-900">
                  {formatMoney(m.total)} ({m.orders} bills)
                </span>
              </div>
            ))}
            {monthlySales.length === 0 && (
              <p className="text-sm text-slate-400">No sales in the last 3 months</p>
            )}
          </div>
        </div>
      </div>

      {hasPermission("viewActivity") && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Bill Activity</h2>
          <ActivityHistory limit={20} />
        </div>
      )}

      {hasPermission("viewSales") && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Today&apos;s Sales</h2>
          <SalesHistory orders={todayOrders} title="Today's Bills" />
        </div>
      )}
    </div>
  );
}
