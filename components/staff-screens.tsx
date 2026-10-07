"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlarmClock,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { CATEGORIES, SLA_HOURS, STATUS_ORDER, ZONES } from "@/lib/mock-data";
import type { Grievance, GrievanceStatus, Priority } from "@/lib/types";
import { categoryName, formatDate, formatDuration, relativeTime, shortRef, slaDeadline } from "@/lib/utils";
import { useDemo } from "@/components/demo-store";
import { Avatar, BidStatusBadge, Button, Card, EmptyState, ErrorState, Field, Modal, PageHeader, PhotoGrid, PriorityChip, SectionHeading, SkeletonRows, SlaCountdown, StatusBadge, StatusTimeline, StatCard } from "@/components/ui";

const priorityValues: Priority[] = ["critical", "high", "medium", "low"];

export function StaffDashboard() {
  const { data } = useDemo();
  const [showError, setShowError] = useState(false);
  const statusCounts = STATUS_ORDER.map((status) => ({ status, count: data.grievances.filter((item) => item.status === status).length }));
  const overdue = data.grievances.filter((item) => item.status !== "resolved" && slaDeadline(item.createdAt, item.priority).getTime() < Date.now());
  const urgent = [...data.grievances].filter((item) => item.status !== "resolved").sort((a, b) => slaDeadline(a.createdAt, a.priority).getTime() - slaDeadline(b.createdAt, b.priority).getTime()).slice(0, 4);
  if (showError) return <div className="screen-stack"><PageHeader title="Operations overview" /><ErrorState title="The operations overview could not refresh" message="Your work is safe. Retry to return to the local demo view." onRetry={() => setShowError(false)} /></div>;
  return <div className="screen-stack">
    <PageHeader eyebrow="Municipal operations" title="Operations overview" description="See what needs attention and keep work moving through the queue." action={<Link href="/dashboard/staff/queue" className="button button-primary button-md">Open triage queue <ArrowRight size={16} /></Link>} />
    <section className="staff-overview-banner"><div className="overview-banner-icon"><Activity size={22} /></div><div><p className="eyebrow">Municipal service snapshot</p><h2>{overdue.length ? `${overdue.length} ${overdue.length === 1 ? "grievance is" : "grievances are"} past its SLA deadline.` : "Your queue is within its SLA windows."}</h2><p>Prioritise urgent work first. Every status change is reflected in the shared demo record.</p></div><div className="staff-banner-metric"><strong className="tabular">{overdue.length}</strong><span>Overdue</span></div></section>
    <section className="stat-grid staff-stats" aria-label="Grievance counts by status">
      {statusCounts.map(({ status, count }) => <div className={`status-metric-card status-metric-${status}`} key={status}><div><span className="status-metric-label">{status === "in_progress" ? "In progress" : status[0].toUpperCase() + status.slice(1)}</span><strong className="tabular">{count}</strong></div><span className="status-metric-track"><i style={{ width: `${data.grievances.length ? Math.max(10, count / data.grievances.length * 100) : 0}%` }} /></span></div>)}
    </section>
    <section>
      <SectionHeading title="SLA priority shortlist" description="Open the workbench to review the current owner, deadline and next action." action={<Link className="text-link-arrow" href="/dashboard/staff/queue">View queue <ArrowRight size={15} /></Link>} />
      {urgent.length ? <div className="urgent-list">{urgent.map((item) => <Link key={item.id} href={`/dashboard/staff/grievances/${item.id}`} className={`urgent-row ${slaDeadline(item.createdAt, item.priority).getTime() < Date.now() ? "urgent-row-overdue" : ""}`}>
        <span className="urgent-priority-icon"><AlarmClock size={17} /></span><span className="urgent-main"><strong>{categoryName(item.categoryId)}</strong><span>{item.id} · {item.zone}</span></span><StatusBadge status={item.status} small /><PriorityChip priority={item.priority} /><SlaCountdown grievance={item} compact /><ArrowRight size={16} className="card-arrow" />
      </Link>)}</div> : <Card><EmptyState title="No active grievances" description="New reports will appear here for triage." icon={CheckCircle2} compact /></Card>}
    </section>
    <button type="button" className="subtle-demo-action" onClick={() => setShowError(true)}>Preview a recoverable overview error</button>
  </div>;
}

