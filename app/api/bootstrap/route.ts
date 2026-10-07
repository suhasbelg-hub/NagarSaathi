import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { ContractorBid, ContractorProfile, DemoUser, Grievance, GrievanceStatus, Priority, Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isSupabaseAdminConfigured) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "Unable to connect to database" }, { status: 500 });
    }

    const [usersRes, grievancesRes, contractorsRes, bidsRes, categoriesRes, zonesRes] = await Promise.all([
      client.from("users").select("*").order("created_at", { ascending: false }),
      client.from("grievances").select("*, status_history(*)").order("created_at", { ascending: false }),
      client.from("contractor_profiles").select("*").order("created_at", { ascending: false }),
      client.from("contractor_bids").select("*").order("created_at", { ascending: false }),
      client.from("categories").select("*"),
      client.from("zones").select("*")
    ]);

    if (usersRes.error) console.error("Error fetching users:", usersRes.error);
    if (grievancesRes.error) console.error("Error fetching grievances:", grievancesRes.error);
    if (contractorsRes.error) console.error("Error fetching contractors:", contractorsRes.error);
    if (bidsRes.error) console.error("Error fetching bids:", bidsRes.error);

    const users: DemoUser[] = (usersRes.data || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as Role,
      confirmedAt: u.confirmed_at,
      createdAt: u.created_at,
    }));

    const grievances: Grievance[] = (grievancesRes.data || []).map((g) => ({
      id: g.id,
      citizenId: g.citizen_id,
      categoryId: g.category_id,
      zone: g.zone,
      description: g.description,
      photos: Array.isArray(g.photos) ? g.photos : [],
      status: g.status as GrievanceStatus,
      priority: g.priority as Priority | null,
      assignedContractorId: g.assigned_contractor_id,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
      history: Array.isArray(g.status_history)
        ? g.status_history
            .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .map((h: any) => ({
              id: h.id,
              status: h.status as GrievanceStatus,
              updatedBy: h.actor_name,
              actorRole: h.actor_role as Role,
              timestamp: h.timestamp,
              notes: h.notes,
            }))
        : [],
      resolution: g.resolution ?? undefined,
    }));

    const contractors: ContractorProfile[] = (contractorsRes.data || []).map((c) => ({
      id: c.id,
      userId: c.user_id,
      businessName: c.business_name,
      licenseNumber: c.license_number,
      tradeCategoryId: c.trade_category_id,
      preferredZones: c.preferred_zones || [],
      status: c.status,
      rejectionReason: c.rejection_reason,
      approvedBy: c.approved_by,
      approvedAt: c.approved_at,
      submittedAt: c.submitted_at || c.created_at,
    }));

    const bids: ContractorBid[] = (bidsRes.data || []).map((b) => ({
      id: b.id,
      contractorId: b.contractor_id,
      grievanceId: b.grievance_id,
      bidNotes: b.bid_notes,
      status: b.status,
      createdAt: b.created_at,
    }));

    const categories = categoriesRes.data || [];
    const zones = zonesRes.data || [];

    return NextResponse.json({
      ok: true,
      data: {
        users,
        grievances,
        contractors,
        bids,
        categories,
        zones,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Failed to load database state" }, { status: 500 });
  }
}
