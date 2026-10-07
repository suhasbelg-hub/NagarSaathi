import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { profileId, decision, reason, adminUser } = await req.json();
    if (!profileId || !decision || !adminUser) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "Database client unavailable." }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { error } = await client
      .from("contractor_profiles")
      .update({
        status: decision,
        rejection_reason: decision === "rejected" ? (reason || "").trim() : null,
        approved_by: decision === "approved" ? adminUser.id : null,
        approved_at: decision === "approved" ? now : null,
        updated_at: now,
      })
      .eq("id", profileId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
