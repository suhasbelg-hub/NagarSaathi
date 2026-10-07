"use client";

import React, { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  HardHat,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench
} from "lucide-react";
import { CATEGORIES, ZONES } from "@/lib/mock-data";
import type { ContractorProfile, Grievance, PhotoAsset } from "@/lib/types";
import { categoryName, formatDate, relativeTime } from "@/lib/utils";
import { useDemo } from "@/components/demo-store";
import { PhotoUploader } from "@/components/photo-uploader";
import { Avatar, BidStatusBadge, Button, Card, EmptyState, ErrorState, Field, Modal, PageHeader, PhotoGrid, PriorityChip, SectionHeading, SlaCountdown, StatusBadge, StatusTimeline, VerificationBadge } from "@/components/ui";

function VerificationBanner({ profile }: { profile: ContractorProfile | null }) {
  if (!profile) return <div className="verification-banner verification-pending"><span className="verification-banner-icon"><HardHat size={18} /></span><div><strong>Complete your business profile</strong><p>Submit your license, trade and preferred zones for municipal review. Opportunities stay locked until approved.</p></div><Link href="/dashboard/contractor/onboarding" className="button button-outline button-sm">Start onboarding</Link></div>;
  if (profile.status === "pending") return <div className="verification-banner verification-pending"><span className="verification-banner-icon"><Clock3 size={18} /></span><div><strong>Verification pending</strong><p>{profile.businessName} is with the municipal team for review. Opportunities and bidding stay locked until a decision is made.</p></div><VerificationBadge status="pending" /></div>;
  if (profile.status === "rejected") return <div className="verification-banner verification-rejected"><span className="verification-banner-icon"><ShieldAlert size={18} /></span><div><strong>Changes are needed before approval</strong><p>{profile.rejectionReason}</p><Link className="text-link-arrow" href="/dashboard/contractor/onboarding">Edit and resubmit <ArrowRight size={14} /></Link></div><VerificationBadge status="rejected" /></div>;
  return <div className="verification-banner verification-approved"><span className="verification-banner-icon"><BadgeCheck size={18} /></span><div><strong>Verified contractor</strong><p>{profile.businessName} · {categoryName(profile.tradeCategoryId)} · {profile.preferredZones.length} preferred zones</p></div><VerificationBadge status="approved" /></div>;
}

