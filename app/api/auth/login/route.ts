import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database client unavailable." }, { status: 500 });
    }

    // 1. Fetch user from public.users
    const { data: profile, error: pErr } = await admin
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (pErr || !profile) {
      return NextResponse.json(
        { ok: false, error: "Those details don’t match an account. Check the email address or register." },
        { status: 401 }
      );
    }

    // 2. Validate credentials via Supabase Auth
    if (password && supabaseUrl && supabaseAnonKey) {
      const anon = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });
      const { error: authErr } = await anon.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authErr) {
        return NextResponse.json({ ok: false, error: authErr.message }, { status: 401 });
      }
    }

    if (!profile.confirmed_at) {
      return NextResponse.json(
        { ok: false, error: "This account has not completed email verification. Continue to the verification screen." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as Role,
        confirmedAt: profile.confirmed_at,
        createdAt: profile.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "Internal server error: " + err.message }, { status: 500 });
  }
}
