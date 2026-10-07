import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "User ID is required." }, { status: 400 });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "Database client unavailable." }, { status: 500 });
    }

    const now = new Date().toISOString();

    // Confirm email in auth
    try {
      await client.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
    } catch (e) {
      console.warn("Auth confirm notice:", e);
    }

    // Confirm in public.users
    const { error: dbErr } = await client
      .from("users")
      .update({ confirmed_at: now, updated_at: now })
      .eq("id", userId);

    if (dbErr) {
      return NextResponse.json({ ok: false, error: dbErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