export function ContractorDashboard() {
  const router = useRouter();
  const { data, currentUser, contractorProfile } = useDemo();
  const [showError, setShowError] = useState(false);
  const profile = contractorProfile;
  const bids = data.bids.filter((bid) => bid.contractorId === currentUser?.id);
  const openBids = bids.filter((bid) => bid.status === "submitted").length;
  const activeOrders = data.grievances.filter((item) => item.assignedContractorId === currentUser?.id && ["assigned", "in_progress"].includes(item.status));
  const recentOutcomes = bids.filter((bid) => bid.status !== "submitted").slice(0, 3);
  if (showError) return <div className="screen-stack"><PageHeader title="Contractor overview" /><ErrorState title="Your work summary could not refresh" onRetry={() => setShowError(false)} /></div>;
  return <div className="screen-stack">
    <PageHeader eyebrow="Contractor services" title={`Welcome${currentUser ? `, ${currentUser.name.split(" ")[0]}` : ""}`} description="Your verification, bids and active work in one place." />
    <VerificationBanner profile={profile} />
    <section className="stat-grid contractor-stats"><div className="contractor-stat-card"><span className="contractor-stat-icon stat-blue"><BriefcaseBusiness size={18} /></span><div><span>Active work orders</span><strong className="tabular">{activeOrders.length}</strong></div></div><div className="contractor-stat-card"><span className="contractor-stat-icon stat-amber"><FileText size={18} /></span><div><span>Open bids</span><strong className="tabular">{openBids}</strong></div></div><div className="contractor-stat-card"><span className="contractor-stat-icon stat-emerald"><CheckCircle2 size={18} /></span><div><span>Recent outcomes</span><strong className="tabular">{recentOutcomes.length}</strong></div></div></section>
    <div className="contractor-dashboard-grid">
      <section><SectionHeading title="Active work orders" description="Work awarded to your business and ready for the next action." action={<Link href="/dashboard/contractor/work-orders" className="text-link-arrow">View all <ArrowRight size={14} /></Link>} />
        {activeOrders.length ? <div className="work-card-list">{activeOrders.slice(0, 3).map((item) => <WorkOrderCard key={item.id} grievance={item} />)}</div> : <Card><EmptyState title="No active work orders" description={profile?.status === "approved" ? "Awarded work will appear here with a clear next action." : "Active work will be available when your profile is approved and a bid is awarded."} icon={Wrench} compact /></Card>}
      </section>
      <section><SectionHeading title="Recent bid outcomes" description="Follow submitted, awarded and rejected bids." action={<Link href="/dashboard/contractor/bids" className="text-link-arrow">My bids <ArrowRight size={14} /></Link>} />
        {bids.length ? <Card className="recent-bids-card">{bids.slice(0, 4).map((bid) => {const grievance = data.grievances.find((item) => item.id === bid.grievanceId);return <div className="recent-bid-row" key={bid.id}><span className="recent-bid-icon"><FileText size={16} /></span><div><strong>{grievance ? categoryName(grievance.categoryId) : "Civic work"}</strong><span>{grievance?.id} · {relativeTime(bid.createdAt)}</span></div><BidStatusBadge status={bid.status} /></div>;})}</Card> : <Card><EmptyState title="No bids submitted yet" description="Eligible opportunities will be available after verification." icon={FileText} compact /></Card>}
      </section>
    </div>
    <div className="contractor-next-action"><div className="next-action-mark"><Sparkles size={17} /></div><div><span>Next action</span><strong>{!profile ? "Submit your business profile for verification." : profile.status === "pending" ? "Wait for the municipal verification decision." : profile.status === "rejected" ? "Review the reason and resubmit your profile." : activeOrders.some((item) => item.status === "assigned") ? "Start work on your assigned work order." : "Review trade- and zone-matched opportunities."}</strong></div><Link href={!profile || profile.status === "rejected" ? "/dashboard/contractor/onboarding" : activeOrders.some((item) => item.status === "assigned") ? `/dashboard/contractor/work-orders/${activeOrders.find((item) => item.status === "assigned")?.id}` : "/dashboard/contractor/opportunities"} aria-label="Open next contractor action"><ArrowRight size={18} /></Link></div>
  </div>;
}

