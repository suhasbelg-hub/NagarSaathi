"use client";

import React, { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock3, FilePlus2, FileText, HardHat, MapPin, Plus, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { CATEGORIES, STATUS_ORDER, ZONES } from "@/lib/mock-data";
import type { Grievance, GrievanceStatus, PhotoAsset } from "@/lib/types";
import { categoryName, formatDate, nextAction, nextOwner, relativeTime, shortRef } from "@/lib/utils";
import { useDemo } from "@/components/demo-store";
import { PhotoUploader } from "@/components/photo-uploader";
import { Avatar, Button, Card, EmptyState, ErrorState, Field, PageHeader, PhotoGrid, PriorityChip, SectionHeading, SlaCountdown, SkeletonRows, StatusBadge, StatusTimeline, StatCard } from "@/components/ui";

export function CitizenDashboard() {
  const router = useRouter();
  const { data, currentUser, role } = useDemo();
  const [showError, setShowError] = useState(false);
  const grievances = useMemo(() => data.grievances.filter((item) => item.citizenId === currentUser?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.grievances, currentUser?.id]);
  if (showError) return <><PageHeader title="Overview" description="Your civic reports and their next steps." /><ErrorState title="Your grievances aren’t available right now" message="Unable to refresh this view. Please try again." onRetry={() => setShowError(false)} /></>;
  if (!currentUser) return <><PageHeader title="Overview" /><SkeletonRows count={4} /></>;
  const open = grievances.filter((item) => item.status !== "resolved").length;
  const inProgress = grievances.filter((item) => item.status === "in_progress").length;
  const resolved = grievances.filter((item) => item.status === "resolved").length;
  const recent = grievances.slice(0, 5);
  return <div className="screen-stack">
    <PageHeader eyebrow="Citizen services" title={`Hello, ${currentUser.name.split(" ")[0]}`} description="Follow your reports and see what happens next." />
    <section className="citizen-welcome-panel">
      <div className="citizen-welcome-copy"><span className="welcome-kicker"><ShieldCheck size={15} /> Your neighbourhood, in view</span><h2>Every report has a next step.</h2><p>Share what you see. NagarSaathi keeps the status, next owner and resolution proof together.</p><Button size="lg" icon={FilePlus2} onClick={() => router.push("/dashboard/citizen/grievances/new")}>File a Grievance</Button></div>
      <div className="welcome-summary-card"><div className="welcome-summary-head"><span className="welcome-summary-icon"><FileText size={17} /></span><div><strong>Your reports</strong><span>Private to your account</span></div></div><div className="welcome-mini-stats"><div><strong className="tabular">{grievances.length}</strong><span>total</span></div><div><strong className="tabular">{open}</strong><span>open</span></div><div><strong className="tabular">{resolved}</strong><span>resolved</span></div></div><div className="welcome-summary-foot"><span className="connection-dot" />Updates appear here as the status changes</div></div>
    </section>
    <section className="stat-grid citizen-stats" aria-label="Grievance summary">
      <StatCard label="Open" value={open} note="Filed, triaged or assigned" icon={FileText} tone="teal" />
      <StatCard label="In progress" value={inProgress} note="Work is underway" icon={Clock3} tone="blue" />
      <StatCard label="Resolved" value={resolved} note="Proof available on details" icon={RefreshCw} tone="emerald" />
    </section>
    <section>
      <SectionHeading title="Recent grievances" description="Your latest reports, newest first." action={grievances.length ? <Link className="text-link-arrow" href="/dashboard/citizen/grievances">View all <ArrowRight size={15} /></Link> : null} />
      {grievances.length === 0 ? <Card><EmptyState title="No grievances yet" description="Start by sharing a local issue. You can follow its status and see the next step here." icon={FilePlus2} action={<Button onClick={() => router.push("/dashboard/citizen/grievances/new")} icon={Plus}>File your first grievance</Button>} /></Card> : <div className="grievance-list">
        {recent.map((grievance) => <GrievanceListCard key={grievance.id} grievance={grievance} />)}
      </div>}
    </section>
  </div>;
}

function GrievanceListCard({ grievance, staff = false }: { grievance: Grievance; staff?: boolean }) {
  const href = staff ? `/dashboard/staff/grievances/${grievance.id}` : `/dashboard/citizen/grievances/${grievance.id}`;
  return <Link href={href} className="grievance-list-card">
    <span className={`grievance-card-icon status-soft-${grievance.status}`}><FileText size={19} /></span>
    <span className="grievance-card-main"><span className="grievance-card-top"><strong>{categoryName(grievance.categoryId)}</strong><span className="grievance-reference">{grievance.id}</span></span><span className="grievance-card-meta"><MapPin size={13} />{grievance.zone}<span className="meta-separator">·</span><time dateTime={grievance.createdAt} title={formatDate(grievance.createdAt, true)}>{relativeTime(grievance.createdAt)}</time></span><span className="grievance-card-description">{grievance.description}</span></span>
    <span className="grievance-card-side"><StatusBadge status={grievance.status} small />{grievance.priority ? <PriorityChip priority={grievance.priority} /> : null}<ArrowRight size={17} className="card-arrow" aria-hidden="true" /></span>
  </Link>;
}

export function CitizenGrievanceList() {
  const router = useRouter();
  const { data, currentUser } = useDemo();
  const [filter, setFilter] = useState<GrievanceStatus | "all">("all");
  const [showError, setShowError] = useState(false);
  const own = data.grievances.filter((item) => item.citizenId === currentUser?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filtered = filter === "all" ? own : own.filter((item) => item.status === filter);
  if (showError) return <div className="screen-stack"><PageHeader title="My grievances" description="Only reports submitted from your account are shown." /><ErrorState onRetry={() => setShowError(false)} /></div>;
  return <div className="screen-stack">
    <PageHeader eyebrow="Citizen services" title="My grievances" description="Check a report’s status, timeline and next step." action={<Button icon={Plus} onClick={() => router.push("/dashboard/citizen/grievances/new")}>File a Grievance</Button>} />
    <Card className="filter-card"><div className="filter-row"><label htmlFor="citizen-status-filter" className="filter-label">Filter by status</label><select id="citizen-status-filter" className="control filter-select" value={filter} onChange={(event) => setFilter(event.target.value as GrievanceStatus | "all")}><option value="all">All statuses</option>{STATUS_ORDER.map((status) => <option key={status} value={status}>{status === "in_progress" ? "In Progress" : status[0].toUpperCase() + status.slice(1)}</option>)}</select><span className="result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "report" : "reports"}</span></div></Card>
    {filtered.length ? <div className="grievance-list">{filtered.map((item) => <GrievanceListCard key={item.id} grievance={item} />)}</div> : filter === "all" ? <Card><EmptyState title="No grievances yet" description="File your first report to start tracking local issues." icon={FilePlus2} action={<Button onClick={() => router.push("/dashboard/citizen/grievances/new")}>File a Grievance</Button>} /></Card> : <Card><EmptyState title="No grievances match this status" description="Try another status or clear the filter to see all your reports." icon={FileText} compact action={<Button variant="outline" onClick={() => setFilter("all")}>Clear filter</Button>} /></Card>}
  </div>;
}

export function NewGrievanceForm() {
  const router = useRouter();
  const { createGrievance, toast } = useDemo();
  const [categoryId, setCategoryId] = useState("");
  const [zone, setZone] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!CATEGORIES.some((item) => item.id === categoryId)) next.category = "Choose a category.";
    if (!zone) next.zone = "Choose a municipal zone from the list.";
    if (description.trim().length < 20) next.description = "Add at least 20 characters so staff can understand the issue.";
    else if (description.trim().length > 2000) next.description = "Keep the description to 2,000 characters or fewer.";
    if (photos.length < 1) next.photos = "Add at least one photo that is ready to submit.";
    else if (photos.length > 5) next.photos = "You can add up to 5 photos.";
    setErrors(next);
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0];
      document.getElementById(first === "category" ? "grievance-category" : first === "zone" ? "grievance-zone" : first === "description" ? "grievance-description" : "photos-upload")?.focus();
      return false;
    }
    return true;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    const id = await createGrievance({ categoryId, zone, description, photos });
    setLoading(false);
    if (!id) { toast("We couldn’t save this report. Your form is still available to retry.", "error"); return; }
    toast("Grievance filed successfully.");
    router.push(`/dashboard/citizen/grievances/${id}`);
  };

  return <div className="screen-stack">
    <PageHeader eyebrow="Citizen services" title="File a Grievance" description="Tell us what needs attention. This form usually takes less than three minutes." />
    <div className="form-page-layout">
      <form className="form-card filing-form" onSubmit={submit} noValidate>
        <div className="form-section-heading"><span className="form-step-number">01</span><div><h2>Issue details</h2><p>Choose a category and the zone where the issue is located.</p></div></div>
        {Object.keys(errors).length >= 3 ? <div className="form-error-summary" role="alert"><strong>Please review {Object.keys(errors).length} fields.</strong><ul>{Object.entries(errors).map(([key, value]) => <li key={key}><a href={`#${key === "photos" ? "photos-upload" : `grievance-${key}`}`}>{value}</a></li>)}</ul></div> : null}
        <Field id="grievance-category" label="Category" required hint="Choose the closest match. Staff can review the classification." error={errors.category}>
          <select className="control" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setErrors((current) => ({ ...current, category: "" })); }}><option value="">Select a category</option>{CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.description}</option>)}</select>
        </Field>
        <Field id="grievance-zone" label="Municipal zone" required hint="Choose from the configured zone list. Map and free-text locations are not used." error={errors.zone}>
          <select className="control" value={zone} onChange={(event) => { setZone(event.target.value); setErrors((current) => ({ ...current, zone: "" })); }}><option value="">Select a zone</option>{ZONES.map((item) => <option key={item}>{item}</option>)}</select>
        </Field>
        <Field id="grievance-description" label="Describe the issue" required hint="Include a nearby landmark and what needs attention. Avoid sharing personal information." error={errors.description}>
          <textarea className="control textarea" value={description} maxLength={2000} onChange={(event) => { setDescription(event.target.value); setErrors((current) => ({ ...current, description: "" })); }} placeholder="What is happening, and where can the municipal team find it?" />
        </Field>
        <div className="character-count"><span>20–2,000 characters</span><span className="tabular">{description.trim().length}/2,000</span></div>
        <div className="form-divider" />
        <div className="form-section-heading"><span className="form-step-number">02</span><div><h2>Photo evidence</h2><p>A clear photo helps the team understand the issue before they visit.</p></div></div>
        <PhotoUploader id="photos-upload" label="Issue photos" files={photos} onChange={setPhotos} min={1} max={5} />
        {errors.photos ? <p className="field-error" role="alert">{errors.photos}</p> : null}
        <div className="upload-disclaimer"><ShieldCheck size={15} /><span>Images are uploaded directly and stored in Supabase Storage.</span></div>
        <div className="filing-submit-row"><Button type="submit" size="lg" loading={loading} icon={FilePlus2}>Submit grievance</Button><span>Required fields are marked.</span></div>
      </form>
      <aside className="filing-side-note"><div className="side-note-icon"><ShieldCheck size={19} /></div><h3>What happens next?</h3><ol><li><span>1</span><div><strong>Filed</strong><p>Your report is recorded and visible to you.</p></div></li><li><span>2</span><div><strong>Reviewed</strong><p>Municipal staff checks the details and sets a priority.</p></div></li><li><span>3</span><div><strong>Tracked</strong><p>Follow status changes and see resolution proof here.</p></div></li></ol><p className="side-note-small">Your grievance details are private to your account and the municipal team.</p></aside>
    </div>
  </div>;
}

