import { NextResponse } from "next/server";
import { checkSupabaseHealth } from "@/lib/supabase/health";

export async function GET() {
  const health = await checkSupabaseHealth();
  return NextResponse.json(health, {
    status: health.connected ? 200 : health.configured ? 503 : 400,
  });
}