function MultiFilter({ label, values, options, onToggle, onClear }: { label: string; values: string[]; options: string[]; onToggle: (value: string) => void; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); ref.current?.querySelector<HTMLButtonElement>("button")?.focus(); } };
    window.addEventListener("mousedown", outside);
    window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("mousedown", outside); window.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="multi-filter" ref={ref}>
    <button type="button" className={`filter-trigger ${values.length ? "filter-trigger-selected" : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>{label}{values.length ? <span className="filter-count">{values.length}</span> : null}<span className="filter-caret" aria-hidden="true">⌄</span></button>
    {open ? <div className="filter-popover" role="group" aria-label={`Filter by ${label.toLowerCase()}`}>
      <div className="filter-popover-head"><strong>{label}</strong><button type="button" className="text-button" onClick={onClear}>Clear</button></div>
      {options.map((option) => <label className="filter-option" key={option}><input type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} /><span>{option === "in_progress" ? "In Progress" : option[0].toUpperCase() + option.slice(1)}</span></label>)}
    </div> : null}
  </div>;
}

export function StaffQueue() {
  const { data } = useDemo();
  const [zones, setZones] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>(["filed", "triaged"]);
  const [sort, setSort] = useState("sla");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showError, setShowError] = useState(false);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [updateAnnouncement, setUpdateAnnouncement] = useState("");
  const [newGrievanceIds, setNewGrievanceIds] = useState<string[]>([]);
  const grievanceSignatureRef = React.useRef("");
  const highlightTimerRef = React.useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const signature = data.grievances.map((item) => `${item.id}:${item.status}:${item.updatedAt}`).join("|");
    if (grievanceSignatureRef.current && signature !== grievanceSignatureRef.current) {
      const previousIds = new Set(grievanceSignatureRef.current.split("|").map((item) => item.split(":")[0]));
      const newEntries = data.grievances.filter((item) => !previousIds.has(item.id));
      if (newEntries.length) {
        setUpdateAnnouncement("New grievance added to queue.");
        setNewGrievanceIds(newEntries.map((item) => item.id));
        if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = window.setTimeout(() => { setNewGrievanceIds([]); highlightTimerRef.current = null; }, 5000);
      } else setUpdateAnnouncement("Live update: grievance work or status has changed.");
    }
    grievanceSignatureRef.current = signature;
  }, [data.grievances]);

  useEffect(() => () => { if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current); }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.has("zone")) setZones(query.getAll("zone"));
    if (query.has("category")) setCategories(query.getAll("category"));
    if (query.has("priority")) setPriorities(query.getAll("priority"));
    if (query.has("status")) setStatuses(query.getAll("status"));
    if (query.has("sort")) setSort(query.get("sort") ?? "sla");
    setStateLoaded(true);
  }, []);

  useEffect(() => {
    if (!stateLoaded) return;
    const query = new URLSearchParams();
    zones.forEach((value) => query.append("zone", value));
    categories.forEach((value) => query.append("category", value));
    priorities.forEach((value) => query.append("priority", value));
    statuses.forEach((value) => query.append("status", value));
    if (sort !== "sla") query.set("sort", sort);
    const suffix = query.toString();
    window.history.replaceState(null, "", suffix ? `/dashboard/staff/queue?${suffix}` : "/dashboard/staff/queue");
  }, [zones, categories, priorities, statuses, sort, stateLoaded]);

  const filtered = useMemo(() => {
    const result = data.grievances.filter((item) => {
      if (statuses.length && !statuses.includes(item.status)) return false;
      if (zones.length && !zones.includes(item.zone)) return false;
      if (categories.length && !categories.includes(item.categoryId)) return false;
      if (priorities.length && (!item.priority || !priorities.includes(item.priority))) return false;
      if (debouncedSearch && !item.description.toLowerCase().includes(debouncedSearch) && !item.id.toLowerCase().includes(debouncedSearch)) return false;
      return true;
    });
    const sorted = [...result];
    if (sort === "newest") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === "oldest") sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    else sorted.sort((a, b) => {
      const aActive = a.status !== "resolved";
      const bActive = b.status !== "resolved";
      const aDeadline = slaDeadline(a.createdAt, a.priority).getTime();
      const bDeadline = slaDeadline(b.createdAt, b.priority).getTime();
      const aOverdue = aActive && aDeadline < Date.now();
      const bOverdue = bActive && bDeadline < Date.now();
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (aActive !== bActive) return aActive ? -1 : 1;
      return aDeadline - bDeadline;
    });
    return sorted;
  }, [data.grievances, statuses, zones, categories, priorities, debouncedSearch, sort]);

  const toggle = (state: string[], setState: React.Dispatch<React.SetStateAction<string[]>>, value: string) => setState(state.includes(value) ? state.filter((item) => item !== value) : [...state, value]);
  const clear = () => { setZones([]); setCategories([]); setPriorities([]); setStatuses(["filed", "triaged"]); setSearch(""); setSort("sla"); };
  const defaultStatusesSelected = statuses.length === 2 && statuses.includes("filed") && statuses.includes("triaged");
  const filterCount = zones.length + categories.length + priorities.length + (defaultStatusesSelected ? 0 : 1);

  if (showError) return <div className="screen-stack"><PageHeader title="Triage queue" description="Filter by zone, category, priority and current status." /><ErrorState title="The queue could not be refreshed" message="Showing the recoverable demo state. Retry to return to the latest local data." onRetry={() => setShowError(false)} /></div>;

  return <div className="screen-stack">
    <PageHeader eyebrow="Municipal operations" title="Triage queue" description="Filter by zone, category, priority and status. SLA urgency is the default sort." action={<span className="queue-live-note"><span className="connection-dot" />Live demo queue</span>} />
    <span className="sr-only" aria-live="polite" aria-atomic="true">{updateAnnouncement}</span>
    <Card className="queue-filter-card">
      <div className="queue-filter-head"><div><h2>Find a grievance</h2><p>Combine filters to focus on the next action.</p></div><span className="result-count" aria-live="polite">{filtered.length} matching</span></div>
      <div className="queue-filter-controls">
        <div className="search-field"><Search size={17} aria-hidden="true" /><label htmlFor="queue-search" className="sr-only">Search reference or description</label><input id="queue-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference or description" /></div>
        <MultiFilter label="Zone" values={zones} options={ZONES} onToggle={(value) => toggle(zones, setZones, value)} onClear={() => setZones([])} />
        <MultiFilter label="Category" values={categories.map((id) => CATEGORIES.find((item) => item.id === id)?.name ?? id)} options={CATEGORIES.map((item) => item.name)} onToggle={(name) => { const id = CATEGORIES.find((item) => item.name === name)?.id; if (id) toggle(categories, setCategories, id); }} onClear={() => setCategories([])} />
        <MultiFilter label="Priority" values={priorities} options={priorityValues} onToggle={(value) => toggle(priorities, setPriorities, value)} onClear={() => setPriorities([])} />
        <MultiFilter label="Status" values={statuses} options={STATUS_ORDER} onToggle={(value) => toggle(statuses, setStatuses, value)} onClear={() => setStatuses([])} />
        <label className="sort-select-label"><SlidersHorizontal size={15} /><span className="sr-only">Sort grievances</span><select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)}><option value="sla">SLA urgency</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        <button type="button" className="clear-filters-button" onClick={clear} disabled={!filterCount && !search && sort === "sla"}><X size={14} />Clear all</button>
      </div>
      {filterCount ? <div className="active-filters"><span>Active filters</span>{zones.map((item) => <button key={item} type="button" className="active-filter-chip" onClick={() => toggle(zones, setZones, item)}>{item}<X size={12} /></button>)}{categories.map((item) => <button key={item} type="button" className="active-filter-chip" onClick={() => toggle(categories, setCategories, item)}>{categoryName(item)}<X size={12} /></button>)}{priorities.map((item) => <button key={item} type="button" className="active-filter-chip" onClick={() => toggle(priorities, setPriorities, item)}>{item}<X size={12} /></button>)}{statuses.length ? statuses.map((item) => <button key={item} type="button" className="active-filter-chip" onClick={() => toggle(statuses, setStatuses, item)}>{item === "in_progress" ? "In Progress" : item}<X size={12} /></button>) : <button type="button" className="active-filter-chip" onClick={() => setStatuses(["filed", "triaged"])}>No statuses<X size={12} /></button>}</div> : null}
    </Card>
    {filtered.length ? <>
      <div className="desktop-table-wrap"><table className="data-table queue-table"><caption className="sr-only">Grievance triage queue, sorted by {sort === "sla" ? "SLA urgency" : sort}</caption><thead><tr><th scope="col">Reference / category</th><th scope="col">Zone</th><th scope="col">Status</th><th scope="col">Priority</th><th scope="col" aria-sort={sort === "newest" ? "descending" : sort === "oldest" ? "ascending" : "none"}><button type="button" className="table-sort-button" onClick={() => setSort(sort === "newest" ? "oldest" : "newest")} aria-label="Sort by filed date">Filed <span aria-hidden="true">↕</span></button></th><th scope="col" aria-sort={sort === "sla" ? "ascending" : "none"}><button type="button" className="table-sort-button" onClick={() => setSort("sla")} aria-label="Sort by SLA urgency">SLA countdown <span aria-hidden="true">↕</span></button></th><th scope="col"><span className="sr-only">Action</span></th></tr></thead><tbody>{filtered.map((item) => <QueueTableRow key={item.id} grievance={item} newEntry={newGrievanceIds.includes(item.id)} />)}</tbody></table></div>
      <div className="mobile-queue-cards">{filtered.map((item) => <QueueMobileCard key={item.id} grievance={item} newEntry={newGrievanceIds.includes(item.id)} />)}</div>
    </> : <Card><EmptyState title="No grievances match your filters" description="Try changing a status, zone or priority, or clear filters to return to the default triage queue." icon={SlidersHorizontal} action={<Button variant="outline" onClick={clear}>Clear filters</Button>} /></Card>}
    <div className="queue-footnote"><span><AlarmClock size={14} /> SLA windows: Critical 12h · High 24h · Medium 48h · Low 72h</span><button type="button" className="subtle-demo-action" onClick={() => setShowError(true)}>Preview a recoverable queue error</button></div>
  </div>;
}

function QueueTableRow({ grievance, newEntry }: { grievance: Grievance; newEntry: boolean }) {
  const overdue = grievance.status !== "resolved" && slaDeadline(grievance.createdAt, grievance.priority).getTime() < Date.now();
  return <tr className={`${overdue ? "table-row-overdue" : ""} ${newEntry ? "queue-row-new" : ""}`.trim()}>
    <td><Link className="table-reference-link" href={`/dashboard/staff/grievances/${grievance.id}`}><strong>{grievance.id}</strong><span>{categoryName(grievance.categoryId)}</span></Link></td>
    <td>{grievance.zone}</td><td><StatusBadge status={grievance.status} small /></td><td><PriorityChip priority={grievance.priority} /></td><td><time dateTime={grievance.createdAt} title={formatDate(grievance.createdAt, true)}>{relativeTime(grievance.createdAt)}</time></td><td><SlaCountdown grievance={grievance} compact /></td><td><Link className="table-action-link" href={`/dashboard/staff/grievances/${grievance.id}`}>Open workbench <ArrowRight size={14} /></Link></td>
  </tr>;
}

function QueueMobileCard({ grievance, newEntry }: { grievance: Grievance; newEntry: boolean }) {
  const overdue = grievance.status !== "resolved" && slaDeadline(grievance.createdAt, grievance.priority).getTime() < Date.now();
  return <Link href={`/dashboard/staff/grievances/${grievance.id}`} className={`mobile-queue-card ${overdue ? "mobile-queue-overdue" : ""} ${newEntry ? "queue-mobile-new" : ""}`}>
    <div className="mobile-queue-top"><StatusBadge status={grievance.status} small /><PriorityChip priority={grievance.priority} /></div><h3>{categoryName(grievance.categoryId)}</h3><div className="mobile-queue-meta"><span>{grievance.id}</span><span><MapPin size={13} />{grievance.zone}</span></div><p>{grievance.description}</p><div className="mobile-queue-bottom"><span><Clock3 size={14} />{relativeTime(grievance.createdAt)}</span><SlaCountdown grievance={grievance} compact /><ArrowRight size={16} /></div>
  </Link>;
}

export function StaffWorkbench({ id }: { id: string }) {
  const router = useRouter();
  const { data, currentUser, triageGrievance, awardBid, rejectBid, toast } = useDemo();
  const grievance = data.grievances.find((item) => item.id === id);
  const [priority, setPriority] = useState<Priority | "">(grievance?.priority ?? "");
  const [priorityError, setPriorityError] = useState("");
  const [confirmBid, setConfirmBid] = useState<string | null>(null);
  const [confirmRejectBid, setConfirmRejectBid] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  if (showError) return <div className="screen-stack"><PageHeader title="Grievance workbench" /><ErrorState title="Grievance details could not refresh" onRetry={() => setShowError(false)} /></div>;
  if (!grievance) return <div className="screen-stack"><PageHeader title="Grievance not found" description="This report is not available in the local demo dataset." /><Card><EmptyState title="No grievance found" description="Return to the triage queue to select an available report." icon={FileText} action={<Link href="/dashboard/staff/queue" className="button button-outline button-md">Back to queue</Link>} /></Card></div>;

  const category = CATEGORIES.find((item) => item.id === grievance.categoryId);
  const contractorSuggestions = data.contractors.filter((profile) => profile.status === "approved" && profile.tradeCategoryId === grievance.categoryId && profile.preferredZones.includes(grievance.zone)).map((profile) => ({
    profile,
    activeOrders: data.grievances.filter((item) => item.assignedContractorId === profile.id && ["assigned", "in_progress"].includes(item.status)).length,
    hasBid: data.bids.some((bid) => bid.contractorId === profile.id && bid.grievanceId === grievance.id)
  })).sort((a, b) => a.activeOrders - b.activeOrders || (a.profile.approvedAt ?? "").localeCompare(b.profile.approvedAt ?? "")).slice(0, 5);
  const bids = data.bids.filter((bid) => bid.grievanceId === grievance.id);
  const selectedBid = bids.find((bid) => bid.id === confirmBid);
  const selectedContractor = selectedBid ? data.contractors.find((profile) => profile.id === selectedBid.contractorId) : null;
  const pendingRejectedBid = bids.find((bid) => bid.id === confirmRejectBid);
  const pendingRejectedProfile = pendingRejectedBid ? data.contractors.find((profile) => profile.id === pendingRejectedBid.contractorId) : null;
  const submittedCount = bids.filter((bid) => bid.status === "submitted").length;

  const triage = () => {
    if (!priority) { setPriorityError("Choose a priority before moving this grievance to Triaged."); document.getElementById("workbench-priority")?.focus(); return; }
    if (!triageGrievance(grievance.id, priority)) { toast("This grievance has changed. Refresh the workbench and try again.", "error"); return; }
  };
  const confirmAward = () => {
    if (!confirmBid) return;
    const result = awardBid(confirmBid);
    if (!result.ok) toast(result.reason ?? "This bid could not be awarded.", "error");
    setConfirmBid(null);
  };
  const confirmReject = () => {
    if (!confirmRejectBid) return;
    if (!rejectBid(confirmRejectBid)) toast("This bid is no longer submitted. Review the latest state.", "error");
    setConfirmRejectBid(null);
  };

  return <div className="screen-stack">
    <div className="back-link-row"><Link href="/dashboard/staff/queue">← Triage queue</Link><span className="grievance-reference">{grievance.id}</span></div>
    <PageHeader eyebrow="Municipal workbench" title={grievance.id} description={`${category?.name ?? "Civic issue"} · ${grievance.zone}`} action={<StatusBadge status={grievance.status} />} />
    <div className="workbench-layout">
      <div className="workbench-main-column">
        <Card className="workbench-card"><div className="workbench-card-head"><div><p className="eyebrow">Grievance details</p><h2>{category?.name}</h2></div><PriorityChip priority={grievance.priority} /></div><p className="workbench-description">{grievance.description}</p><div className="detail-metadata"><span><MapPin size={15} />{grievance.zone}</span><span><Clock3 size={15} />Filed {relativeTime(grievance.createdAt)} · {formatDate(grievance.createdAt, true)} IST</span><span>{grievance.id}</span></div><div className="workbench-owner-row"><span className="owner-marker"><Users size={16} /></span><div><span>Next action owner</span><strong>{grievance.status === "filed" ? "Municipal staff" : grievance.status === "triaged" ? "Eligible contractors" : grievance.status === "resolved" ? "Completed" : data.contractors.find((item) => item.id === grievance.assignedContractorId)?.businessName ?? "Assigned contractor"}</strong></div><SlaCountdown grievance={grievance} /></div></Card>
        <Card className="workbench-card"><SectionHeading title="Submitted photos" description={`${grievance.photos.length} photo${grievance.photos.length === 1 ? "" : "s"} from the citizen.`} /><PhotoGrid photos={grievance.photos} label="Citizen grievance photos" columns={3} /></Card>
        <Card className="workbench-card"><SectionHeading title="Status history" description="Public history notes are visible to everyone who can view this grievance." /><StatusTimeline grievance={grievance} /></Card>
      </div>
      <aside className="workbench-side-column">
        <Card className="workbench-action-card"><div className="workbench-action-heading"><span className="workbench-action-icon"><ClipboardCheck size={18} /></span><div><p className="eyebrow">Lifecycle action</p><h2>{grievance.status === "filed" ? "Triage this report" : grievance.status === "triaged" ? "Review bids" : grievance.status === "assigned" ? "Dispatch confirmed" : grievance.status === "in_progress" ? "Work underway" : "Resolution recorded"}</h2></div></div>
          {grievance.status === "filed" ? <><p className="workbench-help">Set a priority to open this grievance to eligible contractors. This moves it from Filed to Triaged.</p><Field id="workbench-priority" label="Priority" required hint="SLA window: critical 12h · high 24h · medium 48h · low 72h" error={priorityError}><select className="control" value={priority} onChange={(event) => { setPriority(event.target.value as Priority); setPriorityError(""); }}><option value="">Select priority</option>{priorityValues.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)} · {SLA_HOURS[value]} hours</option>)}</select></Field><Button className="full-width" onClick={triage} icon={ClipboardCheck}>Mark as Triaged</Button></> : <div className="action-status-copy"><StatusBadge status={grievance.status} /><p>{grievance.status === "triaged" ? "This report is open for eligible contractors to bid." : grievance.status === "assigned" ? "A contractor has been selected. The assigned contractor can start work." : grievance.status === "in_progress" ? "The assigned contractor is working on this report." : "The contractor submitted before-and-after proof and closing notes."}</p>{grievance.status === "assigned" ? <strong>{data.contractors.find((item) => item.id === grievance.assignedContractorId)?.businessName}</strong> : null}</div>}
        </Card>
        {grievance.status === "triaged" ? <>
          <Card className="suggestion-card"><SectionHeading title="Contractor suggestions" description="Approved trade and zone matches, ranked by active work orders." />{contractorSuggestions.length ? <div className="suggestion-list">{contractorSuggestions.map(({ profile, activeOrders, hasBid }) => <div className="suggestion-row" key={profile.id}><Avatar name={profile.businessName} size="sm" /><div className="suggestion-copy"><strong>{profile.businessName}</strong><span>License {profile.licenseNumber}</span><span>{profile.preferredZones.join(" · ")}</span><span>{activeOrders} active work {activeOrders === 1 ? "order" : "orders"}</span></div><div className="suggestion-state">{hasBid ? <span className="suggestion-bid">Bid received</span> : <span className="suggestion-no-bid">Eligible</span>}</div></div>)}</div> : <EmptyState compact title="No approved contractor match" description="No approved contractor matches this trade and zone. Bids can still be reviewed if submitted." icon={BriefcaseBusiness} />}</Card>
          <Card className="bid-review-card"><SectionHeading title="Submitted bids" description={bids.length ? `${bids.length} bid${bids.length === 1 ? "" : "s"} on this grievance.` : "Eligible contractors can see this grievance and submit a bid."} />
            {bids.length ? <div className="bid-review-list">{bids.map((bid) => {
              const profile = data.contractors.find((item) => item.id === bid.contractorId);
              const user = data.users.find((item) => item.id === profile?.userId);
              return <article className="bid-review-row" key={bid.id}><div className="bid-review-top"><div className="bid-review-contractor"><Avatar name={profile?.businessName ?? "Contractor"} size="sm" /><div><strong>{profile?.businessName ?? "Contractor"}</strong><span>{categoryName(profile?.tradeCategoryId ?? "")} · {profile?.preferredZones.join(", ")}</span></div></div><BidStatusBadge status={bid.status} /></div><p className="bid-notes">{bid.bidNotes}</p><div className="bid-review-meta"><span>Submitted {relativeTime(bid.createdAt)}</span>{profile?.tradeCategoryId === grievance.categoryId && profile.preferredZones.includes(grievance.zone) ? <span className="match-indicator"><CheckCircle2 size={13} />Trade and zone match</span> : <span>Other eligible bid</span>}</div>{bid.status === "submitted" ? <div className="bid-actions"><Button size="sm" variant="outline" onClick={() => setConfirmRejectBid(bid.id)}>Reject bid</Button><Button size="sm" onClick={() => setConfirmBid(bid.id)}>Award bid</Button></div> : null}</article>;
            })}</div> : <EmptyState compact title="No bids yet" description="Matching approved contractors can now see this grievance and submit a bid." icon={FileText} />}
          </Card>
        </> : null}
        {grievance.status === "assigned" || grievance.status === "in_progress" || grievance.status === "resolved" ? <Card className="assigned-detail-card"><div className="assigned-business-mark"><UserCheck size={19} /></div><div><span>Assigned business</span><strong>{data.contractors.find((item) => item.id === grievance.assignedContractorId)?.businessName ?? "Contractor assigned"}</strong><p>{grievance.status === "resolved" ? "Resolution proof is available on the citizen detail." : "This contractor owns the next action."}</p></div></Card> : null}
      </aside>
    </div>
    <button type="button" className="subtle-demo-action" onClick={() => setShowError(true)}>Preview a recoverable workbench error</button>
    <Modal open={!!confirmBid} onOpenChange={(open) => !open && setConfirmBid(null)} title="Award this bid?" description="This decision changes the grievance to Assigned and is recorded in its status history." size="md">
      {selectedBid && selectedContractor ? <div className="award-confirm-content"><div className="award-confirm-business"><span className="award-check"><CheckCircle2 size={20} /></span><div><strong>{selectedContractor.businessName}</strong><span>{selectedBid.bidNotes}</span></div></div><div className="consequence-note"><ShieldCheck size={16} /><p><strong>What happens next</strong><br />This contractor will be selected. {Math.max(0, submittedCount - 1)} other submitted {submittedCount - 1 === 1 ? "bid will be" : "bids will be"} rejected. The grievance will move to Assigned and the citizen can see the business name.</p></div><div className="dialog-actions"><Button variant="outline" onClick={() => setConfirmBid(null)}>Cancel</Button><Button onClick={confirmAward} icon={CheckCircle2}>Confirm award</Button></div></div> : null}
    </Modal>
    <Modal open={!!confirmRejectBid} onOpenChange={(open) => !open && setConfirmRejectBid(null)} title="Reject this bid?" description="This will reject only the selected bid. The grievance will remain Triaged." size="sm">
      {pendingRejectedBid ? <div className="award-confirm-content"><div className="award-confirm-business"><span className="decision-icon decision-reject"><X size={18} /></span><div><strong>{pendingRejectedProfile?.businessName ?? "Submitted contractor bid"}</strong><span>{pendingRejectedBid.bidNotes}</span></div></div><div className="dialog-actions"><Button variant="outline" onClick={() => setConfirmRejectBid(null)}>Keep bid</Button><Button variant="destructive" onClick={confirmReject}>Confirm rejection</Button></div></div> : null}
    </Modal>
  </div>;
}

export function StaffContractorDirectory() {
  const { data } = useDemo();
  const profiles = data.contractors.filter((profile) => profile.status === "approved");
  return <div className="screen-stack"><PageHeader eyebrow="Dispatch context" title="Approved contractors" description="A read-only view of verified coverage and active work orders." />
    {profiles.length ? <><div className="desktop-table-wrap"><table className="data-table"><caption className="sr-only">Approved contractor directory</caption><thead><tr><th>Business</th><th>Trade</th><th>Preferred zones</th><th>Active work orders</th><th>Verification</th></tr></thead><tbody>{profiles.map((profile) => {const active = data.grievances.filter((item) => item.assignedContractorId === profile.id && ["assigned", "in_progress"].includes(item.status));return <tr key={profile.id}><td><div className="table-user"><Avatar name={profile.businessName} size="sm" /><span><strong>{profile.businessName}</strong><small>License {profile.licenseNumber}</small></span></div></td><td>{categoryName(profile.tradeCategoryId)}</td><td>{profile.preferredZones.join(", ")}</td><td><span className="tabular">{active.length}</span>{active[0] ? <small className="table-secondary-line">Latest: {active[0].id}</small> : null}</td><td><span className="mini-badge verification-approved"><CheckCircle2 size={14} />Approved</span></td></tr>;})}</tbody></table></div><div className="directory-card-list">{profiles.map((profile) => {const active = data.grievances.filter((item) => item.assignedContractorId === profile.id && ["assigned", "in_progress"].includes(item.status));return <Card key={profile.id} className="contractor-directory-card"><div className="contractor-directory-head"><Avatar name={profile.businessName} /><div><h3>{profile.businessName}</h3><span>License {profile.licenseNumber}</span></div><span className="mini-badge verification-approved"><CheckCircle2 size={14} />Approved</span></div><p>{categoryName(profile.tradeCategoryId)}</p><p className="directory-zones">{profile.preferredZones.join(" · ")}</p><span className="directory-work-count">{active.length} active work orders</span></Card>;})}</div></> : <Card><EmptyState title="No approved contractors yet" description="Approved contractor coverage will appear here for dispatch context." icon={BriefcaseBusiness} /></Card>}
  </div>;
}