export function CitizenGrievanceDetail({ id }: { id: string }) {
  const { data, currentUser } = useDemo();
  const grievance = data.grievances.find((item) => item.id === id && item.citizenId === currentUser?.id);
  if (!grievance) return <div className="screen-stack"><PageHeader title="Grievance not found" description="We couldn’t find this grievance report." /><Card><EmptyState title="This grievance isn’t available" description="It may not exist or may belong to a different account. Go back to your grievance list to continue." icon={ShieldCheck} action={<Link href="/dashboard/citizen/grievances" className="button button-outline button-md">Back to my grievances</Link>} /></Card></div>;
  const category = CATEGORIES.find((item) => item.id === grievance.categoryId);
  const contractor = grievance.assignedContractorId ? data.contractors.find((item) => item.id === grievance.assignedContractorId) : null;
  return <div className="screen-stack">
    <div className="back-link-row"><Link href="/dashboard/citizen/grievances">← My grievances</Link><span className="grievance-reference">{grievance.id}</span></div>
    <PageHeader eyebrow={`${category?.name ?? "Civic issue"} · ${grievance.zone}`} title={grievance.id} description="Follow the status, next owner and timing for this report." action={<StatusBadge status={grievance.status} />} />
    <div className="citizen-detail-summary-grid">
      <Card className="detail-status-card"><div className="detail-card-label">Current status</div><StatusBadge status={grievance.status} /><h2>{nextAction(grievance)}</h2><SummaryLine label="Next action owner" value={nextOwner(grievance)} icon={<Users size={15} />} />
        <SummaryLine label="SLA window" value={`${grievance.priority ? `${grievance.priority[0].toUpperCase()}${grievance.priority.slice(1)}` : "Overall"} · ${grievance.priority === "critical" ? "12" : grievance.priority === "high" ? "24" : grievance.priority === "medium" ? "48" : "72"} hours`} icon={<Clock3 size={15} />} />
        <div className="detail-sla-row"><span>Time remaining</span><SlaCountdown grievance={grievance} /></div>
        {contractor ? <div className="assigned-business"><span className="assigned-business-mark"><HardHat size={17} /></span><div><span>Assigned contractor</span><strong>{contractor.businessName}</strong></div></div> : null}
      </Card>
      <Card className="detail-description-card"><div className="detail-card-label">Your report</div><h2>{category?.name ?? "Civic issue"}</h2><p className="detail-description">{grievance.description}</p><div className="detail-metadata"><span><MapPin size={15} />{grievance.zone}</span><span><Clock3 size={15} />Filed {relativeTime(grievance.createdAt)} <time className="sr-only" dateTime={grievance.createdAt}>{formatDate(grievance.createdAt, true)}</time></span>{grievance.priority ? <PriorityChip priority={grievance.priority} /> : null}</div></Card>
    </div>
    <Card className="detail-section-card"><SectionHeading title="Photos submitted" description={`${grievance.photos.length} photo${grievance.photos.length === 1 ? "" : "s"} attached to this report.`} /><PhotoGrid photos={grievance.photos} label="Submitted photos" columns={3} /></Card>
    <Card className="detail-section-card"><SectionHeading title="Status timeline" description="Every update is shown in order, with the person responsible for that step." /><StatusTimeline grievance={grievance} /></Card>
    {grievance.resolution ? <section className="resolution-proof-section">
      <div className="resolution-heading"><span className="resolution-check"><CheckCircle2 size={20} /></span><div><p className="eyebrow">Verified with photo evidence</p><h2>Resolution proof</h2><p>The assigned contractor submitted before-and-after photos and closing notes.</p></div></div>
      <div className="before-after-grid"><Card className="before-after-card"><div className="proof-label proof-before"><span />Before</div><PhotoGrid photos={grievance.resolution.before} label="Before photos" columns={2} /></Card><Card className="before-after-card"><div className="proof-label proof-after"><span />After</div><PhotoGrid photos={grievance.resolution.after} label="After photos" columns={2} /></Card></div>
      <Card className="closing-notes-card"><p className="detail-card-label">Contractor closing notes</p><p>{grievance.resolution.closingNotes}</p></Card>
    </section> : null}
    <div className="privacy-note"><ShieldCheck size={16} /><span>This private view shows your report, status history, assigned business name and resolution proof. Bid details are not shared here.</span></div>
  </div>;
}

