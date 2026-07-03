"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getManagers } from "@/lib/auth";
import {
  getDashboardStats,
  getDailySalesForDays,
  getSalesByCategory,
  getTopSellingItems,
  getTodayOrders,
} from "@/lib/analytics";
import { getCompletedOrders } from "@/lib/orders";
import { formatMoney, categoryLabel } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { SalesChart } from "@/components/charts/SalesChart";
import { SalesHistory } from "@/components/sales/SalesHistory";
import { ActivityHistory } from "@/components/sales/ActivityHistory";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(getDashboardStats());
  const [chartData, setChartData] = useState(getDailySalesForDays(14));
  const [managerCount, setManagerCount] = useState(0);

  useEffect(() => {
    setStats(getDashboardStats());
    setChartData(getDailySalesForDays(14));
    setManagerCount(getManagers().length);
  }, []);

  const allOrders = getCompletedOrders();
  const todayOrders = getTodayOrders();
  const categorySales = getSalesByCategory(allOrders);
  const topItems = getTopSellingItems(allOrders);
  const totalRevenue = allOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete business overview — sales, stock & all-time data
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Sales" value={stats.todaySales} accent="green" />
        <StatCard label="Today's Bills" value={String(stats.todayOrders)} />
        <StatCard label="Total Revenue (All Time)" value={totalRevenue} accent="green" />
        <StatCard label="Stock Items" value={String(stats.totalStockItems)} accent="blue" />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Today's Customers" value={String(stats.todayCustomers)} />
        <StatCard
          label="Low Stock Alerts"
          value={String(stats.lowStockCount)}
          accent={stats.lowStockCount > 0 ? "amber" : "default"}
        />
        <StatCard label="Managers" value={String(managerCount)} />
      </div>

      <div className="mb-8">
        <SalesChart data={chartData} title="Sales — Last 14 Days" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Sales by Category</h3>
            {Object.keys(categorySales).length === 0 ? (
              <p className="text-sm text-slate-400">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(categorySales).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{categoryLabel(cat)}</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatMoney(amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Top Selling Items</h3>
            {topItems.length === 0 ? (
              <p className="text-sm text-slate-400">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {topItems.map((item, i) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      {i + 1}. {item.name} ({item.quantity} sold)
                    </span>
                    <span className="text-sm font-semibold text-emerald-700">
                      {formatMoney(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Live Bill Activity</h2>
        <ActivityHistory limit={25} />
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Sales</h2>
          <Link href="/admin/sales">
            <Button variant="secondary" size="sm">View All Sales</Button>
          </Link>
        </div>
        <SalesHistory orders={todayOrders} title="Today's Bills" limit={10} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/inventory">
          <Button variant="secondary">View Full Inventory</Button>
        </Link>
        <Link href="/admin/managers">
          <Button variant="secondary">Manage Managers</Button>
        </Link>
      </div>
    </div>
  );
}
