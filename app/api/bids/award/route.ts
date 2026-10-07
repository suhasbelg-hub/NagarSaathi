import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { bidId, staffUser } = await req.json();
    if (!bidId || !staffUser) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "Database client unavailable." }, { status: 500 });
    }

    // Get the bid
    const { data: bid, error: bErr } = await client
      .from("contractor_bids")
      .select("*, contractor_profiles(*)")
      .eq("id", bidId)
      .single();

    if (bErr || !bid) {
      return NextResponse.json({ ok: false, error: "Bid not found." }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 1. Mark this bid as awarded
    await client
      .from("contractor_bids")
      .update({ status: "awarded", updated_at: now })
      .eq("id", bidId);

    // 2. Reject all other bids for this grievance
    await client
      .from("contractor_bids")
      .update({ status: "rejected", updated_at: now })
      .eq("grievance_id", bid.grievance_id)
      .neq("id", bidId);

    // 3. Update grievance to assigned
    await client
      .from("grievances")
      .update({
        status: "assigned",
        assigned_contractor_id: bid.contractor_id,
        updated_at: now,
      })
      .eq("id", bid.grievance_id);

    // 4. Create work order
    const workOrderId = `wo-${bid.grievance_id.replace("NS-2026-", "")}-${bid.contractor_id.slice(0, 6)}`;
    await client.from("work_orders").upsert({
      id: workOrderId,
      grievance_id: bid.grievance_id,
      contractor_id: bid.contractor_id,
      bid_id: bidId,
      status: "assigned",
      created_at: now,
    });

    // 5. Insert status history
    const histId = `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const businessName = (bid.contractor_profiles as any)?.business_name || "Assigned contractor";
    await client.from("status_history").insert({
      id: histId,
      grievance_id: bid.grievance_id,
      status: "assigned",
      updated_by: staffUser.id,
      actor_name: staffUser.name,
      actor_role: staffUser.role,
      notes: `${businessName} was awarded the work order. Other submitted bids were rejected.`,
      timestamp: now,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
