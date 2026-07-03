"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SupabaseHealthResult } from "@/lib/supabase/health";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function SetupPage() {
  const [health, setHealth] = useState<SupabaseHealthResult | null>(null);
  const [loading, setLoading] = useState(true);

  async function runCheck() {
    setLoading(true);
    try {
      const res = await fetch("/api/supabase/health");
      const data = (await res.json()) as SupabaseHealthResult;
      setHealth(data);
    } catch {
      setHealth({
        configured: false,
        connected: false,
        tables: {},
        categoryCount: null,
        profileCount: null,
        usingServiceRole: false,
        error: "Could not reach health check API.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Supabase Setup Check</h1>
          <p className="mt-2 text-sm text-slate-500">
            Use this page to verify your database connection before going live.
          </p>
        </div>

        <Card>
          <CardHeader
            title="Connection status"
            action={
              <Button size="sm" variant="secondary" onClick={runCheck} isLoading={loading}>
                Re-check
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {!health && loading ? (
              <p className="text-sm text-slate-500">Checking...</p>
            ) : health ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={health.configured ? "success" : "warning"}>
                    Env vars {health.configured ? "OK" : "Missing"}
                  </Badge>
                  <Badge variant={health.connected ? "success" : "warning"}>
                    Database {health.connected ? "Connected" : "Not ready"}
                  </Badge>
                </div>

                {health.error && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {health.error}
                  </p>
                )}

                {health.categoryCount != null && (
                  <p className="text-sm text-slate-600">
                    Categories in database: <strong>{health.categoryCount}</strong>
                  </p>
                )}
                {health.profileCount != null && (
                  <p className="text-sm text-slate-600">
                    User profiles: <strong>{health.profileCount}</strong>
                    {health.profileCount === 0 && (
                      <span className="text-amber-700">
                        {" "}
                        — create super admin in Supabase Auth, then run seed-super-admin.sql
                      </span>
                    )}
                  </p>
                )}

                {Object.keys(health.tables).length > 0 && (
                  <div className="rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
                          <th className="px-3 py-2">Table</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(health.tables).map(([table, ok]) => (
                          <tr key={table} className="border-b border-slate-50">
                            <td className="px-3 py-2 font-mono text-xs">{table}</td>
                            <td className="px-3 py-2">
                              <Badge variant={ok ? "success" : "warning"}>
                                {ok ? "OK" : "Missing"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Next steps</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Create a Supabase project at supabase.com</li>
              <li>Copy API keys → create <code className="text-xs">.env.local</code></li>
              <li>Run <code className="text-xs">supabase/schema.sql</code> in SQL Editor</li>
              <li>Create super admin user in Authentication</li>
              <li>Run <code className="text-xs">supabase/seed-super-admin.sql</code></li>
              <li>Refresh this page — all tables should show OK</li>
            </ol>
            <p>
              Full guide: open <code className="text-xs">SUPABASE_SETUP.md</code> in the project
              folder.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-3">
          <Link href="/login">
            <Button variant="secondary">Go to Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
