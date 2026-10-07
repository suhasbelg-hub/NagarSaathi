import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ ok: false, error: "Name, email, and password are required." }, { status: 400 });
    }

    if (role !== "citizen" && role !== "contractor") {
      return NextResponse.json({ ok: false, error: "Invalid role selected." }, { status: 400 });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "Database client unavailable." }, { status: 500 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already registered in public.users
    const { data: existing } = await client
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: false, error: "An account with this email address already exists." }, { status: 400 });
    }

    // Create in Supabase Auth
    const { data: authUser, error: authErr } = await client.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        name: name.trim(),
        role,
      },
    });

    if (authErr) {
      return NextResponse.json({ ok: false, error: authErr.message }, { status: 400 });
    }

    const now = new Date().toISOString();
    const userId = authUser.user.id;

    // Insert into public.users
    const { error: dbErr } = await client.from("users").insert({
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      role,
      confirmed_at: null,
      created_at: now,
      updated_at: now,
    });

    if (dbErr) {
      console.error("Error inserting into public.users:", dbErr);
      return NextResponse.json({ ok: false, error: dbErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        role,
        confirmedAt: null,
        createdAt: now,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "Internal server error: " + err.message }, { status: 500 });
  }
}
