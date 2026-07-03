"use client";

import type { ManagerPermissions } from "@/types/auth";
import {
  DEFAULT_MANAGER_PERMISSIONS,
  PERMISSION_GROUPS,
} from "@/lib/permissions";

interface ManagerPermissionsEditorProps {
  permissions: ManagerPermissions;
  onChange: (permissions: ManagerPermissions) => void;
}

export function ManagerPermissionsEditor({
  permissions,
  onChange,
}: ManagerPermissionsEditorProps) {
  function toggle(key: keyof ManagerPermissions) {
    onChange({ ...permissions, [key]: !permissions[key] });
  }

  function setAll(enabled: boolean) {
    const next = { ...DEFAULT_MANAGER_PERMISSIONS };
    for (const key of Object.keys(next) as (keyof ManagerPermissions)[]) {
      next[key] = enabled;
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Access permissions</p>
          <p className="text-xs text-slate-500">
            Choose what this manager can do in the system.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Allow all
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Deny all
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {PERMISSION_GROUPS.map((group) => (
          <div
            key={group.label}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
          >
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-900">{group.label}</p>
              <p className="text-xs text-slate-500">{group.description}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.permissions.map((perm) => (
                <label
                  key={perm.key}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={permissions[perm.key]}
                    onChange={() => toggle(perm.key)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">
                      {perm.label}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {perm.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
