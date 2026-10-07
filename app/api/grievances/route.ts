import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { citizen, categoryId, zone, description, photos } = body;

    if (!citizen || !citizen.id || !categoryId || !zone || !description) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    if (description.trim().length < 20 || description.trim().length > 2000) {
      return NextResponse.json({ ok: false, error: "Description must be between 20 and 2000 characters." }, { status: 400 });
    }

    if (!Array.isArray(photos) || photos.length < 1 || photos.length > 5) {
      return NextResponse.json({ ok: false, error: "Please provide between 1 and 5 photos." }, { status: 400 });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "Database client unavailable." }, { status: 500 });
    }

    // Generate reference ID based on database count
    const { count } = await client.from("grievances").select("*", { count: "exact", head: true });
    const nextNumber = (count || 0) + 143;
    const id = `NS-2026-${String(nextNumber).padStart(4, "0")}`;
    const now = new Date().toISOString();

    // Insert grievance record
    const { error: gErr } = await client.from("grievances").insert({
      id,
      reference_number: id,
      citizen_id: citizen.id,
      category_id: categoryId,
      zone,
      description: description.trim(),
      photos,
      status: "filed",
      created_at: now,
      updated_at: now,
    });

    if (gErr) {
      console.error("Grievance insert error:", gErr);
      return NextResponse.json({ ok: false, error: gErr.message }, { status: 400 });
    }

    // Insert status history record
    const historyId = `hist-${id.replace("NS-2026-", "")}-1`;
    await client.from("status_history").insert({
      id: historyId,
      grievance_id: id,
      status: "filed",
      updated_by: citizen.id,
      actor_name: citizen.name,
      actor_role: citizen.role,
      notes: "Grievance filed",
      timestamp: now,
    });

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "Internal server error: " + err.message }, { status: 500 });
  }
}
