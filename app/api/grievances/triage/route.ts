import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { id, priority, staffUser } = await req.json();

    if (!id || !priority || !staffUser) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "Database client unavailable." }, { status: 500 });
    }

    const now = new Date().toISOString();

    const { error: gErr } = await client
      .from("grievances")
      .update({
        status: "triaged",
        priority,
        updated_at: now,
      })
      .eq("id", id);

    if (gErr) {
      return NextResponse.json({ ok: false, error: gErr.message }, { status: 400 });
    }

    const histId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await client.from("status_history").insert({
      id: histId,
      grievance_id: id,
      status: "triaged",
      updated_by: staffUser.id,
      actor_name: staffUser.name,
      actor_role: staffUser.role,
      notes: `Priority set to ${priority}; ready for eligible contractor bids.`,
      timestamp: now,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
