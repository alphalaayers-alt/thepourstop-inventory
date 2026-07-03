import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { normalizeManagerPermissions } from "@/lib/permissions";
import type { CreateManagerInput, UpdateManagerInput } from "@/types/auth";

function getServiceClient() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireSuperAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin" || !profile.is_active) {
    return null;
  }

  return user;
}

export async function POST(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as CreateManagerInput;
  const name = body.name?.trim();
  const email = body.email?.toLowerCase().trim();
  const password = body.password;

  if (!name || !email || !password || password.length < 6) {
    return NextResponse.json({ error: "Invalid manager details." }, { status: 400 });
  }

  try {
    const service = getServiceClient();
    const { data: created, error: authError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "manager" },
    });

    if (authError || !created.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Could not create auth user." },
        { status: 400 }
      );
    }

    const permissions = normalizeManagerPermissions(body.permissions);
    const { error: profileError } = await service.from("profiles").upsert({
      id: created.user.id,
      name,
      email,
      role: "manager",
      is_active: true,
      permissions,
      created_at: new Date().toISOString(),
    });

    if (profileError) {
      await service.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      user: {
        id: created.user.id,
        name,
        email,
        role: "manager",
        isActive: true,
        permissions,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as UpdateManagerInput & { managerId: string };
  if (!body.managerId) {
    return NextResponse.json({ error: "Manager id required." }, { status: 400 });
  }

  try {
    const service = getServiceClient();
    const { data: existing } = await service
      .from("profiles")
      .select("*")
      .eq("id", body.managerId)
      .eq("role", "manager")
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Manager not found." }, { status: 404 });
    }

    const email = body.email?.toLowerCase().trim() ?? existing.email;
    const name = body.name?.trim() ?? existing.name;

    if (body.password && body.password.length >= 6) {
      const { error } = await service.auth.admin.updateUserById(body.managerId, {
        password: body.password,
        email,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else if (email !== existing.email) {
      const { error } = await service.auth.admin.updateUserById(body.managerId, { email });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const permissions = body.permissions
      ? normalizeManagerPermissions({ ...existing.permissions, ...body.permissions })
      : existing.permissions;

    const { error: profileError } = await service
      .from("profiles")
      .update({
        name,
        email,
        is_active: body.isActive ?? existing.is_active,
        permissions,
      })
      .eq("id", body.managerId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const managerId = searchParams.get("id");
  if (!managerId) {
    return NextResponse.json({ error: "Manager id required." }, { status: 400 });
  }

  try {
    const service = getServiceClient();
    const { error } = await service.auth.admin.deleteUser(managerId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
