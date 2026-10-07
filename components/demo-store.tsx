"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  ToastMessage,
} from "@/lib/types";

const USER_SESSION_KEY = "nagarsaathi.session-user-id";

type ProfileInput = {
  businessName: string;
  licenseNumber: string;
  tradeCategoryId: string;
  preferredZones: string[];
};

type AppContextValue = {
  data: DemoData;
  currentUser: DemoUser | null;
  role: Role | null;
  contractorProfile: ContractorProfile | null;
  ready: boolean;
  connection: "live" | "reconnecting";
  toasts: ToastMessage[];
  setCurrentUser: (id: string) => void;
  clearSession: () => void;
  refreshData: () => Promise<void>;
  dismissToast: (id: string) => void;
  toast: (message: string, tone?: ToastMessage["tone"]) => void;
  loginWithSupabase: (email: string, password?: string) => Promise<{ ok: boolean; user?: DemoUser; error?: string }>;
  registerWithSupabase: (name: string, email: string, password: string, role: "citizen" | "contractor") => Promise<{ ok: boolean; user?: DemoUser; error?: string }>;
  confirmUser: (id: string) => Promise<boolean>;
  updateOwnName: (name: string) => Promise<void>;
  createGrievance: (input: { categoryId: string; zone: string; description: string; photos: PhotoAsset[] }) => Promise<string>;
  triageGrievance: (id: string, priority: Priority) => Promise<boolean>;
  submitBid: (grievanceId: string, bidNotes: string) => Promise<{ ok: boolean; bid?: ContractorBid; reason?: string }>;
  awardBid: (bidId: string) => Promise<{ ok: boolean; reason?: string }>;
  rejectBid: (bidId: string) => Promise<boolean>;
  startWork: (grievanceId: string) => Promise<boolean>;
  submitFix: (grievanceId: string, before: PhotoAsset[], after: PhotoAsset[], closingNotes: string) => Promise<boolean>;
  saveContractorProfile: (input: ProfileInput) => Promise<{ ok: boolean; reason?: string }>;
  decideContractor: (profileId: string, decision: "approved" | "rejected", reason?: string) => Promise<boolean>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DemoData>({
    users: [],
    grievances: [],
    contractors: [],
    bids: [],
  });
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [connection] = useState<"live" | "reconnecting">("live");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((message: string, tone: ToastMessage["tone"] = "success") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), tone === "error" ? 8000 : 5000);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((items) => items.filter((item) => item.id !== id)), []);

  const fetchLiveData = useCallback(async () => {
    try {
      const res = await fetch("/api/bootstrap");
      const json = await res.json();
      if (json.ok && json.data) {
        setData({
          users: json.data.users || [],
          grievances: json.data.grievances || [],
          contractors: json.data.contractors || [],
          bids: json.data.bids || [],
        });
      }
    } catch (e) {
      console.error("Failed to fetch live database records:", e);
    }
  }, []);

  // Initialize from live database
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const storedUser = window.sessionStorage.getItem(USER_SESSION_KEY);
        if (storedUser) {
          setCurrentUserId(storedUser);
        }
        const res = await fetch("/api/bootstrap");
        const json = await res.json();
        if (active && json.ok && json.data) {
          setData({
            users: json.data.users || [],
            grievances: json.data.grievances || [],
            contractors: json.data.contractors || [],
            bids: json.data.bids || [],
          });
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        if (active) setReady(true);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (currentUserId) {
      window.sessionStorage.setItem(USER_SESSION_KEY, currentUserId);
    } else {
      window.sessionStorage.removeItem(USER_SESSION_KEY);
    }
  }, [currentUserId, ready]);

  const currentUser = data.users.find((item) => item.id === currentUserId) ?? null;
  const role = currentUser?.role ?? null;
  const contractorProfile = data.contractors.find((item) => item.userId === currentUserId) ?? null;

  const setCurrentUser = useCallback((id: string) => {
    setCurrentUserId(id);
    window.sessionStorage.setItem(USER_SESSION_KEY, id);
  }, []);

  const clearSession = useCallback(() => {
    setCurrentUserId("");
    window.sessionStorage.removeItem(USER_SESSION_KEY);
  }, []);

  const loginWithSupabase = useCallback(async (email: string, password?: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();
      if (!result.ok || !result.user) {
        return { ok: false, error: result.error || "Authentication failed" };
      }
      setCurrentUser(result.user.id);
      await fetchLiveData();
      return { ok: true, user: result.user };
    } catch (err: any) {
      return { ok: false, error: err.message || "Network error" };
    }
  }, [fetchLiveData, setCurrentUser]);

  const registerWithSupabase = useCallback(async (name: string, email: string, password: string, selectedRole: "citizen" | "contractor") => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: selectedRole }),
      });
      const result = await res.json();
      if (!result.ok || !result.user) {
        return { ok: false, error: result.error || "Registration failed" };
      }
      await fetchLiveData();
      return { ok: true, user: result.user };
    } catch (err: any) {
      return { ok: false, error: err.message || "Network error" };
    }
  }, [fetchLiveData]);

  const confirmUser = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      const result = await res.json();
      if (result.ok) {
        await fetchLiveData();
        setCurrentUser(id);
        toast("Email verified successfully. You can now access your workspace.");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchLiveData, setCurrentUser, toast]);

  const updateOwnName = useCallback(async (name: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, name }),
      });
      const result = await res.json();
      if (result.ok) {
        await fetchLiveData();
        toast("Your profile name has been updated in the database.");
      }
    } catch (e: any) {
      toast("Failed to update name: " + e.message, "error");
    }
  }, [currentUser, fetchLiveData, toast]);

  const createGrievance = useCallback(async (input: { categoryId: string; zone: string; description: string; photos: PhotoAsset[] }) => {
    if (!currentUser) return "";
    try {
      const res = await fetch("/api/grievances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citizen: currentUser,
          categoryId: input.categoryId,
          zone: input.zone,
          description: input.description,
          photos: input.photos,
        }),
      });
      const result = await res.json();
      if (result.ok && result.id) {
        await fetchLiveData();
        return result.id;
      }
      toast(result.error || "Failed to record grievance in database.", "error");
      return "";
    } catch (e: any) {
      toast(e.message || "Failed to submit grievance", "error");
      return "";
    }
  }, [currentUser, fetchLiveData, toast]);

  const triageGrievance = useCallback(async (id: string, priority: Priority) => {
    if (!currentUser || currentUser.role !== "staff") return false;
    try {
      const res = await fetch("/api/grievances/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, priority, staffUser: currentUser }),
      });
      const result = await res.json();
      if (result.ok) {
        await fetchLiveData();
        toast("Grievance triaged in database. Matching verified contractors can now inspect and bid.");
        return true;
      }
      toast(result.error || "Failed to triage grievance", "error");
      return false;
    } catch (e: any) {
      toast(e.message, "error");
      return false;
    }
  }, [currentUser, fetchLiveData, toast]);

  const submitBid = useCallback(async (grievanceId: string, bidNotes: string) => {
    if (!currentUser || currentUser.role !== "contractor") return { ok: false, reason: "Sign in as a contractor to submit a bid." };
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grievanceId, bidNotes, contractorUser: currentUser }),
      });
      const result = await res.json();
      if (result.ok) {
        await fetchLiveData();
        toast("Bid submitted to database. Follow its status in My bids.");
        return { ok: true, bid: { id: result.id, contractorId: currentUser.id, grievanceId, bidNotes, status: "submitted", createdAt: new Date().toISOString() } };
      }
      return { ok: false, reason: result.error || "Failed to submit bid." };
    } catch (e: any) {
      return { ok: false, reason: e.message };
    }
  }, [currentUser, fetchLiveData, toast]);

  const awardBid = useCallback(async (bidId: string) => {
    if (!currentUser || currentUser.role !== "staff") return { ok: false, reason: "Only municipal staff can award a bid." };
    try {
      const res = await fetch("/api/bids/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId, staffUser: currentUser }),
      });
      const result = await res.json();
      if (result.ok) {
        await fetchLiveData();
        toast("Contractor awarded work order in database. Other bids marked rejected.");
        return { ok: true };
      }
      return { ok: false, reason: result.error || "Failed to award bid." };
    } catch (e: any) {
      return { ok: false, reason: e.message };
    }
  }, [currentUser, fetchLiveData, toast]);

  const rejectBid = useCallback(async (bidId: string) => {
    if (!currentUser || currentUser.role !== "staff") return false;
    try {
      const res = await fetch("/api/bids/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId }),
      });
      const result = await res.json();
      if (result.ok) {
        await fetchLiveData();
        toast("Bid rejected in database.", "info");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [currentUser, fetchLiveData, toast]);

  const startWork = useCallback(async (grievanceId: string) => {
    if (!currentUser || currentUser.role !== "contractor") return false;
    try {
      const res = await fetch("/api/work/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grievanceId, contractorUser: currentUser }),
      });
      const result = await res.json();
      if (result.ok) {
        await fetchLiveData();
        toast("Work started. Status updated to In Progress in database.");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [currentUser, fetchLiveData, toast]);

  const submitFix = useCallback(async (grievanceId: string, before: PhotoAsset[], after: PhotoAsset[], closingNotes: string) => {
    if (!currentUser || currentUser.role !== "contractor") return false;
    try {
      const res = await fetch("/api/work/submit-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grievanceId, before, after, closingNotes, contractorUser: currentUser }),
      });
      const result = await res.json();
      if (result.ok) {
        await fetchLiveData();
        toast("Fix confirmation submitted to database. Proof is now permanently recorded.");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [currentUser, fetchLiveData, toast]);

  const saveContractorProfile = useCallback(async (input: ProfileInput) => {
    if (!currentUser || currentUser.role !== "contractor") return { ok: false, reason: "Only a contractor can edit this profile." };
    try {
      const res = await fetch("/api/contractors/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, contractorUser: currentUser }),
      });
      const result = await res.json();
      if (result.ok) {
        await fetchLiveData();
        toast("Contractor profile saved to database for verification.");
        return { ok: true };
      }
      return { ok: false, reason: result.error || "Failed to save profile." };
    } catch (e: any) {
      return { ok: false, reason: e.message };
    }
  }, [currentUser, fetchLiveData, toast]);

  const decideContractor = useCallback(async (profileId: string, decision: "approved" | "rejected", reason = "") => {
    if (!currentUser || currentUser.role !== "admin") return false;
    try {
      const res = await fetch("/api/contractors/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, decision, reason, adminUser: currentUser }),
      });
      const result = await res.json();
      if (result.ok) {
        await fetchLiveData();
        toast(decision === "approved" ? "Contractor profile approved in database." : "Contractor profile rejected in database.", decision === "approved" ? "success" : "info");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [currentUser, fetchLiveData, toast]);

  const value = useMemo<AppContextValue>(() => ({
    data,
    currentUser,
    role,
    contractorProfile,
    ready,
    connection,
    toasts,
    setCurrentUser,
    clearSession,
    refreshData: fetchLiveData,
    dismissToast,
    toast,
    loginWithSupabase,
    registerWithSupabase,
    confirmUser,
    updateOwnName,
    createGrievance,
    triageGrievance,
    submitBid,
    awardBid,
    rejectBid,
    startWork,
    submitFix,
    saveContractorProfile,
    decideContractor,
  }), [
    data,
    currentUser,
    role,
    contractorProfile,
    ready,
    connection,
    toasts,
    setCurrentUser,
    clearSession,
    fetchLiveData,
    dismissToast,
    toast,
    loginWithSupabase,
    registerWithSupabase,
    confirmUser,
    updateOwnName,
    createGrievance,
    triageGrievance,
    submitBid,
    awardBid,
    rejectBid,
    startWork,
    submitFix,
    saveContractorProfile,
    decideContractor,
  ]);

  return <AppContext.Provider value={value}>{children}<ToastRegion /></AppContext.Provider>;
}

export function useDemo() {
  const context = useContext(AppContext);
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
