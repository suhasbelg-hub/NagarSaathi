import { createClient, isSupabaseConfigured } from "./client";
import { createAdminClient, isSupabaseAdminConfigured } from "./admin";
import type {
  ContractorBid,
  ContractorProfile,
  DemoData,
  DemoUser,
  Grievance,
  GrievanceStatus,
  PhotoAsset,
  Priority,
  Role,
  StatusHistoryEntry,
  VerificationStatus,
} from "../types";
import { CATEGORIES, createInitialData, makeHistoryEntry, SLA_HOURS } from "../mock-data";
import { slaDeadline } from "../utils";

// Server / in-memory persistent store initialized with real seed data
let memoryStore: DemoData = createInitialData();

export const supabaseService = {
  isConfigured: () => isSupabaseConfigured,

  // 1. Auth & Users
  async getCurrentUser(sessionUserId?: string): Promise<DemoUser | null> {
    if (isSupabaseConfigured) {
      const client = createClient();
      if (!client) return null;
      const { data: { user } } = await client.auth.getUser();
      if (!user) return null;

      const { data: profile } = await client
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role as Role,
          confirmedAt: profile.confirmed_at,
          createdAt: profile.created_at,
        };
      }
    }

    if (sessionUserId) {
      const found = memoryStore.users.find((u) => u.id === sessionUserId);
      if (found) return found;
    }
    return null;
  },

  async login(email: string, password?: string): Promise<{ ok: boolean; user?: DemoUser; error?: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured) {
      const client = createClient();
      if (client && password) {
        const { data, error } = await client.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) {
          return { ok: false, error: error.message };
        }
        if (data.user) {
          const { data: profile } = await client
            .from("users")
            .select("*")
            .eq("id", data.user.id)
            .single();

          if (profile) {
            return {
              ok: true,
              user: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                role: profile.role as Role,
                confirmedAt: profile.confirmed_at,
                createdAt: profile.created_at,
              },
            };
          }
        }
      }
    }

    // Memory / Local Account Match
    const localUser = memoryStore.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!localUser) {
      return { ok: false, error: "Those details don’t match an account. Check the email address or register." };
    }
    if (!localUser.confirmedAt) {
      return { ok: false, error: "This account has not completed email verification. Continue to the verification screen." };
    }

    return { ok: true, user: localUser };
  },

  async register(
    name: string,
    email: string,
    password: string,
    role: "citizen" | "contractor"
  ): Promise<{ ok: boolean; user?: DemoUser; error?: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        const { data, error } = await client.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: name.trim(),
              role,
            },
          },
        });
        if (error) {
          return { ok: false, error: error.message };
        }
        if (data.user) {
          const newUser: DemoUser = {
            id: data.user.id,
            name: name.trim(),
            email: normalizedEmail,
            role,
            confirmedAt: data.user.email_confirmed_at ?? null,
            createdAt: new Date().toISOString(),
          };
          // Also track in memory store for session
          memoryStore.users = [newUser, ...memoryStore.users];
          return { ok: true, user: newUser };
        }
      }
    }

    // Check duplicate in memory store
    if (memoryStore.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, error: "An account with this email address already exists." };
    }

    const newUser: DemoUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      role,
      confirmedAt: null, // requires email verification
      createdAt: new Date().toISOString(),
    };
    memoryStore.users = [newUser, ...memoryStore.users];
    return { ok: true, user: newUser };
  },

  async confirmUserEmail(userId: string): Promise<boolean> {
    const target = memoryStore.users.find((u) => u.id === userId);
    if (!target) return false;
    target.confirmedAt = new Date().toISOString();

    if (isSupabaseConfigured && isSupabaseAdminConfigured) {
      const adminClient = createAdminClient();
      if (adminClient) {
        await adminClient
          .from("users")
          .update({ confirmed_at: target.confirmedAt })
          .eq("id", userId);
      }
    }
    return true;
  },

  async updateUserName(userId: string, name: string): Promise<boolean> {
    const target = memoryStore.users.find((u) => u.id === userId);
    if (target) {
      target.name = name.trim();
    }
    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        await client.from("users").update({ name: name.trim() }).eq("id", userId);
      }
    }
    return true;
  },

  // 2. Grievance CRUD & Lifecycle
  async getGrievances(options?: {
    userId?: string;
    role?: Role;
  }): Promise<Grievance[]> {
    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        let query = client.from("grievances").select("*, status_history(*)");
        if (options?.role === "citizen" && options?.userId) {
          query = query.eq("citizen_id", options.userId);
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((item: any) => ({
            id: item.id,
            citizenId: item.citizen_id,
            categoryId: item.category_id,
            zone: item.zone,
            description: item.description,
            photos: Array.isArray(item.photos) ? item.photos : [],
            status: item.status as GrievanceStatus,
            priority: item.priority as Priority | null,
            assignedContractorId: item.assigned_contractor_id,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            history: Array.isArray(item.status_history)
              ? item.status_history.map((h: any) => ({
                  id: h.id,
                  status: h.status,
                  updatedBy: h.actor_name,
                  actorRole: h.actor_role,
                  timestamp: h.timestamp,
                  notes: h.notes,
                }))
              : [],
            resolution: item.resolution ?? undefined,
          }));
        }
      }
    }

    // Role-based filtering in memory
    const { userId, role } = options || {};
    if (role === "citizen" && userId) {
      return memoryStore.grievances.filter((g) => g.citizenId === userId);
    }
    if (role === "contractor" && userId) {
      const profile = memoryStore.contractors.find((c) => c.userId === userId);
      return memoryStore.grievances.filter(
        (g) =>
          g.assignedContractorId === profile?.id ||
          (g.status === "triaged" &&
            profile?.status === "approved" &&
            profile.tradeCategoryId === g.categoryId &&
            profile.preferredZones.includes(g.zone))
      );
    }
    return memoryStore.grievances;
  },

  async createGrievance(input: {
    citizen: DemoUser;
    categoryId: string;
    zone: string;
    description: string;
    photos: PhotoAsset[];
  }): Promise<{ ok: boolean; id?: string; error?: string }> {
    if (input.description.trim().length < 20 || input.description.trim().length > 2000) {
      return { ok: false, error: "Description must be between 20 and 2000 characters." };
    }
    if (input.photos.length < 1 || input.photos.length > 5) {
      return { ok: false, error: "Please provide between 1 and 5 photos." };
    }

    const nextNumber =
      Math.max(144, ...memoryStore.grievances.map((item) => Number(item.id.split("-").at(-1)) || 0)) + 1;
    const id = `NS-2026-${String(nextNumber).padStart(4, "0")}`;
    const now = new Date().toISOString();

    const initialHistory = makeHistoryEntry("filed", input.citizen, "Grievance filed", now);

    const newGrievance: Grievance = {
      id,
      citizenId: input.citizen.id,
      categoryId: input.categoryId,
      zone: input.zone,
      description: input.description.trim(),
      photos: input.photos,
      status: "filed",
      priority: null,
      assignedContractorId: null,
      createdAt: now,
      updatedAt: now,
      history: [initialHistory],
    };

    memoryStore.grievances = [newGrievance, ...memoryStore.grievances];

    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        await client.from("grievances").insert({
          id,
          reference_number: id,
          citizen_id: input.citizen.id,
          category_id: input.categoryId,
          zone: input.zone,
          description: input.description.trim(),
          photos: input.photos as any,
          status: "filed",
          priority: null,
          created_at: now,
          updated_at: now,
        });

        await client.from("status_history").insert({
          id: initialHistory.id,
          grievance_id: id,
          status: "filed",
          updated_by: input.citizen.id,
          actor_name: input.citizen.name,
          actor_role: input.citizen.role,
          notes: "Grievance filed",
          timestamp: now,
        });
      }
    }

    return { ok: true, id };
  },

  async triageGrievance(
    grievanceId: string,
    priority: Priority,
    staffUser: DemoUser
  ): Promise<{ ok: boolean; error?: string }> {
    const grievance = memoryStore.grievances.find((g) => g.id === grievanceId);
    if (!grievance || grievance.status !== "filed") {
      return { ok: false, error: "This grievance cannot be triaged (must be in filed status)." };
    }

    const now = new Date().toISOString();
    const historyEntry = makeHistoryEntry(
      "triaged",
      staffUser,
      `Priority set to ${priority}; ready for eligible contractor bids.`,
      now
    );

    grievance.status = "triaged";
    grievance.priority = priority;
    grievance.updatedAt = now;
    grievance.history = [...grievance.history, historyEntry];

    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        await client
          .from("grievances")
          .update({
            status: "triaged",
            priority,
            updated_at: now,
          })
          .eq("id", grievanceId);

        await client.from("status_history").insert({
          id: historyEntry.id,
          grievance_id: grievanceId,
          status: "triaged",
          updated_by: staffUser.id,
          actor_name: staffUser.name,
          actor_role: staffUser.role,
          notes: historyEntry.notes,
          timestamp: now,
        });
      }
    }

    return { ok: true };
  },

  // 3. Contractor Bidding & Work Orders
  async submitBid(
    grievanceId: string,
    bidNotes: string,
    contractorUser: DemoUser
  ): Promise<{ ok: boolean; bid?: ContractorBid; reason?: string }> {
    const profile = memoryStore.contractors.find((c) => c.userId === contractorUser.id);
    if (!profile || profile.status !== "approved") {
      return { ok: false, reason: "Your contractor profile must be approved before you can bid." };
    }
    const grievance = memoryStore.grievances.find((g) => g.id === grievanceId);
    if (!grievance || grievance.status !== "triaged") {
      return { ok: false, reason: "This opportunity is no longer open for bids." };
    }
    if (
      profile.tradeCategoryId !== grievance.categoryId ||
      !profile.preferredZones.includes(grievance.zone)
    ) {
      return {
        ok: false,
        reason: `This grievance does not match your trade category and preferred zones.`,
      };
    }
    if (
      memoryStore.bids.some(
        (b) => b.grievanceId === grievanceId && b.contractorId === profile.id
      )
    ) {
      return { ok: false, reason: "You have already submitted a bid for this grievance." };
    }

    const now = new Date().toISOString();
    const newBid: ContractorBid = {
      id: `bid-${Date.now()}`,
      contractorId: profile.id,
      grievanceId,
      bidNotes: bidNotes.trim(),
      status: "submitted",
      createdAt: now,
    };

    memoryStore.bids = [newBid, ...memoryStore.bids];

    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        await client.from("contractor_bids").insert({
          id: newBid.id,
          contractor_id: profile.id,
          grievance_id: grievanceId,
          bid_notes: bidNotes.trim(),
          status: "submitted",
          created_at: now,
        });
      }
    }

    return { ok: true, bid: newBid };
  },

  async awardBid(
    bidId: string,
    staffUser: DemoUser
  ): Promise<{ ok: boolean; reason?: string }> {
    const bid = memoryStore.bids.find((b) => b.id === bidId);
    if (!bid || bid.status !== "submitted") {
      return { ok: false, reason: "This bid is not available for award." };
    }
    const grievance = memoryStore.grievances.find((g) => g.id === bid.grievanceId);
    if (!grievance || grievance.status !== "triaged") {
      return { ok: false, reason: "The grievance is no longer in triaged state." };
    }

    const contractor = memoryStore.contractors.find((c) => c.id === bid.contractorId);
    const now = new Date().toISOString();

    // Mark winning bid awarded, others rejected
    memoryStore.bids = memoryStore.bids.map((item) => {
      if (item.grievanceId === bid.grievanceId && item.status === "submitted") {
        return {
          ...item,
          status: item.id === bidId ? "awarded" : "rejected",
        };
      }
      return item;
    });

    const historyEntry = makeHistoryEntry(
      "assigned",
      staffUser,
      `${contractor?.businessName ?? "Selected contractor"} was selected for this work. Other submitted bids were rejected.`,
      now
    );

    grievance.status = "assigned";
    grievance.assignedContractorId = bid.contractorId;
    grievance.updatedAt = now;
    grievance.history = [...grievance.history, historyEntry];

    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        // Update grievance
        await client
          .from("grievances")
          .update({
            status: "assigned",
            assigned_contractor_id: bid.contractorId,
            updated_at: now,
          })
          .eq("id", grievance.id);

        // Update winning bid
        await client
          .from("contractor_bids")
          .update({ status: "awarded", updated_at: now })
          .eq("id", bidId);

        // Update other submitted bids to rejected
        await client
          .from("contractor_bids")
          .update({ status: "rejected", updated_at: now })
          .eq("grievance_id", grievance.id)
          .neq("id", bidId);

        // Insert history
        await client.from("status_history").insert({
          id: historyEntry.id,
          grievance_id: grievance.id,
          status: "assigned",
          updated_by: staffUser.id,
          actor_name: staffUser.name,
          actor_role: staffUser.role,
          notes: historyEntry.notes,
          timestamp: now,
        });
      }
    }

    return { ok: true };
  },

  async rejectBid(bidId: string): Promise<boolean> {
    const target = memoryStore.bids.find((b) => b.id === bidId);
    if (!target || target.status !== "submitted") return false;
    target.status = "rejected";

    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        await client
          .from("contractor_bids")
          .update({ status: "rejected", updated_at: new Date().toISOString() })
          .eq("id", bidId);
      }
    }
    return true;
  },

  async startWork(grievanceId: string, contractorUser: DemoUser): Promise<boolean> {
    const grievance = memoryStore.grievances.find((g) => g.id === grievanceId);
    if (
      !grievance ||
      grievance.status !== "assigned" ||
      grievance.assignedContractorId !== contractorUser.id
    ) {
      return false;
    }

    const now = new Date().toISOString();
    const historyEntry = makeHistoryEntry(
      "in_progress",
      contractorUser,
      "Work started by the assigned contractor.",
      now
    );

    grievance.status = "in_progress";
    grievance.updatedAt = now;
    grievance.history = [...grievance.history, historyEntry];

    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        await client
          .from("grievances")
          .update({ status: "in_progress", updated_at: now })
          .eq("id", grievanceId);

        await client.from("status_history").insert({
          id: historyEntry.id,
          grievance_id: grievanceId,
          status: "in_progress",
          updated_by: contractorUser.id,
          actor_name: contractorUser.name,
          actor_role: contractorUser.role,
          notes: historyEntry.notes,
          timestamp: now,
        });
      }
    }

    return true;
  },

  async submitFix(
    grievanceId: string,
    before: PhotoAsset[],
    after: PhotoAsset[],
    closingNotes: string,
    contractorUser: DemoUser
  ): Promise<boolean> {
    const grievance = memoryStore.grievances.find((g) => g.id === grievanceId);
    if (
      !grievance ||
      grievance.status !== "in_progress" ||
      grievance.assignedContractorId !== contractorUser.id
    ) {
      return false;
    }

    const now = new Date().toISOString();
    const historyEntry = makeHistoryEntry(
      "resolved",
      contractorUser,
      closingNotes.trim(),
      now
    );

    grievance.status = "resolved";
    grievance.updatedAt = now;
    grievance.resolution = {
      before,
      after,
      closingNotes: closingNotes.trim(),
    };
    grievance.history = [...grievance.history, historyEntry];

    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        await client
          .from("grievances")
          .update({
            status: "resolved",
            resolution: grievance.resolution as any,
            resolved_at: now,
            updated_at: now,
          })
          .eq("id", grievanceId);

        await client.from("status_history").insert({
          id: historyEntry.id,
          grievance_id: grievanceId,
          status: "resolved",
          updated_by: contractorUser.id,
          actor_name: contractorUser.name,
          actor_role: contractorUser.role,
          notes: historyEntry.notes,
          timestamp: now,
        });
      }
    }

    return true;
  },

  // 4. Contractor Profile & Admin Verification
  async saveContractorProfile(
    input: {
      businessName: string;
      licenseNumber: string;
      tradeCategoryId: string;
      preferredZones: string[];
    },
    contractorUser: DemoUser
  ): Promise<{ ok: boolean; reason?: string }> {
    const duplicate = memoryStore.contractors.find(
      (item) =>
        item.licenseNumber.toLowerCase() === input.licenseNumber.trim().toLowerCase() &&
        item.userId !== contractorUser.id
    );
    if (duplicate) {
      return { ok: false, reason: "That license number is already on another profile." };
    }

    const now = new Date().toISOString();
    const profile: ContractorProfile = {
      id: contractorUser.id,
      userId: contractorUser.id,
      businessName: input.businessName.trim(),
      licenseNumber: input.licenseNumber.trim().toUpperCase(),
      tradeCategoryId: input.tradeCategoryId,
      preferredZones: input.preferredZones,
      status: "pending",
      rejectionReason: null,
      approvedBy: null,
      approvedAt: null,
      submittedAt: now,
    };

    const existingIndex = memoryStore.contractors.findIndex((c) => c.userId === contractorUser.id);
    if (existingIndex >= 0) {
      memoryStore.contractors[existingIndex] = profile;
    } else {
      memoryStore.contractors = [profile, ...memoryStore.contractors];
    }

    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        await client.from("contractor_profiles").upsert({
          id: contractorUser.id,
          user_id: contractorUser.id,
          business_name: input.businessName.trim(),
          license_number: input.licenseNumber.trim().toUpperCase(),
          trade_category_id: input.tradeCategoryId,
          preferred_zones: input.preferredZones,
          status: "pending",
          rejection_reason: null,
          submitted_at: now,
          updated_at: now,
        });
      }
    }

    return { ok: true };
  },

  async decideContractor(
    profileId: string,
    decision: "approved" | "rejected",
    reason: string = "",
    adminUser: DemoUser
  ): Promise<boolean> {
    const profile = memoryStore.contractors.find((c) => c.id === profileId);
    if (!profile || profile.status !== "pending") return false;

    const now = new Date().toISOString();
    profile.status = decision;
    profile.rejectionReason = decision === "rejected" ? reason.trim() : null;
    profile.approvedBy = decision === "approved" ? adminUser.id : null;
    profile.approvedAt = decision === "approved" ? now : null;

    if (isSupabaseConfigured) {
      const client = createClient();
      if (client) {
        await client
          .from("contractor_profiles")
          .update({
            status: decision,
            rejection_reason: profile.rejectionReason,
            approved_by: profile.approvedBy,
            approved_at: profile.approvedAt,
            updated_at: now,
          })
          .eq("id", profileId);
      }
    }

    return true;
  },

  // 5. Admin Metrics
  getAdminMetrics() {
    const grievances = memoryStore.grievances;
    const resolved = grievances.filter((item) => item.status === "resolved");

    const durations = resolved
      .map((item) => {
        const filedAt =
          item.history.find((entry) => entry.status === "filed")?.timestamp ?? item.createdAt;
        const resolvedAt = item.history.find((entry) => entry.status === "resolved")?.timestamp;
        return resolvedAt
          ? (new Date(resolvedAt).getTime() - new Date(filedAt).getTime()) / 3600000
          : null;
      })
      .filter((value): value is number => value !== null && value >= 0);

    const averageHours = durations.length
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length
      : null;

    const overdue = grievances.filter(
      (item) =>
        item.status !== "resolved" &&
        slaDeadline(item.createdAt, item.priority).getTime() < Date.now()
    );

    const pendingProfiles = memoryStore.contractors.filter((profile) => profile.status === "pending");
    const oldestPendingHours = pendingProfiles.length
      ? Math.max(
          ...pendingProfiles.map(
            (item) => (Date.now() - new Date(item.submittedAt).getTime()) / 3600000
          )
        )
      : null;

    const approved = memoryStore.contractors.filter((profile) => profile.status === "approved");
    const eligiblePairs = approved.flatMap((profile) =>
      grievances
        .filter(
          (grievance) =>
            grievance.status === "triaged" &&
            grievance.categoryId === profile.tradeCategoryId &&
            profile.preferredZones.includes(grievance.zone)
        )
        .map((grievance) => ({ profile, grievance }))
    );

    const responsivePairs = eligiblePairs.filter(({ profile, grievance }) =>
      memoryStore.bids.some(
        (bid) => bid.contractorId === profile.id && bid.grievanceId === grievance.id
      )
    );

    const responseRate = eligiblePairs.length
      ? Math.round((responsivePairs.length / eligiblePairs.length) * 100)
      : null;

    return {
      totalGrievances: grievances.length,
      averageHours,
      overdueCount: overdue.length,
      pendingProfilesCount: pendingProfiles.length,
      oldestPendingHours,
      responseRate,
    };
  },

  // 6. Direct Store Access for state sync
  getData(): DemoData {
    return memoryStore;
  },

  resetStore() {
    memoryStore = createInitialData();
    return memoryStore;
  },
};
