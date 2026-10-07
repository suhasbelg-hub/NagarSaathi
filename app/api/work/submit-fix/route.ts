import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { grievanceId, before, after, closingNotes, contractorUser } = await req.json();
    if (!grievanceId || !contractorUser || !closingNotes) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "Database client unavailable." }, { status: 500 });
    }

    const now = new Date().toISOString();
    const resolution = {
      before: Array.isArray(before) ? before : [],
      after: Array.isArray(after) ? after : [],
      closingNotes: closingNotes.trim(),
    };

    // Update grievance
    const { error: gErr } = await client
      .from("grievances")
      .update({
        status: "resolved",
        resolution,
        resolved_at: now,
        updated_at: now,
      })
      .eq("id", grievanceId);

    if (gErr) {
      return NextResponse.json({ ok: false, error: gErr.message }, { status: 400 });
    }

    // Update work order
    await client
      .from("work_orders")
      .update({
        status: "completed",
        completed_at: now,
      })
      .eq("grievance_id", grievanceId);

    // Insert history
    const histId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await client.from("status_history").insert({
      id: histId,
      grievance_id: grievanceId,
      status: "resolved",
      updated_by: contractorUser.id,
      actor_name: contractorUser.name,
      actor_role: contractorUser.role,
      notes: closingNotes.trim(),
      timestamp: now,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
