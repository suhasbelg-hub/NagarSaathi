"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CATEGORIES, DEMO_USER_ID, createInitialData, makeHistoryEntry } from "@/lib/mock-data";
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
  ToastMessage
} from "@/lib/types";

const DATA_KEY = "nagarsaathi.frontend-demo.v1";
const USER_KEY = "nagarsaathi.demo-user";

type ProfileInput = {
  businessName: string;
  licenseNumber: string;
  tradeCategoryId: string;
  preferredZones: string[];
};

type DemoContextValue = {
  data: DemoData;
  currentUser: DemoUser | null;
  role: Role | null;
  contractorProfile: ContractorProfile | null;
  ready: boolean;
  connection: "live" | "reconnecting";
  toasts: ToastMessage[];
  setCurrentUser: (id: string) => void;
  enterDemoRole: (role: Role) => void;
  clearSession: () => void;
  resetDemo: () => void;
  reconnectDemo: () => void;
  dismissToast: (id: string) => void;
  toast: (message: string, tone?: ToastMessage["tone"]) => void;
  registerDemoUser: (name: string, email: string, role: "citizen" | "contractor") => DemoUser;
  confirmUser: (id: string) => boolean;
  updateOwnName: (name: string) => void;
  createGrievance: (input: { categoryId: string; zone: string; description: string; photos: PhotoAsset[] }) => string;
  triageGrievance: (id: string, priority: Priority) => boolean;
  submitBid: (grievanceId: string, bidNotes: string) => { ok: boolean; bid?: ContractorBid; reason?: string };
  awardBid: (bidId: string) => { ok: boolean; reason?: string };
  rejectBid: (bidId: string) => boolean;
  startWork: (grievanceId: string) => boolean;
  submitFix: (grievanceId: string, before: PhotoAsset[], after: PhotoAsset[], closingNotes: string) => boolean;
  saveContractorProfile: (input: ProfileInput) => { ok: boolean; reason?: string };
  decideContractor: (profileId: string, decision: "approved" | "rejected", reason?: string) => boolean;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DemoData>(() => createInitialData());
  const [currentUserId, setCurrentUserId] = useState("");
  const [ready, setReady] = useState(false);
  const [connection, setConnection] = useState<"live" | "reconnecting">("live");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      const storedData = window.localStorage.getItem(DATA_KEY);
      const storedUser = window.sessionStorage.getItem(USER_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData) as DemoData;
        if (parsed && Array.isArray(parsed.grievances) && Array.isArray(parsed.users)) setData(parsed);
      }
      if (storedUser) setCurrentUserId(storedUser);
    } catch {
      window.localStorage.removeItem(DATA_KEY);
      window.sessionStorage.removeItem(USER_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
    } catch {
      // Large user uploads stay in the current session if browser storage is full.
    }
  }, [data, ready]);

  useEffect(() => {
    if (!ready) return;
    if (currentUserId) window.sessionStorage.setItem(USER_KEY, currentUserId);
    else window.sessionStorage.removeItem(USER_KEY);
  }, [currentUserId, ready]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DATA_KEY || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue) as DemoData;
        if (next && Array.isArray(next.grievances) && Array.isArray(next.users)) setData(next);
      } catch {
        // Ignore malformed local demo updates and keep the last usable state.
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const currentUser = data.users.find((item) => item.id === currentUserId) ?? null;
  const role = currentUser?.role ?? null;
  const contractorProfile = data.contractors.find((item) => item.userId === currentUserId) ?? null;

  const toast = useCallback((message: string, tone: ToastMessage["tone"] = "success") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), tone === "error" ? 8000 : 5000);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((items) => items.filter((item) => item.id !== id)), []);

  const setCurrentUser = useCallback((id: string) => {
    setCurrentUserId(id);
    window.sessionStorage.setItem(USER_KEY, id);
  }, []);

  const enterDemoRole = useCallback((selectedRole: Role) => {
    setCurrentUser(DEMO_USER_ID[selectedRole]);
  }, [setCurrentUser]);

  const clearSession = useCallback(() => {
    setCurrentUserId("");
    window.sessionStorage.removeItem(USER_KEY);
  }, []);

  const resetDemo = useCallback(() => {
    setData(createInitialData());
    const id = role ? DEMO_USER_ID[role] : "";
    setCurrentUserId(id);
    if (id) window.sessionStorage.setItem(USER_KEY, id);
    else window.sessionStorage.removeItem(USER_KEY);
    setConnection("live");
    setToasts([]);
  }, [role]);

  const reconnectDemo = useCallback(() => {
    if (connection === "reconnecting") return;
    setConnection("reconnecting");
    toast("Demo connection interrupted. Updates will resume shortly.", "info");
    window.setTimeout(() => {
      setConnection("live");
      toast("Connection restored. Your view is up to date.", "success");
    }, 3200);
  }, [connection, toast]);

  const registerDemoUser = useCallback((name: string, email: string, selectedRole: "citizen" | "contractor") => {
    const user: DemoUser = {
      id: `user-demo-${Date.now()}`,
      name,
      email,
      role: selectedRole,
      confirmedAt: null,
      createdAt: new Date().toISOString()
    };
    setData((previous) => ({ ...previous, users: [user, ...previous.users] }));
    return user;
  }, []);

  const confirmUser = useCallback((id: string) => {
    const target = data.users.find((item) => item.id === id);
    if (!target) return false;
    const confirmedAt = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      users: previous.users.map((item) => item.id === id ? { ...item, confirmedAt } : item)
    }));
    setCurrentUser(id);
    toast("Email verified in the demo. You can now continue to your workspace.");
    return true;
  }, [data.users, setCurrentUser, toast]);

  const updateOwnName = useCallback((name: string) => {
    if (!currentUser) return;
    setData((previous) => ({
      ...previous,
      users: previous.users.map((item) => item.id === currentUser.id ? { ...item, name } : item)
    }));
    toast("Your name has been updated.");
  }, [currentUser, toast]);

  const createGrievance = useCallback((input: { categoryId: string; zone: string; description: string; photos: PhotoAsset[] }) => {
    if (!currentUser) return "";
    const nextNumber = Math.max(144, ...data.grievances.map((item) => Number(item.id.split("-").at(-1)) || 0)) + 1;
    const id = `NS-2026-${String(nextNumber).padStart(4, "0")}`;
    const now = new Date().toISOString();
    const grievance: Grievance = {
      id,
      citizenId: currentUser.id,
      categoryId: input.categoryId,
      zone: input.zone,
      description: input.description.trim(),
      photos: input.photos,
      status: "filed",
      priority: null,
      assignedContractorId: null,
      createdAt: now,
      updatedAt: now,
      history: [makeHistoryEntry("filed", currentUser, "Grievance filed")]
    };
    setData((previous) => ({ ...previous, grievances: [grievance, ...previous.grievances] }));
    return id;
  }, [currentUser, data.grievances]);

  const triageGrievance = useCallback((id: string, priority: Priority) => {
    if (!currentUser || currentUser.role !== "staff") return false;
    const target = data.grievances.find((item) => item.id === id);
    if (!target || target.status !== "filed") return false;
    setData((previous) => ({
      ...previous,
      grievances: previous.grievances.map((item) => item.id !== id ? item : {
        ...item,
        status: "triaged",
        priority,
        updatedAt: new Date().toISOString(),
        history: [...item.history, makeHistoryEntry("triaged", currentUser, `Priority set to ${priority}; ready for eligible contractor bids.`)]
      })
    }));
    toast("Grievance moved to Triaged. Matching contractors can now review it.");
    return true;
  }, [currentUser, data.grievances, toast]);

  const submitBid = useCallback((grievanceId: string, bidNotes: string) => {
    if (!currentUser || currentUser.role !== "contractor") return { ok: false, reason: "Sign in as a contractor to submit a bid." };
    const profile = data.contractors.find((item) => item.userId === currentUser.id);
    const grievance = data.grievances.find((item) => item.id === grievanceId);
    if (!profile || profile.status !== "approved") return { ok: false, reason: "Your contractor profile must be approved before you can bid." };
    if (!grievance || grievance.status !== "triaged") return { ok: false, reason: "This opportunity is no longer open for bids." };
    const category = CATEGORIES.find((item) => item.id === grievance.categoryId);
    if (profile.tradeCategoryId !== grievance.categoryId || !profile.preferredZones.includes(grievance.zone)) {
      return { ok: false, reason: `This grievance is not in your ${category?.name ?? "trade"} and preferred zones.` };
    }
    if (data.bids.some((item) => item.grievanceId === grievanceId && item.contractorId === profile.id)) {
      return { ok: false, reason: "You have already submitted a bid for this grievance." };
    }
    const bid: ContractorBid = {
      id: `bid-${Date.now()}`,
      contractorId: profile.id,
      grievanceId,
      bidNotes: bidNotes.trim(),
      status: "submitted",
      createdAt: new Date().toISOString()
    };
    setData((previous) => ({ ...previous, bids: [bid, ...previous.bids] }));
    toast("Bid submitted. You can follow its status in My bids.");
    return { ok: true, bid };
  }, [currentUser, data.bids, data.contractors, data.grievances, toast]);

  const awardBid = useCallback((bidId: string) => {
    if (!currentUser || currentUser.role !== "staff") return { ok: false, reason: "Only municipal staff can award a bid in this demo." };
    const bid = data.bids.find((item) => item.id === bidId);
    const grievance = bid ? data.grievances.find((item) => item.id === bid.grievanceId) : undefined;
    if (!bid || bid.status !== "submitted" || !grievance || grievance.status !== "triaged") {
      return { ok: false, reason: "This grievance or bid has changed. Review the latest state before deciding." };
    }
    const contractor = data.contractors.find((item) => item.id === bid.contractorId);
    setData((previous) => ({
      ...previous,
      bids: previous.bids.map((item) => item.grievanceId === bid.grievanceId && item.status === "submitted"
        ? { ...item, status: item.id === bidId ? "awarded" : "rejected" }
        : item),
      grievances: previous.grievances.map((item) => item.id === grievance.id ? {
        ...item,
        status: "assigned",
        assignedContractorId: bid.contractorId,
        updatedAt: new Date().toISOString(),
        history: [...item.history, makeHistoryEntry("assigned", currentUser, `${contractor?.businessName ?? "Selected contractor"} was selected for this work. Other submitted bids were rejected.`)]
      } : item)
    }));
    toast(`${contractor?.businessName ?? "Contractor"} selected. Other submitted bids were rejected.`);
    return { ok: true };
  }, [currentUser, data.bids, data.contractors, data.grievances, toast]);

  const rejectBid = useCallback((bidId: string) => {
    if (!currentUser || currentUser.role !== "staff") return false;
    const target = data.bids.find((item) => item.id === bidId);
    if (!target || target.status !== "submitted") return false;
    setData((previous) => ({
      ...previous,
      bids: previous.bids.map((item) => item.id === bidId ? { ...item, status: "rejected" } : item)
    }));
    toast("Bid rejected. The grievance remains Triaged.", "info");
    return true;
  }, [currentUser, data.bids, toast]);

  const startWork = useCallback((grievanceId: string) => {
    if (!currentUser || currentUser.role !== "contractor") return false;
    const item = data.grievances.find((grievance) => grievance.id === grievanceId);
    if (!item || item.status !== "assigned" || item.assignedContractorId !== currentUser.id) return false;
    setData((previous) => ({
      ...previous,
      grievances: previous.grievances.map((grievance) => grievance.id === grievanceId ? {
        ...grievance,
        status: "in_progress",
        updatedAt: new Date().toISOString(),
        history: [...grievance.history, makeHistoryEntry("in_progress", currentUser, "Work started by the assigned contractor.")]
      } : grievance)
    }));
    toast("Work started. The citizen can now see that work is in progress.");
    return true;
  }, [currentUser, data.grievances, toast]);

  const submitFix = useCallback((grievanceId: string, before: PhotoAsset[], after: PhotoAsset[], closingNotes: string) => {
    if (!currentUser || currentUser.role !== "contractor") return false;
    const item = data.grievances.find((grievance) => grievance.id === grievanceId);
    if (!item || item.status !== "in_progress" || item.assignedContractorId !== currentUser.id) return false;
    setData((previous) => ({
      ...previous,
      grievances: previous.grievances.map((grievance) => grievance.id === grievanceId ? {
        ...grievance,
        status: "resolved",
        updatedAt: new Date().toISOString(),
        resolution: { before, after, closingNotes: closingNotes.trim() },
        history: [...grievance.history, makeHistoryEntry("resolved", currentUser, closingNotes.trim())]
      } : grievance)
    }));
    toast("Fix confirmation submitted. Resolution proof is now available to the citizen.");
    return true;
  }, [currentUser, data.grievances, toast]);

  const saveContractorProfile = useCallback((input: ProfileInput) => {
    if (!currentUser || currentUser.role !== "contractor") return { ok: false, reason: "Only a contractor can edit this profile." };
    const duplicate = data.contractors.find((item) => item.licenseNumber.toLowerCase() === input.licenseNumber.trim().toLowerCase() && item.userId !== currentUser.id);
    if (duplicate) return { ok: false, reason: "That license number is already on another demo profile." };
    const existing = data.contractors.find((item) => item.userId === currentUser.id);
    const profile: ContractorProfile = {
      id: currentUser.id,
      userId: currentUser.id,
      businessName: input.businessName.trim(),
      licenseNumber: input.licenseNumber.trim().toUpperCase(),
      tradeCategoryId: input.tradeCategoryId,
      preferredZones: input.preferredZones,
      status: "pending",
      rejectionReason: null,
      approvedBy: null,
      approvedAt: null,
      submittedAt: new Date().toISOString()
    };
    setData((previous) => ({
      ...previous,
      contractors: existing
        ? previous.contractors.map((item) => item.userId === currentUser.id ? profile : item)
        : [profile, ...previous.contractors]
    }));
    toast("Profile submitted. Opportunities remain locked until verification is complete.");
    return { ok: true };
  }, [currentUser, data.contractors, toast]);

  const decideContractor = useCallback((profileId: string, decision: "approved" | "rejected", reason = "") => {
    if (!currentUser || currentUser.role !== "admin") return false;
    const profile = data.contractors.find((item) => item.id === profileId);
    if (!profile || profile.status !== "pending") return false;
    setData((previous) => ({
      ...previous,
      contractors: previous.contractors.map((item) => item.id === profileId ? {
        ...item,
        status: decision,
        rejectionReason: decision === "rejected" ? reason.trim() : null,
        approvedBy: decision === "approved" ? currentUser.id : null,
        approvedAt: decision === "approved" ? new Date().toISOString() : null
      } : item)
    }));
    toast(decision === "approved" ? `${profile.businessName} is now approved.` : `${profile.businessName} was rejected with a recorded reason.`, decision === "approved" ? "success" : "info");
    return true;
  }, [currentUser, data.contractors, toast]);

  const value = useMemo<DemoContextValue>(() => ({
    data, currentUser, role, contractorProfile, ready, connection, toasts,
    setCurrentUser, enterDemoRole, clearSession, resetDemo, reconnectDemo, dismissToast, toast,
    registerDemoUser, confirmUser, updateOwnName, createGrievance, triageGrievance, submitBid, awardBid,
    rejectBid, startWork, submitFix, saveContractorProfile, decideContractor
  }), [
    data, currentUser, role, contractorProfile, ready, connection, toasts,
    setCurrentUser, enterDemoRole, clearSession, resetDemo, reconnectDemo, dismissToast, toast,
    registerDemoUser, confirmUser, updateOwnName, createGrievance, triageGrievance, submitBid, awardBid,
    rejectBid, startWork, submitFix, saveContractorProfile, decideContractor
  ]);

  return <DemoContext.Provider value={value}>{children}<ToastRegion /></DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}

function ToastRegion() {
  const { toasts, dismissToast } = useDemo();
  return (
    <div className="toast-region" aria-label="Notifications" aria-live="polite" aria-relevant="additions">
      {toasts.map((item) => (
        <div className={`toast toast-${item.tone}`} key={item.id} role={item.tone === "error" ? "alert" : "status"}>
          <span className="toast-mark" aria-hidden="true">{item.tone === "success" ? "✓" : item.tone === "error" ? "!" : "i"}</span>
          <p>{item.message}</p>
          <button type="button" aria-label="Dismiss notification" className="toast-close" onClick={() => dismissToast(item.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
