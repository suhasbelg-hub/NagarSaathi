"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Hammer,
  ImagePlus,
  UserCheck,
  X
} from "lucide-react";
import type { Grievance, GrievanceStatus, Priority, Role, VerificationStatus, BidStatus, PhotoAsset } from "@/lib/types";
import { formatDate, formatDuration, relativeTime, slaDeadline, statusLabel } from "@/lib/utils";

const STATUS_META: Record<GrievanceStatus, { icon: React.ElementType; tone: string }> = {
  filed: { icon: FileText, tone: "filed" },
  triaged: { icon: ClipboardCheck, tone: "triaged" },
  assigned: { icon: UserCheck, tone: "assigned" },
  in_progress: { icon: Hammer, tone: "in-progress" },
  resolved: { icon: CheckCircle2, tone: "resolved" }
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  disabled,
  type = "button",
  onClick,
  ariaLabel,
  icon: Icon
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "lg" | "md" | "sm";
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
  icon?: React.ElementType;
}) {
  return (
    <button
      type={type}
      className={`button button-${variant} button-${size} ${className}`.trim()}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {loading ? <span className="button-spinner" aria-hidden="true" /> : Icon ? <Icon size={18} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

export function StatusBadge({ status, small = false }: { status: GrievanceStatus; small?: boolean }) {
  const { icon: Icon, tone } = STATUS_META[status];
  return <span className={`status-badge tone-${tone} ${small ? "badge-small" : ""}`}>
    <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
    <span>{statusLabel(status)}</span>
  </span>;
}

export function PriorityChip({ priority }: { priority: Priority | null }) {
  if (!priority) return <span className="priority-chip priority-none">Priority not set</span>;
  return <span className={`priority-chip priority-${priority}`}><span className="priority-dot" aria-hidden="true" />{priority[0].toUpperCase() + priority.slice(1)}</span>;
}

export function BidStatusBadge({ status }: { status: BidStatus }) {
  const label = status[0].toUpperCase() + status.slice(1);
  return <span className={`mini-badge bid-${status}`}><span className="badge-dot" aria-hidden="true" />{label}</span>;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const icon = status === "approved" ? <CheckCircle2 size={14} /> : status === "rejected" ? <X size={14} /> : <AlarmClock size={14} />;
  return <span className={`mini-badge verification-${status}`}>{icon}<span>{status[0].toUpperCase() + status.slice(1)}</span></span>;
}

export function Card({ children, className = "", as = "section" }: { children: React.ReactNode; className?: string; as?: "section" | "article" | "div" }) {
  const Tag = as;
  return <Tag className={`card ${className}`.trim()}>{children}</Tag>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className = ""
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return <div className={`page-header ${className}`}>
    <div>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 tabIndex={-1}>{title}</h1>
      {description ? <p className="page-description">{description}</p> : null}
    </div>
    {action ? <div className="page-header-action">{action}</div> : null}
  </div>;
}

export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="section-heading">
    <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
    {action ? <div className="section-action">{action}</div> : null}
  </div>;
}

export function StatCard({ label, value, note, icon: Icon, tone = "teal", tabular = true }: {
  label: string;
  value: React.ReactNode;
  note?: string;
  icon: React.ElementType;
  tone?: "teal" | "slate" | "amber" | "rose" | "blue" | "emerald";
  tabular?: boolean;
}) {
  return <Card className="stat-card">
    <div className={`stat-icon stat-${tone}`}><Icon size={19} aria-hidden="true" /></div>
    <div className="stat-value-wrap"><p className="stat-label">{label}</p><p className={`stat-value ${tabular ? "tabular" : ""}`}>{value}</p>{note ? <p className="stat-note">{note}</p> : null}</div>
  </Card>;
}

export function EmptyState({
  title,
  description,
  icon: Icon = FileText,
  action,
  compact = false
}: {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return <div className={`empty-state ${compact ? "empty-compact" : ""}`}>
    <div className="empty-illustration" aria-hidden="true"><Icon size={25} strokeWidth={1.7} /></div>
    <h3>{title}</h3>
    <p>{description}</p>
    {action ? <div className="empty-action">{action}</div> : null}
  </div>;
}

export function ErrorState({ onRetry, title = "We couldn’t load this view", message = "Your work is safe. Check your connection and try again." }: {
  onRetry?: () => void;
  title?: string;
  message?: string;
}) {
  return <div className="error-state" role="alert">
    <div className="error-icon" aria-hidden="true">!</div>
    <div><h3>{title}</h3><p>{message}</p></div>
    {onRetry ? <Button variant="outline" onClick={onRetry}>Try again</Button> : null}
  </div>;
}

export function Skeleton({ className = "", width }: { className?: string; width?: string }) {
  return <span className={`skeleton ${className}`} style={width ? { width } : undefined} aria-hidden="true" />;
}

export function SkeletonRows({ count = 4, cards = false }: { count?: number; cards?: boolean }) {
  return <div className={`skeleton-list ${cards ? "skeleton-cards" : ""}`} aria-label="Loading content" role="status">
    <span className="sr-only">Loading content</span>
    {Array.from({ length: count }, (_, index) => <div className="skeleton-row" key={index}>
      <Skeleton className="skeleton-circle" />
      <div className="skeleton-lines"><Skeleton width="38%" /><Skeleton width="66%" /></div>
      <Skeleton className="skeleton-end" width="16%" />
    </div>)}
  </div>;
}

export function Field({ label, required, hint, error, children, id }: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  id: string;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined;
  return <div className={`field ${error ? "field-invalid" : ""}`}>
    <label htmlFor={id} className="field-label">{label}{required ? <span className="required-label"> · Required</span> : null}</label>
    {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      id,
      "aria-describedby": describedBy,
      "aria-invalid": error ? true : undefined
    }) : children}
    {hint ? <p id={hintId} className="field-hint">{hint}</p> : null}
    {error ? <p id={errorId} className="field-error"><span aria-hidden="true">!</span>{error}</p> : null}
  </div>;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md"
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const generatedId = useId();
  const titleId = `dialog-title-${generatedId.replace(/:/g, "")}`;
  const descriptionId = `${titleId}-description`;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog
    ref={dialogRef}
    className={`dialog dialog-${size}`}
    aria-labelledby={titleId}
    aria-describedby={description ? descriptionId : undefined}
    onClose={() => onOpenChange(false)}
    onClick={(event) => {
      if (event.target === dialogRef.current) onOpenChange(false);
    }}
  >
    <div className="dialog-inner">
      <div className="dialog-heading"><div><h2 id={titleId}>{title}</h2>{description ? <p id={descriptionId}>{description}</p> : null}</div>
        <button type="button" className="icon-button dialog-close" onClick={() => onOpenChange(false)} aria-label="Close dialog"><X size={18} /></button>
      </div>
      <div className="dialog-content">{children}</div>
    </div>
  </dialog>;
}

export function Tabs({ tabs, value, onChange, label }: { tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (value: string) => void; label: string }) {
  return <div className="tabs" role="tablist" aria-label={label}>
    {tabs.map((tab, index) => <button type="button" role="tab" aria-selected={value === tab.id} tabIndex={value === tab.id ? 0 : -1} className={`tab ${value === tab.id ? "tab-active" : ""}`} key={tab.id} onClick={() => onChange(tab.id)} onKeyDown={(event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      onChange(tabs[nextIndex].id);
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role='tab']")[nextIndex]?.focus();
    }}>
      {tab.label}{tab.count !== undefined ? <span className="tab-count">{tab.count}</span> : null}
    </button>)}
  </div>;
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return <span className={`avatar avatar-${size}`} aria-hidden="true">{initials || "NS"}</span>;
}

