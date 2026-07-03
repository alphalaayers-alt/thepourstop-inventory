"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getManagers, toggleManagerStatus, deleteManager } from "@/lib/auth";
import { countEnabledPermissions, normalizeManagerPermissions } from "@/lib/permissions";
import type { User } from "@/types/auth";
import { confirmAction, showError, showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ManagersTable() {
  const [managers, setManagers] = useState<User[]>([]);

  function loadManagers() {
    setManagers(getManagers());
  }

  useEffect(() => {
    loadManagers();
  }, []);

  function handleToggle(id: string, name: string, isActive: boolean) {
    toggleManagerStatus(id);
    loadManagers();
    showSuccess(
      isActive ? "Manager deactivated" : "Manager activated",
      name
    );
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = await confirmAction({
      title: "Delete manager?",
      text: `Remove "${name}"? This cannot be undone.`,
      confirmText: "Yes, delete",
    });
    if (!confirmed) return;
    deleteManager(id);
    loadManagers();
    showSuccess("Manager deleted", `"${name}" was removed.`);
  }

  if (managers.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900">No managers yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create your first manager account to get started.
          </p>
          <Link href="/admin/managers/new" className="mt-5 inline-block">
            <Button>Create Manager</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="All Managers"
        description={`${managers.length} manager${managers.length !== 1 ? "s" : ""} registered`}
        action={
          <Link href="/admin/managers/new">
            <Button size="sm">+ New Manager</Button>
          </Link>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Permissions</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {managers.map((manager) => (
              <tr key={manager.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {manager.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-900">
                      {manager.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{manager.email}</td>
                <td className="px-6 py-4">
                  <Badge variant={manager.isActive ? "success" : "warning"}>
                    {manager.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {countEnabledPermissions(
                    normalizeManagerPermissions(manager.permissions)
                  )}{" "}
                  enabled
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {formatDate(manager.createdAt)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/managers/${manager.id}/edit`}>
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggle(manager.id, manager.name, manager.isActive)}
                    >
                      {manager.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(manager.id, manager.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