export function ContractorOnboarding() {
  const router = useRouter();
  const { data, currentUser, contractorProfile, saveContractorProfile, toast } = useDemo();
  const profile = contractorProfile;
  const [businessName, setBusinessName] = useState(profile?.businessName ?? "");
  const [license, setLicense] = useState(profile?.licenseNumber ?? "");
  const [trade, setTrade] = useState(profile?.tradeCategoryId ?? "");
  const [zones, setZones] = useState<string[]>(profile?.preferredZones ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(!profile || profile.status === "rejected");

  const toggleZone = (zone: string) => setZones((current) => current.includes(zone) ? current.filter((item) => item !== zone) : current.length < 10 ? [...current, zone] : current);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (businessName.trim().length < 2 || businessName.trim().length > 120) next.businessName = "Use 2–120 characters for your business name.";
    if (!/^[A-Za-z0-9/-]{4,60}$/.test(license.trim())) next.license = "Use 4–60 letters, numbers, hyphens or slashes.";
    if (!CATEGORIES.some((item) => item.id === trade)) next.trade = "Choose a trade category.";
    if (zones.length < 1 || zones.length > 10) next.zones = "Choose between 1 and 10 preferred zones.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0] === "businessName" ? "contractor-business" : Object.keys(next)[0] === "license" ? "contractor-license" : Object.keys(next)[0] === "trade" ? "contractor-trade" : "contractor-zones")?.focus();
      return;
    }
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const result = await saveContractorProfile({ businessName, licenseNumber: license, tradeCategoryId: trade, preferredZones: zones });
    setLoading(false);
    if (!result.ok) { setErrors({ license: result.reason ?? "This profile could not be submitted." }); return; }
    setEditMode(false);
    toast("Profile submitted for municipal verification.", "info");
  };

  if (profile?.status === "approved" && !editMode) return <div className="screen-stack">
    <PageHeader eyebrow="Contractor profile" title="Verification & onboarding" description="Your approved business coverage and verification record." action={<Link href="/dashboard/contractor/opportunities" className="button button-primary button-md">Browse opportunities <ArrowRight size={15} /></Link>} />
    <VerificationBanner profile={profile} />
    <Card className="onboarding-summary-card"><div className="onboarding-summary-title"><span className="verification-success-icon"><CheckCircle2 size={20} /></span><div><h2>{profile.businessName}</h2><p>Submitted {formatDate(profile.submittedAt)} · Approved {formatDate(profile.approvedAt)}</p></div></div><div className="onboarding-detail-grid"><div><span>License number</span><strong>{profile.licenseNumber}</strong></div><div><span>Trade category</span><strong>{categoryName(profile.tradeCategoryId)}</strong></div><div className="onboarding-detail-zones"><span>Preferred zones</span><strong>{profile.preferredZones.join(" · ")}</strong></div></div><div className="privacy-note"><ShieldCheck size={15} /><span>Approved business details are read-only. Profile edits require municipal review.</span></div></Card>
  </div>;

  if (profile?.status === "pending" && !editMode) return <div className="screen-stack"><PageHeader eyebrow="Contractor profile" title="Verification & onboarding" description="Your profile is in the municipal review queue." /><VerificationBanner profile={profile} /><Card className="pending-review-card"><div className="pending-review-mark"><Clock3 size={22} /></div><div><h2>Verification is in progress</h2><p>The municipal team is reviewing your business name, license, trade and service zones. You’ll see matching opportunities after approval.</p><p className="pending-submitted">Submitted {formatDate(profile.submittedAt, true)} IST</p></div></Card><Link href="/dashboard/contractor" className="text-link-arrow">Back to contractor overview <ArrowRight size={15} /></Link></div>;

  return <div className="screen-stack">
    <PageHeader eyebrow="Contractor profile" title={profile?.status === "rejected" ? "Update your business profile" : "Contractor onboarding"} description="Share your license, trade and preferred service zones for municipal verification." />
    {profile?.status === "rejected" ? <div className="rejection-reason-panel"><ShieldAlert size={18} /><div><strong>Reason for rejection</strong><p>{profile.rejectionReason}</p><span>Edit the details below and resubmit for review.</span></div></div> : null}
    <form className="form-card contractor-onboarding-form" onSubmit={submit} noValidate>
      <div className="form-section-heading"><span className="form-step-number">01</span><div><h2>Business details</h2><p>Use your registered business information. It will be reviewed by a municipal admin.</p></div></div>
      {Object.keys(errors).length >= 3 ? <div className="form-error-summary" role="alert"><strong>Please review {Object.keys(errors).length} fields.</strong><ul>{Object.entries(errors).map(([key, value]) => <li key={key}><a href={`#contractor-${key}`}>{value}</a></li>)}</ul></div> : null}
      <Field id="contractor-business" label="Business name" required hint="2–120 characters." error={errors.businessName}><input className="control" value={businessName} onChange={(event) => { setBusinessName(event.target.value); setErrors((current) => ({ ...current, businessName: "" })); }} maxLength={120} placeholder="Registered business name" /></Field>
      <Field id="contractor-license" label="License number" required hint="4–60 letters, numbers, hyphens or slashes." error={errors.license}><input className="control" value={license} onChange={(event) => { setLicense(event.target.value); setErrors((current) => ({ ...current, license: "" })); }} maxLength={60} placeholder="e.g. TG-EL-20481" /></Field>
      <Field id="contractor-trade" label="Trade category" required hint="Trade categories follow the configured civic issue categories." error={errors.trade}><select className="control" value={trade} onChange={(event) => { setTrade(event.target.value); setErrors((current) => ({ ...current, trade: "" })); }}><option value="">Select a trade</option>{CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <fieldset id="contractor-zones" className="zone-check-group" aria-describedby="contractor-zones-help contractor-zones-error"><legend>Preferred zones <span className="required-label">· Choose 1–10</span></legend><p id="contractor-zones-help" className="field-hint">Only opportunities matching your trade and preferred zones are shown.</p><div className="zone-check-grid">{ZONES.map((zone) => <label className={`zone-check ${zones.includes(zone) ? "zone-check-selected" : ""}`} key={zone}><input type="checkbox" checked={zones.includes(zone)} onChange={() => { toggleZone(zone); setErrors((current) => ({ ...current, zones: "" })); }} /><span className="zone-checkbox" aria-hidden="true">{zones.includes(zone) ? "✓" : ""}</span><span>{zone}</span></label>)}</div>{errors.zones ? <p id="contractor-zones-error" className="field-error">{errors.zones}</p> : null}</fieldset>
      <div className="form-divider" /><div className="upload-disclaimer"><ShieldCheck size={15} /><span>Submitting changes this profile to Pending. Opportunities stay locked until approval.</span></div>
      <Button type="submit" size="lg" loading={loading}>{profile?.status === "rejected" ? "Resubmit for verification" : "Submit for verification"}</Button>
    </form>
  </div>;
}

