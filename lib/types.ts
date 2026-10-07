export type Role = "citizen" | "staff" | "contractor" | "admin";
export type GrievanceStatus = "filed" | "triaged" | "assigned" | "in_progress" | "resolved";
export type Priority = "low" | "medium" | "high" | "critical";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type BidStatus = "submitted" | "awarded" | "rejected";

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Zone {
  name: string;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  confirmedAt: string | null;
  createdAt: string;
}

export interface PhotoAsset {
  src: string;
  label: string;
}

export interface StatusHistoryEntry {
  id: string;
  status: GrievanceStatus;
  updatedBy: string;
  actorRole: Role;
  timestamp: string;
  notes: string;
}

export interface ResolutionProof {
  before: PhotoAsset[];
  after: PhotoAsset[];
  closingNotes: string;
}

export interface Grievance {
  id: string;
  citizenId: string;
  categoryId: string;
  zone: string;
  description: string;
  photos: PhotoAsset[];
  status: GrievanceStatus;
  priority: Priority | null;
  assignedContractorId: string | null;
  createdAt: string;
  updatedAt: string;
  history: StatusHistoryEntry[];
  resolution?: ResolutionProof;
}

export interface ContractorProfile {
  id: string;
  userId: string;
  businessName: string;
  licenseNumber: string;
  tradeCategoryId: string;
  preferredZones: string[];
  status: VerificationStatus;
  rejectionReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  submittedAt: string;
}

export interface ContractorBid {
  id: string;
  contractorId: string;
  grievanceId: string;
  bidNotes: string;
  status: BidStatus;
  createdAt: string;
}

export interface DemoData {
  users: DemoUser[];
  grievances: Grievance[];
  contractors: ContractorProfile[];
  bids: ContractorBid[];
}

export interface ToastMessage {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
}
