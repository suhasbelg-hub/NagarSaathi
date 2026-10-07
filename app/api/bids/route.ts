import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { grievanceId, bidNotes, contractorUser } = await req.json();
    if (!grievanceId || !bidNotes || !contractorUser) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "Database client unavailable." }, { status: 500 });
    }

    // Check contractor profile
    const { data: profile } = await client
      .from("contractor_profiles")
      .select("*")
      .eq("user_id", contractorUser.id)
      .single();

    if (!profile || profile.status !== "approved") {
      return NextResponse.json({ ok: false, error: "Your contractor profile must be approved before you can bid." }, { status: 400 });
    }

    // Check existing bid
    const { data: existingBid } = await client
      .from("contractor_bids")
      .select("id")
      .eq("contractor_id", profile.id)
      .eq("grievance_id", grievanceId);

    if (existingBid && existingBid.length > 0) {
      return NextResponse.json({ ok: false, error: "You have already submitted a bid for this grievance." }, { status: 400 });
    }

    const bidId = `bid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const { error: insertErr } = await client.from("contractor_bids").insert({
      id: bidId,
      contractor_id: profile.id,
      grievance_id: grievanceId,
      bid_notes: bidNotes.trim(),
      status: "submitted",
      created_at: now,
      updated_at: now,
    });

    if (insertErr) {
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: bidId });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