function OpportunityCard({ grievance }: { grievance: Grievance }) {
  return <Link href={`/dashboard/contractor/opportunities/${grievance.id}`} className="opportunity-card">
    <div className="opportunity-card-top"><span className="opportunity-category-icon"><BriefcaseBusiness size={18} /></span><StatusBadge status={grievance.status} small /></div>
    <div className="opportunity-category">{categoryName(grievance.categoryId)}</div><h3>{grievance.zone}</h3><p className="opportunity-summary">{grievance.description}</p>
    <div className="opportunity-meta"><PriorityChip priority={grievance.priority} /><SlaCountdown grievance={grievance} compact /></div>
    <div className="opportunity-card-foot"><span>Filed {relativeTime(grievance.createdAt)}</span><span>View & bid <ArrowRight size={15} /></span></div>
  </Link>;
}

export function ContractorOpportunities() {
  const { data, contractorProfile } = useDemo();
  const profile = contractorProfile;
  const [showError, setShowError] = useState(false);
  const opportunities = profile?.status === "approved" ? data.grievances.filter((item) => item.status === "triaged" && item.categoryId === profile.tradeCategoryId && profile.preferredZones.includes(item.zone)) : [];
  if (showError) return <div className="screen-stack"><PageHeader title="Opportunities" /><ErrorState onRetry={() => setShowError(false)} /></div>;
  return <div className="screen-stack">
    <PageHeader eyebrow="Contractor services" title="Opportunities" description="Only triaged grievances that match your approved trade and preferred zones appear here." action={profile?.status === "approved" ? <Link className="button button-outline button-md" href="/dashboard/contractor/bids">View my bids <ArrowRight size={15} /></Link> : null} />
    {profile?.status !== "approved" ? <VerificationBanner profile={profile} /> : opportunities.length ? <div className="opportunity-grid">{opportunities.map((item) => <OpportunityCard key={item.id} grievance={item} />)}</div> : <Card><EmptyState title="No matching opportunities right now" description="You’ll see grievances in your trade and preferred zones as municipal staff triage them." icon={BriefcaseBusiness} action={<Link className="button button-outline button-md" href="/dashboard/contractor">Back to overview</Link>} /></Card>}
  </div>;
}

