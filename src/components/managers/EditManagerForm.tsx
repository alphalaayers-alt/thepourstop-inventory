"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateManager } from "@/lib/auth";
import { normalizeManagerPermissions } from "@/lib/permissions";
import type { ManagerPermissions, User } from "@/types/auth";
import { showError, showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { ManagerPermissionsEditor } from "./ManagerPermissionsEditor";

interface EditManagerFormProps {
  manager: User;
}

export function EditManagerForm({ manager }: EditManagerFormProps) {
  const router = useRouter();
  const [name, setName] = useState(manager.name);
  const [email, setEmail] = useState(manager.email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [permissions, setPermissions] = useState<ManagerPermissions>(
    normalizeManagerPermissions(manager.permissions)
  );
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password && password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    const result = updateManager(manager.id, {
      name,
      email,
      password: password || undefined,
      permissions,
    });

    if (result.success) {
      showSuccess("Manager updated", `${name.trim()}'s account was saved.`);
      router.push("/admin/managers");
    } else {
      showError("Could not update manager", result.error);
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="max-w-3xl">
        <CardContent>
          <div className="space-y-5">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Leave blank to keep current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardContent>
          <ManagerPermissionsEditor
            permissions={permissions}
            onChange={setPermissions}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" isLoading={isLoading}>
          Save Changes
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/admin/managers")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
