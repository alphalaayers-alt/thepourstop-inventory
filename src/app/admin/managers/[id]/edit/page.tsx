"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getManagerById } from "@/lib/auth";
import type { User } from "@/types/auth";
import { EditManagerForm } from "@/components/managers/EditManagerForm";

export default function EditManagerPage() {
  const params = useParams<{ id: string }>();
  const [manager, setManager] = useState<User | null>(null);

  useEffect(() => {
    if (params.id) {
      setManager(getManagerById(params.id) ?? null);
    }
  }, [params.id]);

  if (!manager) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">
        {params.id ? "Manager not found." : "Loading..."}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/managers"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          ← Back to managers
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Manager</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update account details and control what {manager.name} can access.
        </p>
      </div>
      <EditManagerForm manager={manager} />
    </div>
  );
}
