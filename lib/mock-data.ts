import type {
  Category,
  ContractorBid,
  ContractorProfile,
  DemoData,
  DemoUser,
  Grievance,
  GrievanceStatus,
  PhotoAsset,
  Role,
  StatusHistoryEntry
} from "./types";

export const CATEGORIES: Category[] = [
  { id: "roads", name: "Roads & Potholes", description: "Road damage, potholes, and unsafe surfaces" },
  { id: "electrical", name: "Streetlights & Electrical", description: "Streetlights, exposed wires, and electrical faults" },
  { id: "water", name: "Water Supply & Leakage", description: "Water outages, leaks, and damaged pipelines" },
  { id: "drainage", name: "Sewage & Drainage", description: "Blocked drains, sewage, and waterlogging" },
  { id: "sanitation", name: "Garbage & Sanitation", description: "Missed collection and overflowing waste" },
  { id: "parks", name: "Parks & Public Spaces", description: "Damaged public amenities and unsafe spaces" }
];

export const ZONES = [
  "Zone 1 — Central",
  "Zone 2 — North",
  "Zone 3 — East",
  "Zone 4 — West",
  "Zone 5 — South",
  "Zone 6 — Riverside",
  "Zone 7 — Industrial",
  "Zone 8 — Outer East"
];

export const STATUS_ORDER: GrievanceStatus[] = ["filed", "triaged", "assigned", "in_progress", "resolved"];
export const SLA_HOURS: Record<string, number> = { critical: 12, high: 24, medium: 48, low: 72, null: 72 };

const ago = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const inPast = (date: string) => new Date(date).toISOString();
const photo = (src: string, label: string): PhotoAsset => ({ src, label });

function history(
  id: string,
  status: GrievanceStatus,
  updatedBy: string,
  actorRole: Role,
  hoursAgo: number,
  notes: string
): StatusHistoryEntry {
  return { id, status, updatedBy, actorRole, timestamp: ago(hoursAgo), notes };
}

const users: DemoUser[] = [
  { id: "user-priya", name: "Priya Sharma", email: "priya.sharma@example.in", role: "citizen", confirmedAt: ago(24 * 120), createdAt: ago(24 * 120) },
  { id: "user-staff", name: "Ramesh Iyer", email: "ramesh.iyer@municipal.demo", role: "staff", confirmedAt: ago(24 * 180), createdAt: ago(24 * 180) },
  { id: "user-suresh", name: "Suresh Patel", email: "suresh@patelelectrical.demo", role: "contractor", confirmedAt: ago(24 * 90), createdAt: ago(24 * 90) },
  { id: "user-admin", name: "Meera Krishnan", email: "meera.krishnan@municipal.demo", role: "admin", confirmedAt: ago(24 * 240), createdAt: ago(24 * 240) },
  { id: "user-sunrise", name: "Maya Reddy", email: "maya@sunrisedrainage.demo", role: "contractor", confirmedAt: ago(24 * 8), createdAt: ago(24 * 8) },
  { id: "user-civicworks", name: "Arjun Rao", email: "arjun@civicworks.demo", role: "contractor", confirmedAt: ago(24 * 76), createdAt: ago(24 * 76) },
  { id: "user-ananya", name: "Ananya Rao", email: "ananya.rao@example.in", role: "citizen", confirmedAt: ago(24 * 2), createdAt: ago(24 * 2) }
];

const contractors: ContractorProfile[] = [
  {
    id: "user-suresh",
    userId: "user-suresh",
    businessName: "Patel Electrical Works",
    licenseNumber: "TG-EL-20481",
    tradeCategoryId: "electrical",
    preferredZones: [ZONES[1], ZONES[2], ZONES[7]],
    status: "approved",
    rejectionReason: null,
    approvedBy: "user-admin",
    approvedAt: ago(24 * 31),
    submittedAt: ago(24 * 34)
  },
  {
    id: "user-sunrise",
    userId: "user-sunrise",
    businessName: "Sunrise Drainage Works",
    licenseNumber: "TG-DR-77315",
    tradeCategoryId: "drainage",
    preferredZones: [ZONES[0], ZONES[4], ZONES[5]],
    status: "pending",
    rejectionReason: null,
    approvedBy: null,
    approvedAt: null,
    submittedAt: ago(26)
  },
  {
    id: "user-civicworks",
    userId: "user-civicworks",
    businessName: "CivicWorks Roads & Utilities",
    licenseNumber: "TG-RD-49120",
    tradeCategoryId: "roads",
    preferredZones: [ZONES[0], ZONES[1], ZONES[2], ZONES[3]],
    status: "approved",
    rejectionReason: null,
    approvedBy: "user-admin",
    approvedAt: ago(24 * 62),
    submittedAt: ago(24 * 65)
  }
];

