"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createManager } from "@/lib/auth";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/lib/permissions";
import type { ManagerPermissions } from "@/types/auth";
import { showError, showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { ManagerPermissionsEditor } from "./ManagerPermissionsEditor";

export function CreateManagerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [permissions, setPermissions] = useState<ManagerPermissions>({
    ...DEFAULT_MANAGER_PERMISSIONS,
  });
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    const result = createManager({ name, email, password, permissions });

    if (result.success) {
      showSuccess("Manager created", `${name.trim()} can now sign in.`);
      router.push("/admin/managers");
    } else {
      showError("Could not create manager", result.error);
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
              placeholder="John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="manager@pourstop.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
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
          Create Manager
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
