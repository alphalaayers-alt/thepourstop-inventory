import type { CreateManagerInput, UpdateManagerInput } from "@/types/auth";
import { refreshCloudData } from "./refresh";

export async function createManagerCloud(
  input: CreateManagerInput
): Promise<{ success: true } | { success: false; error: string }> {
  const res = await fetch("/api/admin/managers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error ?? "Could not create manager." };
  }
  await refreshCloudData();
  return { success: true };
}

export async function updateManagerCloud(
  managerId: string,
  input: UpdateManagerInput
): Promise<{ success: true } | { success: false; error: string }> {
  const res = await fetch("/api/admin/managers", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ managerId, ...input }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error ?? "Could not update manager." };
  }
  await refreshCloudData();
  return { success: true };
}

export async function toggleManagerStatusCloud(
  managerId: string,
  isActive: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  return updateManagerCloud(managerId, { isActive: !isActive });
}

export async function deleteManagerCloud(
  managerId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const res = await fetch(`/api/admin/managers?id=${encodeURIComponent(managerId)}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error ?? "Could not delete manager." };
  }
  await refreshCloudData();
  return { success: true };
}