export function SlaCountdown({ grievance, compact = false }: { grievance: Grievance; compact?: boolean }) {
  const deadline = useMemo(() => slaDeadline(grievance.createdAt, grievance.priority), [grievance.createdAt, grievance.priority]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (grievance.status === "resolved") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [grievance.status]);
  if (grievance.status === "resolved") {
    const resolvedAt = grievance.history.find((entry) => entry.status === "resolved")?.timestamp;
    const onTime = resolvedAt ? new Date(resolvedAt).getTime() <= deadline.getTime() : true;
    return <span className={`sla-resolved ${compact ? "sla-compact" : ""}`}><CheckCircle2 size={14} aria-hidden="true" />{onTime ? "Within SLA" : "Resolved after SLA"}</span>;
  }
  const delta = deadline.getTime() - now;
  const total = Math.max(1, deadline.getTime() - new Date(grievance.createdAt).getTime());
  const ratio = Math.max(0, delta) / total;
  const overdue = delta <= 0;
  const urgent = ratio <= 0.2;
  const caution = ratio <= 0.5;
  const urgencyBand = overdue ? "overdue" : urgent ? "critical" : caution ? "approaching" : "on track";
  const abs = Math.abs(delta);
  const hours = Math.floor(abs / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);
  const value = hours > 0 ? `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m` : `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  const accessibleLabel = `SLA ${urgencyBand}. Deadline ${formatDate(deadline.toISOString(), true)} IST.`;
  return <span className={`sla-countdown ${overdue ? "sla-overdue" : urgent ? "sla-urgent" : caution ? "sla-caution" : "sla-healthy"} ${compact ? "sla-compact" : ""}`} title={`Deadline: ${formatDate(deadline.toISOString(), true)}`}>
    <AlarmClock size={14} aria-hidden="true" />
    {overdue ? <span className="sla-overdue-label">Overdue · </span> : null}
    <span className="tabular" aria-hidden="true">{value}</span>
    <span className="sr-only" aria-live="polite" aria-atomic="true">{accessibleLabel}</span>
  </span>;
}

export function StatusTimeline({ grievance }: { grievance: Grievance }) {
  const currentIndex = ["filed", "triaged", "assigned", "in_progress", "resolved"].indexOf(grievance.status);
  const [expanded, setExpanded] = useState<string | null>(grievance.status);
  const historyByStatus = new Map(grievance.history.map((entry) => [entry.status, entry]));
  const statuses: GrievanceStatus[] = ["filed", "triaged", "assigned", "in_progress", "resolved"];
  return <div className="timeline" aria-label="Grievance status timeline" aria-live="polite">
    {statuses.map((status, index) => {
      const entry = historyByStatus.get(status);
      const complete = index < currentIndex || status === "resolved" && grievance.status === "resolved";
      const current = index === currentIndex;
      return <div className={`timeline-step ${complete ? "timeline-complete" : ""} ${current ? "timeline-current" : ""} ${!entry ? "timeline-upcoming" : ""}`} key={status}>
        <div className="timeline-rail" aria-hidden="true"><span className="timeline-node">{complete ? <CheckCircle2 size={15} /> : <span />}</span></div>
        <div className="timeline-content">
          {entry ? <button type="button" className="timeline-trigger" aria-expanded={expanded === status} onClick={() => setExpanded(expanded === status ? null : status)}>
            <span className="timeline-main"><StatusBadge status={status} small /><span className="timeline-meta">{relativeTime(entry.timestamp)} · {entry.actorRole === "staff" ? "Municipal staff" : entry.actorRole[0].toUpperCase() + entry.actorRole.slice(1)}</span></span>
            <span className={`timeline-chevron ${expanded === status ? "chevron-open" : ""}`} aria-hidden="true">⌄</span>
          </button> : <div className="timeline-ghost"><span>{statusLabel(status)}</span><span className="timeline-awaiting">Awaiting next step</span></div>}
          {entry && expanded === status ? <div className="timeline-expanded"><p>{entry.notes || "Status updated."}</p><time dateTime={entry.timestamp}>{formatDate(entry.timestamp, true)} IST</time></div> : null}
        </div>
      </div>;
    })}
  </div>;
}

export function PhotoGrid({ photos, label, columns = 3 }: { photos: PhotoAsset[]; label: string; columns?: 2 | 3 | 4 }) {
  const [activePhoto, setActivePhoto] = useState<PhotoAsset | null>(null);
  if (!photos.length) return <p className="small-muted">No photos attached.</p>;
  return <>
    <div className={`photo-grid photo-grid-${columns}`} aria-label={label}>
      {photos.map((item, index) => <button type="button" className="photo-thumb" key={`${item.src}-${index}`} onClick={() => setActivePhoto(item)} aria-label={`Open ${item.label || `photo ${index + 1}`}`}>
        <img src={item.src} alt={item.label || `${label} ${index + 1}`} />
        <span className="photo-zoom" aria-hidden="true">↗</span>
      </button>)}
    </div>
    <Modal open={!!activePhoto} onOpenChange={(open) => !open && setActivePhoto(null)} title={activePhoto?.label ?? label} size="lg">
      {activePhoto ? <img src={activePhoto.src} alt={activePhoto.label} className="lightbox-image" /> : null}
    </Modal>
  </>;
}

export function SummaryOwner({ grievance }: { grievance: Grievance }) {
  const { status } = grievance;
  const owner = status === "resolved" ? "No further action" : status === "filed" ? "Municipal staff" : status === "triaged" ? "Eligible contractors" : "Assigned contractor";
  return <div className="owner-summary">
    <div className="owner-summary-icon"><UserCheck size={17} aria-hidden="true" /></div>
    <div><span>Next action</span><strong>{owner}</strong></div>
  </div>;
}

export function PrioritySelect({ value, onChange, id = "priority", disabled = false }: { value: Priority | ""; onChange: (value: Priority) => void; id?: string; disabled?: boolean }) {
  return <select id={id} className="control" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as Priority)}>
    <option value="" disabled>Select a priority</option>
    <option value="critical">Critical · 12 hours</option>
    <option value="high">High · 24 hours</option>
    <option value="medium">Medium · 48 hours</option>
    <option value="low">Low · 72 hours</option>
  </select>;
}

export function PhotoUploadHint({ max, min }: { max: number; min: number }) {
  return <p className="upload-hint"><ImagePlus size={14} aria-hidden="true" /> {min}–{max} photos · JPEG, PNG or WebP · up to 5 MB each</p>;
}

export function RoleBadge({ role }: { role: Role }) {
  const label = ({ citizen: "Citizen", staff: "Municipal staff", contractor: "Contractor", admin: "Admin" } as const)[role];
  return <span className="role-badge">{label}</span>;
}

export function Numeric({ value }: { value: string | number }) {
  return <span className="tabular">{value}</span>;
}

export function durationText(from: string, to: string) {
  const hours = (new Date(to).getTime() - new Date(from).getTime()) / 3600000;
  return formatDuration(Math.max(0, hours));
}
