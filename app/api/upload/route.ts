import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "grievance-photos";

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "File exceeds 5MB limit" }, { status: 400 });
    }

    // Validate type
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "Only JPEG, PNG, or WebP allowed" }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      const client = isSupabaseAdminConfigured ? createAdminClient() : createClient();
      if (client) {
        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `${fileName}`;

        const buffer = Buffer.from(await file.arrayBuffer());
        const { data, error } = await client.storage
          .from(bucket)
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (!error && data) {
          const { data: publicUrlData } = client.storage
            .from(bucket)
            .getPublicUrl(data.path);

          return NextResponse.json({
            ok: true,
            src: publicUrlData.publicUrl,
            label: file.name,
          });
        }
      }
    }

    // Fallback: convert to base64 data URL
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      ok: true,
      src: dataUrl,
      label: file.name,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "Upload failed: " + err.message }, { status: 500 });
  }
}