export function ContractorOpportunityDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data, contractorProfile, submitBid, toast } = useDemo();
  const profile = contractorProfile;
  const grievance = data.grievances.find((item) => item.id === id);
  const eligible = profile?.status === "approved" && grievance?.status === "triaged" && profile.tradeCategoryId === grievance.categoryId && profile.preferredZones.includes(grievance.zone);
  const existingBid = data.bids.find((bid) => bid.grievanceId === id && bid.contractorId === profile?.id);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (notes.trim().length < 10 || notes.trim().length > 1000) { setError("Bid notes must be between 10 and 1,000 characters."); return; }
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    const result = await submitBid(id, notes);
    setLoading(false);
    if (!result.ok) { setError(result.reason ?? "This bid could not be submitted. Review the latest opportunity status."); return; }
    toast("Bid submitted successfully.");
  };

  if (!eligible || !grievance) return <div className="screen-stack"><PageHeader title="Opportunity unavailable" description="This opportunity may have changed or may not match your approved coverage." /><Card><EmptyState title="This opportunity is not available to your profile" description="Only triaged grievances that match an approved contractor’s trade and preferred zones can be opened here." icon={ShieldCheck} action={<Link href="/dashboard/contractor/opportunities" className="button button-outline button-md">Back to opportunities</Link>} /></Card></div>;
  const category = CATEGORIES.find((item) => item.id === grievance.categoryId);
  return <div className="screen-stack">
    <div className="back-link-row"><Link href="/dashboard/contractor/opportunities">← Opportunities</Link><span className="grievance-reference">{grievance.id}</span></div>
    <PageHeader eyebrow={`${category?.name ?? "Civic work"} · ${grievance.zone}`} title="Opportunity details" description="Review the issue and submit one scoped bid. No monetary bid is collected in Phase 1." action={<StatusBadge status={grievance.status} />} />
    <div className="opportunity-detail-grid">
      <div className="screen-stack compact-stack">
        <Card className="opportunity-detail-card"><div className="detail-metadata"><span><MapPin size={15} />{grievance.zone}</span><span><Clock3 size={15} />Filed {relativeTime(grievance.createdAt)}</span></div><h2>{category?.name}</h2><p className="detail-description">{grievance.description}</p><div className="opportunity-detail-status"><PriorityChip priority={grievance.priority} /><SlaCountdown grievance={grievance} /></div></Card>
        <Card><SectionHeading title="Citizen photos" description="Evidence attached to the grievance." /><PhotoGrid photos={grievance.photos} label="Opportunity photos" columns={3} /></Card>
      </div>
      <Card className="bid-form-card"><div className="bid-form-heading"><span className="bid-form-icon"><FileText size={18} /></span><div><p className="eyebrow">Your response</p><h2>{existingBid ? "Your bid is submitted" : "Submit a bid"}</h2></div></div>
        {existingBid ? <div className="submitted-bid-state"><div className="submitted-bid-top"><BidStatusBadge status={existingBid.status} /><span>Submitted {relativeTime(existingBid.createdAt)}</span></div><p>{existingBid.bidNotes}</p><div className="info-callout"><ShieldCheck size={16} /><span>One bid per contractor and grievance. You can follow this decision under My bids.</span></div><Link className="button button-outline button-md" href="/dashboard/contractor/bids">Go to my bids <ArrowRight size={15} /></Link></div> : <form className="form-stack" onSubmit={submit} noValidate><p>Describe your scope, approach and expected timeline. Keep the note useful for municipal staff.</p><Field id="bid-notes" label="Bid notes" required hint="10–1,000 characters. Do not include a monetary amount." error={error}><textarea className="control textarea textarea-medium" value={notes} maxLength={1000} onChange={(event) => { setNotes(event.target.value); setError(""); }} placeholder="I can inspect the site, bring the relevant crew and complete the work in…" /></Field><div className="character-count"><span>10–1,000 characters</span><span className="tabular">{notes.length}/1,000</span></div><div className="info-callout"><ShieldCheck size={16} /><span>Submitting a bid does not guarantee an award. Staff will record the dispatch decision.</span></div><Button type="submit" size="lg" loading={loading}>Submit bid</Button></form>}
      </Card>
    </div>
  </div>;
}