const grievances: Grievance[] = [
  {
    id: "NS-2026-0142",
    citizenId: "user-priya",
    categoryId: "roads",
    zone: ZONES[0],
    description: "A deep pothole has formed near the Central bus stop. It is difficult for two-wheelers to see after dark, and water collects in it after rain.",
    photos: [photo("/civic/pothole.svg", "Pothole near a bus stop")],
    status: "filed",
    priority: null,
    assignedContractorId: null,
    createdAt: ago(3),
    updatedAt: ago(3),
    history: [history("h-0142-filed", "filed", "Priya Sharma", "citizen", 3, "Grievance filed")]
  },
  {
    id: "NS-2026-0141",
    citizenId: "user-priya",
    categoryId: "electrical",
    zone: ZONES[1],
    description: "The streetlight outside the community health centre has been out for several evenings. The footpath is very dark after sunset.",
    photos: [photo("/civic/streetlight.svg", "Streetlight outside a community health centre")],
    status: "triaged",
    priority: "critical",
    assignedContractorId: null,
    createdAt: ago(16),
    updatedAt: ago(8),
    history: [
      history("h-0141-filed", "filed", "Priya Sharma", "citizen", 16, "Grievance filed"),
      history("h-0141-triaged", "triaged", "Ramesh Iyer", "staff", 8, "Priority set to critical; ready for contractor bids")
    ]
  },
  {
    id: "NS-2026-0140",
    citizenId: "user-priya",
    categoryId: "electrical",
    zone: ZONES[1],
    description: "A loose streetlight cover is hanging above the footpath on North Market Road. Please secure it before it falls.",
    photos: [photo("/civic/streetlight-cover.svg", "Loose streetlight cover over a footpath")],
    status: "triaged",
    priority: "high",
    assignedContractorId: null,
    createdAt: ago(6),
    updatedAt: ago(2),
    history: [
      history("h-0140-filed", "filed", "Priya Sharma", "citizen", 6, "Grievance filed"),
      history("h-0140-triaged", "triaged", "Ramesh Iyer", "staff", 2, "Priority set to high; open for eligible contractor bids")
    ]
  },
  {
    id: "NS-2026-0139",
    citizenId: "user-ananya",
    categoryId: "water",
    zone: ZONES[5],
    description: "Water is leaking from a small pipe joint beside the riverside walkway. The pavement has become slippery.",
    photos: [photo("/civic/water-leak.svg", "Water leaking beside a paved walkway")],
    status: "triaged",
    priority: "medium",
    assignedContractorId: null,
    createdAt: ago(14),
    updatedAt: ago(9),
    history: [
      history("h-0139-filed", "filed", "Ananya Rao", "citizen", 14, "Grievance filed"),
      history("h-0139-triaged", "triaged", "Ramesh Iyer", "staff", 9, "Priority set to medium; awaiting contractor bids")
    ]
  },
  {
    id: "NS-2026-0138",
    citizenId: "user-ananya",
    categoryId: "roads",
    zone: ZONES[2],
    description: "A section of the road edge has crumbled near the market entrance, leaving a sharp drop beside the pedestrian crossing.",
    photos: [photo("/civic/road-edge.svg", "Damaged road edge at a pedestrian crossing")],
    status: "assigned",
    priority: "high",
    assignedContractorId: "user-civicworks",
    createdAt: ago(18),
    updatedAt: ago(3),
    history: [
      history("h-0138-filed", "filed", "Ananya Rao", "citizen", 18, "Grievance filed"),
      history("h-0138-triaged", "triaged", "Ramesh Iyer", "staff", 14, "Priority set to high"),
      history("h-0138-assigned", "assigned", "Ramesh Iyer", "staff", 3, "CivicWorks Roads & Utilities selected for this work")
    ]
  },
  {
    id: "NS-2026-0136",
    citizenId: "user-ananya",
    categoryId: "electrical",
    zone: ZONES[2],
    description: "The lamp beside the East Park entrance flickers and goes dark every few minutes. The issue has continued for two nights.",
    photos: [photo("/civic/streetlight.svg", "Flickering streetlight beside a park entrance")],
    status: "in_progress",
    priority: "medium",
    assignedContractorId: "user-suresh",
    createdAt: ago(28),
    updatedAt: ago(4),
    history: [
      history("h-0136-filed", "filed", "Ananya Rao", "citizen", 28, "Grievance filed"),
      history("h-0136-triaged", "triaged", "Ramesh Iyer", "staff", 22, "Priority set to medium"),
      history("h-0136-assigned", "assigned", "Ramesh Iyer", "staff", 10, "Patel Electrical Works selected for this work"),
      history("h-0136-progress", "in_progress", "Suresh Patel", "contractor", 4, "Work started")
    ]
  },
  {
    id: "NS-2026-0133",
    citizenId: "user-priya",
    categoryId: "sanitation",
    zone: ZONES[0],
    description: "The public bin beside the library is overflowing and waste has spread onto the pavement.",
    photos: [photo("/civic/waste.svg", "Overflowing public waste bin beside a library")],
    status: "resolved",
    priority: "low",
    assignedContractorId: "user-civicworks",
    createdAt: ago(110),
    updatedAt: ago(64),
    history: [
      history("h-0133-filed", "filed", "Priya Sharma", "citizen", 110, "Grievance filed"),
      history("h-0133-triaged", "triaged", "Ramesh Iyer", "staff", 102, "Priority set to low"),
      history("h-0133-assigned", "assigned", "Ramesh Iyer", "staff", 90, "CivicWorks Roads & Utilities selected for this work"),
      history("h-0133-progress", "in_progress", "Arjun Rao", "contractor", 72, "Work started"),
      history("h-0133-resolved", "resolved", "Arjun Rao", "contractor", 64, "Waste cleared and bin area cleaned.")
    ],
    resolution: {
      before: [photo("/civic/waste.svg", "Before: overflowing public waste bin")],
      after: [photo("/civic/waste-clean.svg", "After: cleared bin and clean pavement")],
      closingNotes: "The bin was emptied and the surrounding pavement was cleaned. Collection schedule was checked with the local team."
    }
  }
];