function SummaryLine({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="summary-line"><span className="summary-line-icon">{icon}</span><span>{label}</span><strong>{value}</strong></div>;
}

export function ProfileScreen({ role }: { role: "citizen" | "staff" | "contractor" | "admin" }) {
  const { currentUser, contractorProfile, updateOwnName, toast } = useDemo();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  if (!currentUser) return <><PageHeader title="Profile" /><SkeletonRows count={3} /></>;
  const profileTitle = role === "contractor" ? "Account and business profile" : "Personal information";
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length < 2 || name.trim().length > 120) { setError("Enter a name between 2 and 120 characters."); return; }
    if (!(await updateOwnName(name.trim()))) return;
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  };
  return <div className="screen-stack">
    <PageHeader eyebrow="Account" title="Profile" description="Review your account information and update the fields available to this role." />
    <div className="profile-layout">
      <Card className="profile-card"><div className="profile-person"><Avatar name={currentUser.name} size="lg" /><div><h2>{currentUser.name}</h2><p>{role === "staff" ? "Municipal staff" : role[0].toUpperCase() + role.slice(1)}</p></div></div><div className="profile-detail-row"><span>Email address</span><strong>{currentUser.email}</strong><small>Read only</small></div><div className="profile-detail-row"><span>Email confirmation</span><strong>{currentUser.confirmedAt ? `Confirmed ${formatDate(currentUser.confirmedAt)}` : "Not confirmed"}</strong></div>
        {role === "contractor" && contractorProfile ? <div className="contractor-profile-quick"><div className="profile-detail-row"><span>Business</span><strong>{contractorProfile.businessName}</strong></div><div className="profile-detail-row"><span>Trade</span><strong>{categoryName(contractorProfile.tradeCategoryId)}</strong></div><div className="profile-detail-row"><span>Verification</span><strong><span className={`verification-text verification-text-${contractorProfile.status}`}>{contractorProfile.status[0].toUpperCase() + contractorProfile.status.slice(1)}</span></strong></div><Link href="/dashboard/contractor/onboarding" className="text-link-arrow">Manage contractor profile <ArrowRight size={15} /></Link></div> : null}
      </Card>
      <div className="profile-forms">
        <Card><div className="form-section-heading"><span className="form-step-number"><Users size={17} /></span><div><h2>{profileTitle}</h2><p>Only your own name can be changed here.</p></div></div><form className="form-stack" onSubmit={save} noValidate><Field id="profile-name" label="Name" required error={error}><input className="control" value={name} onChange={(event) => { setName(event.target.value); setError(""); }} /></Field><Field id="profile-email" label="Email address" hint="Email is read-only for Phase 1."><input className="control" value={currentUser.email} readOnly /></Field><Button type="submit">Save name</Button>{saved ? <p className="inline-success" role="status">Name updated.</p> : null}</form></Card>
        <Card className="password-entry-card"><div><h3>Password</h3><p>Use the account recovery flow to change your password.</p></div><Link href="/forgot-password" className="button button-outline button-md">Password recovery</Link></Card>
      </div>
    </div>
  </div>;
}