export function ContractorBids() {
  const { data, currentUser } = useDemo();
  const [filter, setFilter] = useState("all");
  const [showError, setShowError] = useState(false);
  const bids = data.bids.filter((bid) => bid.contractorId === currentUser?.id).filter((bid) => filter === "all" || bid.status === filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const allCount = data.bids.filter((bid) => bid.contractorId === currentUser?.id).length;
  if (showError) return <div className="screen-stack"><PageHeader title="My bids" /><ErrorState title="Bid status could not refresh" onRetry={() => setShowError(false)} /></div>;
  return <div className="screen-stack">
    <PageHeader eyebrow="Contractor services" title="My bids" description="Track only the bids submitted from this contractor profile." action={<Link className="button button-primary button-md" href="/dashboard/contractor/opportunities">Browse opportunities <ArrowRight size={15} /></Link>} />
    <div className="bid-filter-tabs" role="group" aria-label="Filter bids by status">{[{id:"all",label:"All bids"},{id:"submitted",label:"Submitted"},{id:"awarded",label:"Awarded"},{id:"rejected",label:"Rejected"}].map((item) => <button type="button" key={item.id} className={`filter-tab ${filter === item.id ? "filter-tab-active" : ""}`} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}<span>{item.id === "all" ? allCount : data.bids.filter((bid) => bid.contractorId === currentUser?.id && bid.status === item.id).length}</span></button>)}</div>
    {bids.length ? <div className="bid-cards">{bids.map((bid) => {const grievance=data.grievances.find((item)=>item.id===bid.grievanceId);return <Card className="contractor-bid-card" key={bid.id}><div className="contractor-bid-top"><div><p className="eyebrow">{grievance?.id ?? "Grievance"}</p><h2>{grievance ? categoryName(grievance.categoryId) : "Civic work"}</h2></div><BidStatusBadge status={bid.status} /></div><div className="contractor-bid-meta"><span><MapPin size={14} />{grievance?.zone ?? "Zone details unavailable"}</span><span><Clock3 size={14} />Submitted {relativeTime(bid.createdAt)}</span></div><p className="contractor-bid-notes">{bid.bidNotes}</p><div className="contractor-bid-footer">{grievance ? <StatusBadge status={grievance.status} small /> : null}{bid.status === "awarded" && grievance ? <Link className="text-link-arrow" href={`/dashboard/contractor/work-orders/${grievance.id}`}>Open work order <ArrowRight size={14} /></Link> : bid.status === "submitted" && grievance?.status === "triaged" ? <Link className="text-link-arrow" href={`/dashboard/contractor/opportunities/${grievance.id}`}>View opportunity <ArrowRight size={14} /></Link> : null}</div></Card>;})}</div> : <Card><EmptyState title={filter === "all" ? "No bids submitted yet" : `No ${filter} bids`} description={filter === "all" ? "When you submit a bid on a matching opportunity, it will appear here." : "Try another bid status or browse eligible opportunities."} icon={FileText} action={<Link href="/dashboard/contractor/opportunities" className="button button-outline button-md">Browse opportunities</Link>} /></Card>}
  </div>;
}

function WorkOrderCard({ grievance }: { grievance: Grievance }) {
  return <Card className="work-order-card"><div className="work-order-top"><div><p className="eyebrow">{grievance.id}</p><h3>{categoryName(grievance.categoryId)}</h3></div><StatusBadge status={grievance.status} small /></div><p className="work-order-zone"><MapPin size={14} />{grievance.zone} <span>·</span> <PriorityChip priority={grievance.priority} /></p><p className="work-order-description">{grievance.description}</p><div className="work-order-meta"><SlaCountdown grievance={grievance} compact /><span>{grievance.status === "assigned" ? "Assigned contractor owns the next action" : "Work in progress"}</span></div><Link className="button button-outline button-md full-width" href={`/dashboard/contractor/work-orders/${grievance.id}`}>{grievance.status === "assigned" ? "Start work" : "Submit fix confirmation"}<ArrowRight size={15} /></Link></Card>;
}