const bids: ContractorBid[] = [
  {
    id: "bid-0141-suresh",
    contractorId: "user-suresh",
    grievanceId: "NS-2026-0141",
    bidNotes: "I can inspect the fitting, replace the weatherproof driver if needed, and test the light after dusk. I cover Zone 2 and can attend today.",
    status: "submitted",
    createdAt: ago(6)
  },
  {
    id: "bid-0138-civicworks",
    contractorId: "user-civicworks",
    grievanceId: "NS-2026-0138",
    bidNotes: "Our road crew can make the edge safe, prepare the damaged section, and complete a compacted patch around the crossing.",
    status: "awarded",
    createdAt: ago(5)
  },
  {
    id: "bid-0133-civicworks",
    contractorId: "user-civicworks",
    grievanceId: "NS-2026-0133",
    bidNotes: "We can clear the public bin area and coordinate with the collection team for a same-day clean-up.",
    status: "awarded",
    createdAt: ago(78)
  },
  {
    id: "bid-0133-suresh",
    contractorId: "user-suresh",
    grievanceId: "NS-2026-0133",
    bidNotes: "Our field team can inspect the site and coordinate the disposal and pavement clean-up.",
    status: "rejected",
    createdAt: ago(77)
  }
];

export function createInitialData(): DemoData {
  // Relative timestamps are regenerated at reset, keeping the demo's SLA clock useful.
  return {
    users: users.map((user) => ({ ...user })),
    contractors: contractors.map((profile) => ({ ...profile, preferredZones: [...profile.preferredZones] })),
    grievances: grievances.map((grievance) => ({
      ...grievance,
      photos: grievance.photos.map((item) => ({ ...item })),
      history: grievance.history.map((entry) => ({ ...entry })),
      resolution: grievance.resolution ? {
        before: grievance.resolution.before.map((item) => ({ ...item })),
        after: grievance.resolution.after.map((item) => ({ ...item })),
        closingNotes: grievance.resolution.closingNotes
      } : undefined
    })),
    bids: bids.map((bid) => ({ ...bid }))
  };
}

export const DEMO_USER_ID: Record<"citizen" | "staff" | "contractor" | "admin", string> = {
  citizen: "user-priya",
  staff: "user-staff",
  contractor: "user-suresh",
  admin: "user-admin"
};

export const ROLE_COPY: Record<Role, { label: string; title: string; subtitle: string }> = {
  citizen: { label: "Citizen", title: "Citizen services", subtitle: "Report a local issue and follow its progress." },
  staff: { label: "Municipal staff", title: "Operations workspace", subtitle: "Triage reports and coordinate the next action." },
  contractor: { label: "Contractor", title: "Contractor workspace", subtitle: "Review eligible work and update your work orders." },
  admin: { label: "Admin", title: "Service administration", subtitle: "Review verification and monitor service health." }
};

export const makeHistoryEntry = (
  status: GrievanceStatus,
  user: DemoUser,
  notes: string,
  timestamp = inPast(new Date().toISOString())
): StatusHistoryEntry => ({
  id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  status,
  updatedBy: user.name,
  actorRole: user.role,
  timestamp,
  notes
});
