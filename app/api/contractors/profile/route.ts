import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { input, contractorUser } = await req.json();
    if (!input || !contractorUser) {
      return NextResponse.json({ ok: false, error: "Missing required data." }, { status: 400 });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "Database client unavailable." }, { status: 500 });
    }

    // Check duplicate license
    const { data: existing } = await client
      .from("contractor_profiles")
      .select("id, user_id, license_number")
      .ilike("license_number", input.licenseNumber.trim())
      .neq("user_id", contractorUser.id);

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: false, error: "That license number is already registered to another profile." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error: upsertErr } = await client.from("contractor_profiles").upsert({
      id: contractorUser.id,
      user_id: contractorUser.id,
      business_name: input.businessName.trim(),
      license_number: input.licenseNumber.trim().toUpperCase(),
      trade_category_id: input.tradeCategoryId,
      preferred_zones: input.preferredZones,
      status: "pending",
      rejection_reason: null,
      submitted_at: now,
      updated_at: now,
    });

    if (upsertErr) {
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