export function ContractorWorkOrders() {
  const { data, currentUser, contractorProfile } = useDemo();
  const [filter, setFilter] = useState("active");
  const [showError, setShowError] = useState(false);
  if (contractorProfile?.status !== "approved") return <div className="screen-stack"><PageHeader title="Work orders" description="Awarded work is available to verified contractors." /><VerificationBanner profile={contractorProfile} /></div>;
  const all = data.grievances.filter((item) => item.assignedContractorId === currentUser?.id && ["assigned", "in_progress", "resolved"].includes(item.status)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const filtered = filter === "active" ? all.filter((item) => item.status !== "resolved") : filter === "resolved" ? all.filter((item) => item.status === "resolved") : all;
  if (showError) return <div className="screen-stack"><PageHeader title="Work orders" /><ErrorState title="Work orders could not refresh" onRetry={() => setShowError(false)} /></div>;
  return <div className="screen-stack"><PageHeader eyebrow="Contractor services" title="Work orders" description="Review assigned jobs, start work and submit completion proof." />
    <div className="bid-filter-tabs" role="group" aria-label="Filter work orders">{[{id:"active",label:"Active"},{id:"all",label:"All"},{id:"resolved",label:"Resolved"}].map((item)=><button key={item.id} type="button" className={`filter-tab ${filter===item.id?"filter-tab-active":""}`} aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{item.label}<span>{item.id==="active"?all.filter((row)=>row.status!=="resolved").length:item.id==="resolved"?all.filter((row)=>row.status==="resolved").length:all.length}</span></button>)}</div>
    {filtered.length ? <div className="work-order-grid">{filtered.map((item) => <WorkOrderCard key={item.id} grievance={item} />)}</div> : <Card><EmptyState title={filter === "resolved" ? "No resolved work orders" : "No active work orders"} description="When a bid is awarded, the work order and its next action will appear here." icon={Wrench} /></Card>}
  </div>;
}

export function ContractorWorkOrderDetail({ id }: { id: string }) {
  const { data, currentUser, startWork, submitFix, toast } = useDemo();
  const grievance = data.grievances.find((item) => item.id === id && item.assignedContractorId === currentUser?.id);
  const [before, setBefore] = useState<PhotoAsset[]>([]);
  const [after, setAfter] = useState<PhotoAsset[]>([]);
  const [closingNotes, setClosingNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmResolve, setConfirmResolve] = useState(false);
  if (!grievance) return <div className="screen-stack"><PageHeader title="Work order not found" description="This work order is not assigned to your contractor account." /><Card><EmptyState title="Work order unavailable" description="Only work assigned to this contractor profile can be opened here." icon={ShieldCheck} action={<Link className="button button-outline button-md" href="/dashboard/contractor/work-orders">Back to work orders</Link>} /></Card></div>;
  const category = CATEGORIES.find((item) => item.id === grievance.categoryId);
  const submitConfirmation = async () => {
    setError("");
    if (before.length < 1 || before.length > 3) { setError("Add 1–3 before photos that are ready to submit."); setConfirmResolve(false); return; }
    if (after.length < 1 || after.length > 3) { setError("Add 1–3 after photos that are ready to submit."); setConfirmResolve(false); return; }
    if (closingNotes.trim().length < 20 || closingNotes.trim().length > 1000) { setError("Closing notes must be between 20 and 1,000 characters."); setConfirmResolve(false); document.getElementById("closing-notes")?.focus(); return; }
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const ok = await submitFix(grievance.id, before, after, closingNotes);
    setLoading(false);
    setConfirmResolve(false);
    if (!ok) { setError("This work order changed before the confirmation was saved. Review its current status and try again."); return; }
  };
  const handleStart = async () => {
    if (!(await startWork(grievance.id))) toast("This work order has changed. Refresh the page and review its status.", "error");
  };

  return <div className="screen-stack">
    <div className="back-link-row"><Link href="/dashboard/contractor/work-orders">← Work orders</Link><span className="grievance-reference">{grievance.id}</span></div>
    <PageHeader eyebrow={`${category?.name ?? "Civic work"} · ${grievance.zone}`} title="Work order details" description="Review the grievance and complete the next action for this assigned job." action={<StatusBadge status={grievance.status} />} />
    <div className="workorder-detail-layout">
      <div className="screen-stack compact-stack">
        <Card className="workorder-summary-card"><div className="detail-metadata"><span><MapPin size={15} />{grievance.zone}</span><span><Clock3 size={15} />Filed {relativeTime(grievance.createdAt)}</span></div><h2>{category?.name}</h2><p className="detail-description">{grievance.description}</p><div className="workorder-status-line"><PriorityChip priority={grievance.priority} /><SlaCountdown grievance={grievance} /></div></Card>
        <Card><SectionHeading title="Citizen evidence" description="Original photos submitted with the grievance." /><PhotoGrid photos={grievance.photos} label="Citizen photos" columns={3} /></Card>
        <Card><SectionHeading title="Work history" description="Updates visible to the citizen and municipal team." /><StatusTimeline grievance={grievance} /></Card>
      </div>
      <div className="workorder-action-column">
        {grievance.status === "assigned" ? <Card className="start-work-card"><span className="start-work-icon"><Wrench size={22} /></span><p className="eyebrow">Next action</p><h2>Ready to begin?</h2><p>Starting work updates the grievance to In Progress. The citizen will see the status change in their timeline.</p><Button size="lg" onClick={handleStart} icon={Wrench}>Start Work</Button></Card> : null}
        {grievance.status === "in_progress" ? <Card className="fix-form-card"><div className="fix-form-heading"><span className="form-step-number">02</span><div><p className="eyebrow">Work in progress</p><h2>Submit fix confirmation</h2><p>Share clear before-and-after evidence and a short closing note.</p></div></div>
          <form className="form-stack" onSubmit={(event) => { event.preventDefault(); setError(""); if (before.length < 1 || after.length < 1) { setError("Add at least one ready before photo and one ready after photo."); return; } if (closingNotes.trim().length < 20 || closingNotes.trim().length > 1000) { setError("Closing notes must be between 20 and 1,000 characters."); return; } setConfirmResolve(true); }} noValidate>
            <PhotoUploader id="before-photos" label="Before photos" files={before} onChange={setBefore} min={1} max={3} />
            <PhotoUploader id="after-photos" label="After photos" files={after} onChange={setAfter} min={1} max={3} />
            <Field id="closing-notes" label="Closing notes" required hint="20–1,000 characters. Describe what was completed." error={error && error.includes("Closing notes") ? error : undefined}><textarea className="control textarea textarea-medium" value={closingNotes} onChange={(event) => { setClosingNotes(event.target.value); setError(""); }} maxLength={1000} placeholder="Describe the completed fix and any relevant outcome." /></Field>
            <div className="character-count"><span>20–1,000 characters</span><span className="tabular">{closingNotes.trim().length}/1,000</span></div>
            {error ? <p className="field-error" role="alert">{error}</p> : null}
            <div className="info-callout"><ShieldCheck size={16} /><span>Submitting marks the grievance Resolved with verified before-and-after proof.</span></div>
            <Button type="submit" size="lg" icon={CheckCircle2}>Review fix confirmation</Button>
          </form>
        </Card> : null}
        {grievance.status === "resolved" && grievance.resolution ? <Card className="resolved-work-card"><div className="resolved-work-icon"><CheckCircle2 size={22} /></div><p className="eyebrow">Resolution recorded</p><h2>Fix confirmation submitted</h2><p>The citizen can now view these before-and-after photos and closing notes.</p><div className="before-after-grid compact-before-after"><div><span className="proof-label proof-before">Before</span><PhotoGrid photos={grievance.resolution.before} label="Before photos" columns={2} /></div><div><span className="proof-label proof-after">After</span><PhotoGrid photos={grievance.resolution.after} label="After photos" columns={2} /></div></div><div className="closing-notes-card"><span>Closing notes</span><p>{grievance.resolution.closingNotes}</p></div></Card> : null}
      </div>
    </div>
    <Modal open={confirmResolve} onOpenChange={setConfirmResolve} title="Submit fix confirmation?" description="This moves the grievance from In Progress to Resolved and makes the proof visible to the citizen." size="md">
      <div className="resolution-confirm"><div className="resolution-confirm-stats"><span><strong>{before.length}</strong> before photos</span><span><strong>{after.length}</strong> after photos</span></div><div className="closing-notes-preview"><span>Closing notes</span><p>{closingNotes}</p></div><div className="consequence-note"><ShieldCheck size={16} /><p>Submitting records the verified resolution proof in the official grievance timeline.</p></div><div className="dialog-actions"><Button variant="outline" onClick={() => setConfirmResolve(false)}>Review again</Button><Button loading={loading} onClick={submitConfirmation} icon={CheckCircle2}>Confirm resolution</Button></div></div>
    </Modal>
  </div>;
}
