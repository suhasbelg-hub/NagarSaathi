"use client";

import React, { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlarmClock,
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users
} from "lucide-react";
import { CATEGORIES, SLA_HOURS, STATUS_ORDER, ZONES } from "@/lib/mock-data";
import type { ContractorProfile, GrievanceStatus, Priority } from "@/lib/types";
import { categoryName, formatDate, formatDuration, relativeTime, slaDeadline } from "@/lib/utils";
import { useDemo } from "@/components/demo-store";
import { Avatar, Button, Card, EmptyState, ErrorState, Field, Modal, PageHeader, PhotoGrid, PriorityChip, SectionHeading, SkeletonRows, SlaCountdown, StatusBadge, StatusTimeline, StatCard, Tabs, VerificationBadge } from "@/components/ui";
import { ProfileScreen } from "@/components/citizen-screens";

export function AdminDashboard() {
  const { data } = useDemo();
  const [showError, setShowError] = useState(false);
  const counts = STATUS_ORDER.map((status) => ({ status, count: data.grievances.filter((item) => item.status === status).length }));
  const resolved = data.grievances.filter((item) => item.status === "resolved");
  const durations = resolved.map((item) => {
    const filedAt = item.history.find((entry) => entry.status === "filed")?.timestamp ?? item.createdAt;
    const resolvedAt = item.history.find((entry) => entry.status === "resolved")?.timestamp;
    return resolvedAt ? (new Date(resolvedAt).getTime() - new Date(filedAt).getTime()) / 3600000 : null;
  }).filter((value): value is number => value !== null && value >= 0);
  const averageHours = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null;
  const overdue = data.grievances.filter((item) => item.status !== "resolved" && slaDeadline(item.createdAt, item.priority).getTime() < Date.now());
  const pendingProfiles = data.contractors.filter((profile) => profile.status === "pending");
  const oldestPendingHours = pendingProfiles.length ? Math.max(...pendingProfiles.map((item) => (Date.now() - new Date(item.submittedAt).getTime()) / 3600000)) : null;
  const approved = data.contractors.filter((profile) => profile.status === "approved");
  const eligiblePairs = approved.flatMap((profile) => data.grievances.filter((grievance) => grievance.status === "triaged" && grievance.categoryId === profile.tradeCategoryId && profile.preferredZones.includes(grievance.zone)).map((grievance) => ({ profile, grievance })));
  const responsivePairs = eligiblePairs.filter(({ profile, grievance }) => data.bids.some((bid) => bid.contractorId === profile.id && bid.grievanceId === grievance.id));
  const responseRate = eligiblePairs.length ? Math.round(responsivePairs.length / eligiblePairs.length * 100) : null;
  const bidCount = data.bids.length;
  const eligibleGrievanceCount = new Set(data.grievances.filter((item) => data.bids.some((bid) => bid.grievanceId === item.id)).map((item) => item.id)).size;
  const bidsPerGrievance = eligibleGrievanceCount ? bidCount / eligibleGrievanceCount : null;

  const stageDurations = STATUS_ORDER.slice(0, 4).map((status, index) => {
    const values: number[] = [];
    for (const grievance of data.grievances) {
      const history = [...grievance.history].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const start = history.find((entry) => entry.status === status);
      if (!start) continue;
      const next = history.find((entry) => new Date(entry.timestamp).getTime() > new Date(start.timestamp).getTime() && STATUS_ORDER.indexOf(entry.status) > STATUS_ORDER.indexOf(status));
      const endMs = next ? new Date(next.timestamp).getTime() : grievance.status === status ? Date.now() : new Date(start.timestamp).getTime();
      if (endMs >= new Date(start.timestamp).getTime()) values.push((endMs - new Date(start.timestamp).getTime()) / 3600000);
    }
    return { status, value: values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : null, index };
  });

  if (showError) return <div className="screen-stack"><PageHeader title="Service health" /><ErrorState title="Metrics could not refresh" message="Each widget is available again after a local retry." onRetry={() => setShowError(false)} /></div>;
  return <div className="screen-stack admin-screen">
    <PageHeader eyebrow="Municipal administration" title="Service health" description="A focused view of grievance flow, SLA risk and contractor verification." action={<span className="metric-period"><CalendarClock size={14} />Current demo dataset · rolling view</span>} />
    <section className="admin-status-section"><div className="admin-status-heading"><div><h2>Grievances by status</h2><p>Current count across the five-state lifecycle.</p></div><Link href="/admin/grievances" className="text-link-arrow">Review all grievances <ArrowRight size={14} /></Link></div>
      <div className="admin-status-metrics">{counts.map(({ status, count }) => <div className={`admin-status-metric status-metric-${status}`} key={status}><span className="admin-status-metric-label">{status === "in_progress" ? "In progress" : status[0].toUpperCase() + status.slice(1)}</span><strong className="tabular">{count}</strong></div>)}</div>
      <div className="status-stacked-bar" aria-label={counts.map(({status,count})=>`${status}: ${count}`).join(", ")}>{counts.map(({status,count})=><span key={status} className={`stacked-segment stacked-${status}`} style={{width:`${data.grievances.length ? count/data.grievances.length*100 : 0}%`}} />)}</div>
      <div className="stacked-legend">{counts.map(({status,count})=><span key={status}><i className={`legend-swatch stacked-${status}`} />{status === "in_progress" ? "In progress" : status[0].toUpperCase()+status.slice(1)} <b className="tabular">{count}</b></span>)}</div>
    </section>
    <section className="stat-grid admin-metrics-grid" aria-label="Operational metrics">
      <StatCard label="Average filed to resolved" value={averageHours === null ? "—" : formatDuration(averageHours)} note={averageHours === null ? "Not enough resolved data yet" : `72-hour target · ${averageHours < 72 ? "within" : "above"} target`} icon={Clock3} tone={averageHours !== null && averageHours > 72 ? "rose" : "teal"} tabular={false} />
      <StatCard label="Overdue grievances" value={overdue.length} note={overdue.length ? `${overdue.filter((item)=>item.priority==="critical").length} critical · ${overdue.filter((item)=>item.priority==="high").length} high` : "No active SLA breaches"} icon={AlarmClock} tone={overdue.length ? "rose" : "emerald"} />
      <StatCard label="Contractor response rate" value={responseRate === null ? "—" : `${responseRate}%`} note={eligiblePairs.length ? `${responsivePairs.length} of ${eligiblePairs.length} eligible matches with a bid` : "No eligible trade and zone matches yet"} icon={Activity} tone="blue" />
      <StatCard label="Pending verifications" value={pendingProfiles.length} note={oldestPendingHours === null ? "No profiles awaiting review" : `Oldest pending · ${formatDuration(oldestPendingHours)}`} icon={BadgeCheck} tone={pendingProfiles.length ? "amber" : "emerald"} />
    </section>
    <div className="admin-detail-metrics-grid">
      <Card className="time-in-state-card"><SectionHeading title="Average time in state" description="Calculated from the demo grievance history." />{stageDurations.map(({status,value,index})=><div className="state-duration-row" key={status}><span className={`state-duration-dot state-dot-${status}`} /><span>{status === "in_progress" ? "In Progress" : status[0].toUpperCase()+status.slice(1)}</span><span className="duration-track"><i style={{width:value===null?"0%":`${Math.min(100,Math.max(8,value/72*100))}%`}} /></span><strong className="tabular">{value===null?"—":formatDuration(value)}</strong></div>)}<p className="metric-footnote">Durations use recorded status timestamps; active states include time elapsed so far.</p></Card>
      <Card className="admin-verification-summary"><div className="admin-summary-head"><span className="admin-summary-icon"><BadgeCheck size={18} /></span><div><p className="eyebrow">Contractor review</p><h2>{pendingProfiles.length ? `${pendingProfiles.length} profile${pendingProfiles.length===1?"":"s"} pending` : "Queue is clear"}</h2></div></div><p>{pendingProfiles.length ? "Review submitted business details and record an approval or reasoned rejection." : "New contractor profiles will appear in the verification queue."}</p><Link className="button button-outline button-md full-width" href="/admin/contractors">Open verification queue <ArrowRight size={15} /></Link><div className="admin-summary-support"><span>Average bids per bid-receiving grievance</span><strong className="tabular">{bidsPerGrievance===null?"—":bidsPerGrievance.toFixed(1)}</strong></div></Card>
    </div>
    <section><SectionHeading title="SLA risk by priority" description="Active grievances past their priority-specific deadline." />
      <Card className="sla-risk-card">{(["critical","high","medium","low"] as Priority[]).map((priority)=><div className="sla-risk-row" key={priority}><PriorityChip priority={priority} /><span className="sla-risk-hours">{SLA_HOURS[priority]}h SLA</span><span className="sla-risk-track"><i style={{width:`${overdue.filter((item)=>item.priority===priority).length?Math.min(100,overdue.filter((item)=>item.priority===priority).length*22):0}%`}} /></span><strong className="tabular">{overdue.filter((item)=>item.priority===priority).length}</strong></div>)}</Card>
    </section>
    <button type="button" className="subtle-demo-action" onClick={() => setShowError(true)}>Preview a recoverable metrics error</button>
  </div>;
}

