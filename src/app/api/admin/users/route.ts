import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    // profiles テーブルからのみ取得し、そのまま返す
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, name, email, created_at, updated_at, is_admin, role, phone, address, points"
      );

    if (profilesError) throw profilesError;

    return NextResponse.json({ users: profiles ?? [] });
  } catch (e: any) {
    console.error("/api/admin/users error", e);
    return NextResponse.json(
      { error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
