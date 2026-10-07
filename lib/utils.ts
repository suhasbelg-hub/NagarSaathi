import { CATEGORIES, SLA_HOURS, STATUS_ORDER } from "@/lib/mock-data";
import type { Grievance, GrievanceStatus, Priority } from "@/lib/types";

export const categoryName = (id: string) => CATEGORIES.find((item) => item.id === id)?.name ?? "Civic issue";
export const statusLabel = (status: GrievanceStatus) => ({
  filed: "Filed",
  triaged: "Triaged",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved"
}[status]);

export const priorityLabel = (priority: Priority | null) => priority ? `${priority[0].toUpperCase()}${priority.slice(1)}` : "Not set";

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata"
  }).format(date);
}

export function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(value);
}

export function slaDeadline(createdAt: string, priority: Priority | null) {
  const hours = priority ? SLA_HOURS[priority] : SLA_HOURS.null;
  return new Date(new Date(createdAt).getTime() + hours * 60 * 60 * 1000);
}

export function slaHours(priority: Priority | null) {
  return priority ? SLA_HOURS[priority] : SLA_HOURS.null;
}

export function nextOwner(grievance: Grievance) {
  if (grievance.status === "filed") return "Municipal staff";
  if (grievance.status === "triaged") return "Eligible contractors";
  if (grievance.status === "assigned") return "Assigned contractor";
  if (grievance.status === "in_progress") return "Assigned contractor";
  return "Completed";
}

export function nextAction(grievance: Grievance) {
  if (grievance.status === "filed") return "Municipal staff will review your report and set a priority.";
  if (grievance.status === "triaged") return "Eligible contractors can review this work and submit bids.";
  if (grievance.status === "assigned") return "The selected contractor is expected to start work.";
  if (grievance.status === "in_progress") return "The contractor is working on the issue and will submit completion proof.";
  return "Resolution proof is available below.";
}

export function statusIndex(status: GrievanceStatus) {
  return STATUS_ORDER.indexOf(status);
}

export function formatDuration(hours: number | null) {
  if (hours === null || !Number.isFinite(hours)) return "Not enough data yet";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const wholeHours = Math.floor(hours);
  const days = Math.floor(wholeHours / 24);
  const rest = wholeHours % 24;
  if (days > 0) return `${days}d ${rest}h`;
  return `${wholeHours}h ${Math.round((hours - wholeHours) * 60)}m`;
}

export function shortRef(id: string) {
  return id.replace("NS-2026-", "#");
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "NS";
}