export function AdminContractorVerification() {
  const { data, decideContractor, toast } = useDemo();
  const [tab, setTab] = useState("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"review" | "approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [search, setSearch] = useState("");
  const [showError, setShowError] = useState(false);
  const tabs = ["pending", "approved", "rejected"] as const;
  const filtered = data.contractors.filter((profile) => profile.status === tab).filter((profile) => {
    const user=data.users.find((item)=>item.id===profile.userId);
    const needle=search.trim().toLowerCase();
    return !needle || `${profile.businessName} ${profile.licenseNumber} ${user?.name ?? ""} ${user?.email ?? ""}`.toLowerCase().includes(needle);
  }).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
  const selected = data.contractors.find((profile) => profile.id === selectedId) ?? null;
  const selectedUser = selected ? data.users.find((user) => user.id === selected.userId) : null;
  if (showError) return <div className="screen-stack"><PageHeader title="Contractor verification" /><ErrorState title="Verification records could not refresh" onRetry={() => setShowError(false)} /></div>;

  const chooseProfile = (profile: ContractorProfile) => { setSelectedId(profile.id); setDialogMode("review"); };
  const confirmDecision = (decision: "approved" | "rejected") => {
    if (!selected) return;
    if (decision === "rejected" && (reason.trim().length < 10 || reason.trim().length > 500)) { setReasonError("Add a rejection reason between 10 and 500 characters."); return; }
    const ok = decideContractor(selected.id, decision, reason);
    if (!ok) { toast("This profile is no longer pending. The queue has been refreshed.", "error"); setDialogMode(null); return; }
    setReason("");setReasonError("");setDialogMode(null);
  };

  return <div className="screen-stack">
    <PageHeader eyebrow="Contractor oversight" title="Contractor verification" description="Review license, trade and zone coverage before enabling opportunities." action={<span className="verification-queue-count"><BadgeCheck size={16} />{data.contractors.filter((item)=>item.status==="pending").length} pending</span>} />
    <Card className="verification-queue-card"><div className="verification-queue-head"><div><h2>Verification queue</h2><p>Decisions are recorded with an admin and timestamp.</p></div><div className="search-field verification-search"><Search size={16} /><label htmlFor="verification-search" className="sr-only">Search contractor profiles</label><input id="verification-search" value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search business or license" /></div></div>
      <Tabs label="Contractor verification status" value={tab} onChange={setTab} tabs={tabs.map((value)=>({id:value,label:value[0].toUpperCase()+value.slice(1),count:data.contractors.filter((item)=>item.status===value).length}))} />
      {filtered.length ? <><div className="desktop-table-wrap"><table className="data-table"><caption className="sr-only">{tab} contractor profiles</caption><thead><tr><th>Business / license</th><th>Trade</th><th>Preferred zones</th><th>Registrant</th><th>Submitted</th><th>Status</th><th><span className="sr-only">Review action</span></th></tr></thead><tbody>{filtered.map((profile)=>{const user=data.users.find((item)=>item.id===profile.userId);return <tr key={profile.id}><td><div className="table-user"><Avatar name={profile.businessName} size="sm" /><span><strong>{profile.businessName}</strong><small>License {profile.licenseNumber}</small></span></div></td><td>{categoryName(profile.tradeCategoryId)}</td><td>{profile.preferredZones.join(", ")}</td><td><span>{user?.name ?? "Demo contractor"}</span><small className="table-secondary-line">{user?.email}</small></td><td><time dateTime={profile.submittedAt} title={formatDate(profile.submittedAt,true)}>{relativeTime(profile.submittedAt)}</time></td><td><VerificationBadge status={profile.status} /></td><td><button type="button" className="table-action-link" onClick={()=>chooseProfile(profile)}>Review <ArrowRight size={14} /></button></td></tr>;})}</tbody></table></div><div className="verification-mobile-list">{filtered.map((profile)=>{const user=data.users.find((item)=>item.id===profile.userId);return <button type="button" className="verification-mobile-card" key={profile.id} onClick={()=>chooseProfile(profile)}><div className="verification-mobile-head"><Avatar name={profile.businessName} /><div><strong>{profile.businessName}</strong><span>License {profile.licenseNumber}</span></div><VerificationBadge status={profile.status} /></div><p>{categoryName(profile.tradeCategoryId)}</p><span className="verification-mobile-zones">{profile.preferredZones.join(" · ")}</span><div className="verification-mobile-foot"><span>{user?.email}</span><span>{relativeTime(profile.submittedAt)} <ArrowRight size={14} /></span></div></button>;})}</div></> : <EmptyState title={search ? "No contractors match your search" : `No ${tab} verifications`} description={search ? "Try a business name, license number or registrant email." : tab === "pending" ? "New contractor profiles will appear here for review." : `Contractors with a ${tab} decision will appear here.`} icon={tab === "rejected" ? ShieldAlert : BadgeCheck} compact />}
    </Card>
    <button type="button" className="subtle-demo-action" onClick={() => setShowError(true)}>Preview a recoverable verification error</button>
    <Modal open={!!dialogMode} onOpenChange={(open)=>!open&&setDialogMode(null)} title={dialogMode === "review" ? "Contractor profile review" : dialogMode === "approve" ? "Approve this contractor?" : "Reject this contractor?"} description={dialogMode === "review" ? "Review the submitted business details and verification record." : dialogMode === "approve" ? "Approval enables this contractor to view matching opportunities and submit bids." : "A reason is required and will be shown to the contractor."} size="lg">
      {selected && dialogMode === "review" ? <div className="profile-review-content"><div className="profile-review-title"><Avatar name={selected.businessName} size="lg" /><div><h3>{selected.businessName}</h3><p>{selectedUser?.name} · {selectedUser?.email}</p></div><VerificationBadge status={selected.status} /></div><div className="review-detail-grid"><div><span>License number</span><strong>{selected.licenseNumber}</strong></div><div><span>Trade category</span><strong>{categoryName(selected.tradeCategoryId)}</strong></div><div className="review-zones"><span>Preferred zones</span><strong>{selected.preferredZones.join(" · ")}</strong></div><div><span>Profile submitted</span><strong>{formatDate(selected.submittedAt,true)} IST</strong></div>{selected.approvedAt ? <div><span>Approved by</span><strong>{data.users.find((item)=>item.id===selected.approvedBy)?.name ?? "Municipal admin"}</strong></div> : null}{selected.approvedAt ? <div><span>Approved at</span><strong>{formatDate(selected.approvedAt,true)} IST</strong></div> : null}{selected.rejectionReason ? <div className="review-reason"><span>Recorded rejection reason</span><strong>{selected.rejectionReason}</strong></div> : null}</div><div className="dialog-actions">{selected.status==="pending" ? <><Button variant="destructive" onClick={()=>{setReason("");setReasonError("");setDialogMode("reject");}}>Reject</Button><Button onClick={()=>setDialogMode("approve")} icon={CheckCircle2}>Approve contractor</Button></> : <Button variant="outline" onClick={()=>setDialogMode(null)}>Close review</Button>}</div><p className="audit-note"><ShieldCheck size={14} />Actions are recorded in the local demo state with the selected admin identity.</p></div> : null}
      {selected && dialogMode === "approve" ? <div className="decision-confirm-content"><div className="decision-profile-row"><span className="decision-icon decision-approve"><CheckCircle2 size={20} /></span><div><strong>{selected.businessName}</strong><span>{categoryName(selected.tradeCategoryId)} · {selected.preferredZones.length} preferred zones</span></div></div><div className="consequence-note"><ShieldCheck size={16} /><p><strong>Approval effect</strong><br />This profile will move to Approved. Matching trade-and-zone opportunities and bidding will become available to this contractor.</p></div><div className="dialog-actions"><Button variant="outline" onClick={()=>setDialogMode("review")}>Back to review</Button><Button onClick={()=>confirmDecision("approved")}>Confirm approval</Button></div></div> : null}
      {selected && dialogMode === "reject" ? <form className="form-stack" onSubmit={(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();confirmDecision("rejected");}} noValidate><div className="decision-profile-row"><span className="decision-icon decision-reject"><ShieldAlert size={20} /></span><div><strong>{selected.businessName}</strong><span>This reason will be shared with the contractor.</span></div></div><Field id="rejection-reason" label="Reason for rejection" required hint="10–500 characters. Explain what needs to be corrected." error={reasonError}><textarea className="control textarea textarea-medium" value={reason} maxLength={500} onChange={(event)=>{setReason(event.target.value);setReasonError("");}} placeholder="For example, the license details need to be updated before review can continue." /></Field><div className="character-count"><span>10–500 characters</span><span className="tabular">{reason.trim().length}/500</span></div><div className="dialog-actions"><Button type="button" variant="outline" onClick={()=>setDialogMode("review")}>Back to review</Button><Button type="submit" variant="destructive">Confirm rejection</Button></div></form> : null}
    </Modal>
  </div>;
}

export function AdminUsers() {
  const { data } = useDemo();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showError, setShowError] = useState(false);
  const pageSize=25;
  const results=useMemo(()=>data.users.filter((user)=>`${user.name} ${user.email} ${user.role}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name)),[data.users,search]);
  const pageCount=Math.max(1,Math.ceil(results.length/pageSize));
  const rows=results.slice((page-1)*pageSize,page*pageSize);
  if (showError) return <div className="screen-stack"><PageHeader title="User directory" /><ErrorState title="User records could not load" onRetry={()=>setShowError(false)} /></div>;
  return <div className="screen-stack"><PageHeader eyebrow="Read-only directory" title="User directory" description="Search accounts and review role and email-confirmation records. No account changes are available here." />
    <Card className="users-table-card"><div className="users-toolbar"><div><h2>Application users</h2><p>{results.length} matching {results.length===1?"account":"accounts"}</p></div><div className="search-field users-search"><Search size={16} /><label className="sr-only" htmlFor="users-search">Search name or email</label><input id="users-search" value={search} onChange={(event)=>{setSearch(event.target.value);setPage(1);}} placeholder="Search name or email" /></div></div>
      {rows.length ? <><div className="desktop-table-wrap"><table className="data-table users-table"><caption className="sr-only">Read-only user directory</caption><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Email confirmed</th></tr></thead><tbody>{rows.map((user)=><tr key={user.id}><td><div className="table-user"><Avatar name={user.name} size="sm" /><strong>{user.name}</strong></div></td><td>{user.email}</td><td><span className={`role-badge role-badge-${user.role}`}>{user.role === "staff" ? "Municipal staff" : user.role[0].toUpperCase()+user.role.slice(1)}</span></td><td>{user.confirmedAt ? <span className="confirmed-cell"><CheckCircle2 size={15} />{formatDate(user.confirmedAt)}</span> : <span className="unconfirmed-cell">Not confirmed</span>}</td></tr>)}</tbody></table></div><div className="user-mobile-list">{rows.map((user)=><article className="user-mobile-card" key={user.id}><div className="table-user"><Avatar name={user.name} /><div><strong>{user.name}</strong><span>{user.email}</span></div></div><div className="user-mobile-meta"><span className={`role-badge role-badge-${user.role}`}>{user.role}</span><span>{user.confirmedAt?`Confirmed ${formatDate(user.confirmedAt)}`:"Not confirmed"}</span></div></article>)}</div></> : <EmptyState title="No users match your search" description="Try a different name, email address or role." icon={Users} compact />}
      <div className="pagination-row"><span>Page {page} of {pageCount} · 25 accounts per page</span><div><Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage((value)=>Math.max(1,value-1))}>Previous</Button><Button variant="outline" size="sm" disabled={page>=pageCount} onClick={()=>setPage((value)=>Math.min(pageCount,value+1))}>Next</Button></div></div>
    </Card><div className="read-only-note"><ShieldCheck size={15} /><span>User management is read-only in Phase 1. Role changes and account deactivation are not available.</span></div>
    <button type="button" className="subtle-demo-action" onClick={()=>setShowError(true)}>Preview a recoverable user directory error</button>
  </div>;
}

export function AdminGrievances() {
  const { data } = useDemo();
  const [status, setStatus] = useState("all");
  const [zone, setZone] = useState("all");
  const [priority, setPriority] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const filtered=data.grievances.filter((item)=>(status==="all"||item.status===status)&&(zone==="all"||item.zone===zone)&&(priority==="all"||item.priority===priority)&&(!search.trim()||`${item.id} ${item.description}`.toLowerCase().includes(search.trim().toLowerCase()))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const selected=data.grievances.find((item)=>item.id===selectedId);
  if (showError) return <div className="screen-stack"><PageHeader title="Grievance oversight" /><ErrorState title="Grievances could not load" onRetry={()=>setShowError(false)} /></div>;
  return <div className="screen-stack"><PageHeader eyebrow="Read-only audit view" title="Grievance oversight" description="Browse all statuses and zones, then inspect the history and evidence. No admin lifecycle actions are available." />
    <Card className="oversight-filter-card"><div className="oversight-filter-heading"><div><h2>All grievances</h2><p>{filtered.length} matching records</p></div><div className="oversight-filters"><div className="search-field"><Search size={15} /><label className="sr-only" htmlFor="oversight-search">Search references and descriptions</label><input id="oversight-search" value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search reference or description" /></div><label><span className="sr-only">Filter by status</span><select className="control" value={status} onChange={(event)=>setStatus(event.target.value)}><option value="all">All statuses</option>{STATUS_ORDER.map((item)=><option key={item} value={item}>{item === "in_progress"?"In Progress":item[0].toUpperCase()+item.slice(1)}</option>)}</select></label><label><span className="sr-only">Filter by zone</span><select className="control" value={zone} onChange={(event)=>setZone(event.target.value)}><option value="all">All zones</option>{ZONES.map((item)=><option key={item}>{item}</option>)}</select></label><label><span className="sr-only">Filter by priority</span><select className="control" value={priority} onChange={(event)=>setPriority(event.target.value)}><option value="all">All priorities</option>{["critical","high","medium","low"].map((item)=><option key={item}>{item}</option>)}</select></label></div></div>
      {filtered.length ? <><div className="desktop-table-wrap"><table className="data-table oversight-table"><caption className="sr-only">All grievances for administrative review</caption><thead><tr><th>Reference / category</th><th>Zone</th><th>Status</th><th>Priority</th><th>Filed</th><th>Updated</th><th><span className="sr-only">Inspect</span></th></tr></thead><tbody>{filtered.map((item)=><tr key={item.id}><td><span className="table-reference-link"><strong>{item.id}</strong><span>{categoryName(item.categoryId)}</span></span></td><td>{item.zone}</td><td><StatusBadge status={item.status} small /></td><td><PriorityChip priority={item.priority} /></td><td><time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time></td><td><time dateTime={item.updatedAt}>{relativeTime(item.updatedAt)}</time></td><td><button type="button" className="table-action-link" onClick={()=>setSelectedId(item.id)}>Inspect history <ArrowRight size={14} /></button></td></tr>)}</tbody></table></div><div className="oversight-mobile-list">{filtered.map((item)=><button type="button" className="oversight-mobile-card" key={item.id} onClick={()=>setSelectedId(item.id)}><div className="oversight-mobile-top"><StatusBadge status={item.status} small /><PriorityChip priority={item.priority} /></div><strong>{item.id} · {categoryName(item.categoryId)}</strong><span>{item.zone} · {relativeTime(item.createdAt)}</span><span className="mobile-card-inspect">Inspect history <ArrowRight size={14} /></span></button>)}</div></> : <EmptyState title="No grievances match your filters" description="Clear a filter or try another reference, status or zone." icon={FileText} action={<Button variant="outline" onClick={()=>{setStatus("all");setZone("all");setPriority("all");setSearch("");}}>Clear filters</Button>} />}
    </Card><button type="button" className="subtle-demo-action" onClick={()=>setShowError(true)}>Preview a recoverable oversight error</button>
    <Modal open={!!selected} onOpenChange={(open)=>!open&&setSelectedId(null)} title={selected ? `Grievance ${selected.id}` : "Grievance history"} description="Read-only audit details for this grievance." size="lg">
      {selected ? <div className="oversight-detail"><div className="oversight-detail-summary"><div><p className="eyebrow">{categoryName(selected.categoryId)} · {selected.zone}</p><p>{selected.description}</p></div><div className="oversight-detail-badges"><StatusBadge status={selected.status} /><PriorityChip priority={selected.priority} /></div></div><div className="oversight-audit-grid"><div><span>Citizen record</span><strong>{data.users.find((user)=>user.id===selected.citizenId)?.name ?? "Citizen"}</strong></div><div><span>Assigned business</span><strong>{data.contractors.find((profile)=>profile.id===selected.assignedContractorId)?.businessName ?? "Not assigned"}</strong></div><div><span>Filed</span><strong>{formatDate(selected.createdAt,true)} IST</strong></div><div><span>Last updated</span><strong>{formatDate(selected.updatedAt,true)} IST</strong></div></div><div><SectionHeading title="Evidence" description="Photo evidence attached to this report." /><PhotoGrid photos={selected.photos} label="Grievance evidence" columns={3} /></div><div><SectionHeading title="Status history" description="Actor and timestamp are preserved for each lifecycle step." /><StatusTimeline grievance={selected} /></div>{selected.resolution ? <Card className="closing-notes-card"><span>Resolution closing notes</span><p>{selected.resolution.closingNotes}</p><div className="before-after-grid"><div><span className="proof-label proof-before">Before</span><PhotoGrid photos={selected.resolution.before} label="Before evidence" columns={2} /></div><div><span className="proof-label proof-after">After</span><PhotoGrid photos={selected.resolution.after} label="After evidence" columns={2} /></div></div></Card> : null}<p className="audit-note"><ShieldCheck size={14} />This screen is read-only. Grievance changes are managed through staff lifecycle workflows.</p></div> : null}
    </Modal>
  </div>;
}

export function AdminProfile() { return <ProfileScreen role="admin" />; }
