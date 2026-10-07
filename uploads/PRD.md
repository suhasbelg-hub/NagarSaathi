# PRD.md — NagarSaathi ("Companion for Civic Change")

**Product Requirements Document**
**Version:** 1.0 (Phase 1 — Single Municipal Deployment)
**Status:** Approved for Implementation
**Companion Documents (the 9-file base rules canon — see `design.md` §1 for precedence):** `architecture.md` (Technical Blueprint), `design.md` (Design Governance & Canon), `phases.md` (Implementation Roadmap), and the five UI/UX rule files: `UX-Design-Brief.md` (experience strategy), `userflow.md` (role journeys & error recovery), `design-system.md` (tokens & visual rules), `components.md` (component contracts), `screen-specs.md` (route-by-route screen specifications). `playbook.md` is the operator execution guide.

---

## 1. Product Vision

NagarSaathi is a **real-time municipal grievance redressal and contractor dispatch platform** for a single municipality. It digitizes the full civic complaint lifecycle — from a citizen filing a pothole report with photo evidence, through municipal staff triage and competitive contractor bidding, to verified fix confirmation with before/after photographic proof — on a single, transparent, auditable pipeline.

**Vision statement:** Every civic grievance is filed in under 3 minutes, visibly progresses through a five-state lifecycle in real time, and reaches verified resolution in under 72 hours.

### 1.1 Problem Statement

- Citizens have no visibility into municipal complaint status after filing; complaints disappear into opaque queues.
- Municipal staff lack a prioritized, filterable triage workbench with SLA awareness.
- Contractor dispatch is ad hoc, with no structured matching of trade specialization and service zone, and no competitive bidding record.
- Resolution claims lack photographic proof and immutable audit history.

### 1.2 Solution Summary

A **responsive web application** (Next.js 15 + Supabase) with four authenticated role experiences:

| Role | Core Loop |
|---|---|
| **Citizen** | File grievance (photos + zone + category) → track live status timeline → receive resolution notification with fix proof. |
| **Municipal Staff** | Triage queue (filter by zone/category/priority, SLA countdowns) → set priority → review auto-suggested contractors → award/reject bids → monitor execution. |
| **Contractor** | Register profile (trade + preferred zones) → await admin verification → browse matching `triaged`/`assigned` grievances → submit bids → execute awarded work orders → upload before/after fix proof. |
| **Admin** | Verify contractor profiles (`pending` → `approved`/`rejected`) → manage user records → observe SLA health and platform metrics. |

### 1.3 Explicit Non-Goals (Phase 1 — Hard Boundaries)

The following are **excluded** from Phase 1. No document, schema, route, or component may introduce them:

1. **No native mobile applications.** Responsive web only (mobile-first breakpoints per `design-system.md` §5).
2. **No SMS notifications.** Transactional email only, via Resend and Supabase Auth emails.
3. **No in-platform contractor payment, escrow, or payment processing.** Bids carry `bid_notes` only; monetary settlement occurs outside the platform. (Offline settlement process: `To Be Decided` by municipal operations.)
4. **No multi-city support.** Single municipal deployment; zones are a flat list within one municipality.
5. **No interactive GIS/map rendering engines.** Location capture is **zone-based text/autocomplete only** (a controlled list of municipal zone names).
6. **No public/unauthenticated grievance browsing.** Every grievance read requires authentication and role-based RLS scoping.
7. **No multi-language support.** English only for Phase 1.
8. **No third-party integrations** beyond the mandated stack (Supabase, Resend, Vercel, Vercel Analytics).

---

## 2. Objectives & Target Metrics

| ID | Objective | Target Metric | Measurement Source |
|---|---|---|---|
| OBJ-1 | Fast grievance resolution | **< 72 hours** average `filed` → `resolved` lifecycle | `status_history` timestamps; Admin metrics dashboard |
| OBJ-2 | Active contractor marketplace | **> 80% contractor response rate** (approved contractors in a matching trade+zone who bid on at least one visible grievance per week) | `contractor_bids` vs. eligible grievance visibility set |
| OBJ-3 | Real-time transparency | **< 2-second** real-time update broadcast latency (DB commit → client UI update) via Supabase Realtime | Client-side instrumentation (Vercel Analytics custom events) |
| OBJ-4 | Peak-load resilience | **50+ tickets/hour** peak grievance intake with no degradation of filing or triage flows | Load testing (Phase 9), Supabase/Vercel observability |
| OBJ-5 | Accessibility compliance | **WCAG 2.1 AA** across all authenticated and public views | Phase 9 audit (axe-core + manual screen-reader pass) |
| OBJ-6 | Data isolation | **Zero cross-tenant data leaks**: 100% of tables protected by RLS; policy test suite passes | RLS policy tests (Phase 1 & Phase 9) |

Secondary health indicators (Admin dashboard): median time-in-state per lifecycle stage, overdue (SLA-breached) grievance count, contractor verification turnaround, bids-per-grievance average.

---

## 3. User Ecosystem — Personas

### 3.1 Citizen — **Priya Sharma**, 29, Working Professional

- **Context:** Commutes daily past a broken streetlight and an overflowing garbage point. Uses her phone for everything; has 2–3 minutes of patience for civic forms.
- **Goals:** File a complaint with photos in under 3 minutes; know *exactly* what is happening to it; see photographic proof when it's "resolved."
- **Frustrations:** Opaque municipal processes; forms that lose data; complaints that vanish.
- **Behaviors:** Mobile-first (4-column grid usage dominant); files grievances in the evening; checks status 2–4× until resolution.
- **Success looks like:** Files in <3 min with 1–5 photos; status timeline updates live without refresh; receives a resolution email with before/after photos.

### 3.2 Municipal Staff — **Ramesh Iyer**, 45, Ward Operations Officer

- **Context:** Desktop user at a municipal office. Handles dozens of incoming grievances daily across assigned zones. Judged on SLA compliance.
- **Goals:** Clear the triage queue fast; prioritize by severity; dispatch the *right* contractor (trade + zone match) with minimum clicks; never let an SLA breach surprise him.
- **Frustrations:** Unprioritized inboxes; no contractor shortlists; manual phone-based dispatch.
- **Behaviors:** Keyboard-heavy desktop workflows; filters by zone first, then priority; works the queue top-down by SLA urgency.
- **Success looks like:** Multi-variable filtering (zone × category × priority), live SLA countdown timers, one-click contractor auto-suggestions, and bid award in ≤3 interactions.

### 3.3 Contractor — **Suresh Patel**, 38, Licensed Electrical Contractor

- **Context:** Runs a small electrical services business; works in 2–3 preferred zones of the city. Checks the platform between on-site jobs, usually on a tablet or phone.
- **Goals:** Get verified quickly; see only grievances that match his trade (Electrical) and preferred zones; win work orders; prove completion with photos and get his record credited.
- **Frustrations:** Irrelevant job listings; unclear verification status; disputes about whether work was done.
- **Behaviors:** Bids with short scoped notes; uploads before/after photos from his phone immediately after finishing.
- **Success looks like:** Profile `pending` → `approved` with clear status visibility; a feed strictly filtered to his trade + zones; bid status updates in real time; fix confirmation flow that takes <2 minutes on mobile.

### 3.4 Admin — **Meera Krishnan**, 41, Municipal IT & Platform Administrator

- **Context:** Owns platform integrity. Desktop user. Accountable for contractor vetting and SLA reporting to the municipal commissioner.
- **Goals:** Vet contractor profiles (license, trade, zones) rigorously; keep the user base clean; surface SLA health metrics for leadership.
- **Frustrations:** Unvetted contractors damaging trust; no at-a-glance platform health view.
- **Behaviors:** Processes the verification queue daily; reviews metrics weekly; rarely intervenes in individual grievances but needs full visibility when she does.
- **Success looks like:** A verification queue with full profile detail and approve/reject (with reason) in one screen; a metrics dashboard with lifecycle-time and overdue counts; searchable user management.

---

## 4. Information Architecture & Route Manifest

All routes are Next.js 15 App Router paths. Middleware enforces authentication and role scoping (see `architecture.md` §6). **No grievance data is reachable without authentication.**

### 4.1 Public Routes (Unauthenticated)

| Route | Purpose | Notes |
|---|---|---|
| `/` | Marketing landing page: value proposition, role explanations, CTA to register/login. Contains **no grievance data**. | SEO-indexed; Open Graph metadata. |
| `/login` | Email + password sign-in (Supabase Auth, PKCE). | Rate-limited: 5 attempts / 15 min. Redirects authenticated users to their role dashboard. |
| `/register` | Account creation with role selection (`citizen` or `contractor` only; `staff`/`admin` are provisioned — process `To Be Decided` by municipal IT, executed via admin tooling/seed). | Triggers email verification. |
| `/verify` | Email verification landing (handles Supabase confirmation callback; shows success/failure/resend states). | |
| `/forgot-password` | Request password reset email. | Always shows neutral success message (no account enumeration). |
| `/reset-password` | Set new password from emailed recovery link. | Token-gated; expired-token error state. |
| `/thank-you` | Post-registration confirmation page ("Check your email to verify your account"). | |
| `/404` | Not-found page (also the App Router `not-found.tsx` boundary). | Links back to `/` or role dashboard if authenticated. |

### 4.2 Citizen Routes — `/dashboard/citizen/*` (role = `citizen`)

| Route | Purpose |
|---|---|
| `/dashboard/citizen` | Overview: summary cards (open / in-progress / resolved counts), 5 most recent grievances, primary CTA "File a Grievance." |
| `/dashboard/citizen/grievances` | Full list of **own** grievances with status badges, filterable by status, sorted newest-first. |
| `/dashboard/citizen/grievances/new` | Grievance filing form (category selector, zone autocomplete, description, multi-image upload). |
| `/dashboard/citizen/grievances/[id]` | Live tracking detail: status timeline (expandable accordion of `status_history`), grievance photos, assigned contractor business name (once assigned), fix proof photos + closing notes (once resolved). Realtime-subscribed. |
| `/dashboard/citizen/profile` | Own profile: name, email (read-only), password change entry point. |

### 4.3 Staff Routes — `/dashboard/staff/*` (role = `staff`)

| Route | Purpose |
|---|---|
| `/dashboard/staff` | Operations overview: queue counts by status, overdue count, SLA-urgent shortlist. |
| `/dashboard/staff/queue` | **Triage queue**: all grievances in jurisdiction; multi-variable filters (zone × category × priority × status); live SLA countdown column; realtime inserts. |
| `/dashboard/staff/grievances/[id]` | Grievance workbench: full detail, priority setter, status transitions (`filed`→`triaged`), **contractor auto-suggestion panel**, bid list with award/reject actions, status history. |
| `/dashboard/staff/contractors` | Read-only directory of **approved** contractors (trade, zones, active work orders) for dispatch context. |
| `/dashboard/staff/profile` | Own profile. |

### 4.4 Contractor Routes — `/dashboard/contractor/*` (role = `contractor`)

| Route | Purpose |
|---|---|
| `/dashboard/contractor` | Overview: profile verification status banner, active work orders, open bids, recent outcomes. |
| `/dashboard/contractor/onboarding` | Contractor profile creation/edit (business name, license number, trade category, preferred zones). Shown/forced until a profile exists; read-only summary + resubmission flow if `rejected`. |
| `/dashboard/contractor/opportunities` | Feed of `triaged` grievances matching the contractor's `trade_category_id` **and** `preferred_zones` (RLS-enforced). Gated: visible only when profile `status = 'approved'`. |
| `/dashboard/contractor/opportunities/[id]` | Opportunity detail + bid submission form (`bid_notes`). |
| `/dashboard/contractor/bids` | Own bids with status (`submitted` / `awarded` / `rejected`), realtime-updated. |
| `/dashboard/contractor/work-orders` | Awarded grievances (`assigned` / `in_progress`), with "Start Work" and "Submit Fix Confirmation" actions. |
| `/dashboard/contractor/work-orders/[id]` | Work order execution: grievance detail, start-work action, fix confirmation form (before/after photos + closing notes). |
| `/dashboard/contractor/profile` | Account profile + contractor profile summary with verification status. |

### 4.5 Admin Routes — `/admin/*` (role = `admin`)

| Route | Purpose |
|---|---|
| `/admin` | System observability: platform metrics (grievances by status, average lifecycle time, overdue count, contractor response rate, pending verifications). |
| `/admin/contractors` | **Contractor verification queue**: `pending` profiles with full detail; approve / reject (with reason) actions; tabs for `approved` / `rejected`. |
| `/admin/users` | User management: searchable/paginated user list (name, email, role, confirmed_at), role visibility. Destructive actions (deactivation) policy: `To Be Decided`; Phase 1 ships read + search. |
| `/admin/grievances` | Full grievance oversight list (all statuses, all zones) with detail drill-in (read + audit focus). |
| `/admin/profile` | Own profile. |

### 4.6 Global Navigation Model

- **Public shell:** logo → `/`, Login, Register.
- **Authenticated shell:** role-scoped sidebar (desktop) / bottom-sheet drawer (mobile) listing only that role's routes; top bar with realtime connection indicator, user menu (profile, sign out).
- Unauthorized route access → redirect to the user's own role dashboard (never a data leak, never a 500).

---

## 5. Feature Specifications

Statuses are the canonical lifecycle enum everywhere: `filed → triaged → assigned → in_progress → resolved`. Transitions are forward-only in Phase 1 (no reopen/reject-to-citizen flow; such flows are `To Be Decided` for Phase 2). Every transition writes a `status_history` row.

### F-1. Grievance Filing (Citizen)

**Route:** `/dashboard/citizen/grievances/new`

**Inputs:**

| Field | Type | Validation (Zod, mirrored server-side) |
|---|---|---|
| `category_id` | Select (from `categories` table) | Required; must exist in `categories`. |
| `zone` | Autocomplete text (controlled municipal zone list) | Required; must match one of the configured zone values exactly. Zone list content: seeded at deployment; authoritative list `To Be Decided` by the municipality (schema + seed mechanism are specified in `architecture.md`). |
| `description` | Textarea | Required; 20–2000 characters; trimmed; plain text (sanitized). |
| `photos` | Multi-image drop-zone | 1–5 images required; each ≤ 5 MB; MIME in {`image/webp`, `image/jpeg`, `image/png`} validated client- and server-side; uploaded to Supabase Storage bucket `grievance-photos` under `grievances/{grievance_id}/...`. |

**Process & Outputs:**
1. Client validates with React Hook Form + Zod; images preview with per-file progress and removable thumbnails.
2. Server Action creates the `grievances` row with `status = 'filed'`, `priority = NULL` (set at triage), `citizen_id = auth.uid()`; photo paths stored in `photos_url` (text array).
3. A `status_history` row is written: `status = 'filed'`, `updated_by = citizen_id`, `notes = 'Grievance filed'`.
4. Redirect to `/dashboard/citizen/grievances/[id]` with success toast "Grievance filed successfully."
5. Confirmation email sent to the citizen via Resend.

**State transitions:** creates grievance in `filed`.

**Edge cases:** upload failure → per-file retry without losing form state; duplicate submission prevented via submit-button disable + idempotent Server Action guard; session expiry mid-form → redirect to `/login` with return-path preservation.

### F-2. Citizen Live Tracking & Status Progression

**Route:** `/dashboard/citizen/grievances/[id]`

**Displays:** grievance summary (category, zone, priority once set, submitted photos), **status timeline** rendered from `status_history` as an expandable accordion (each entry: status badge, timestamp, actor role label, notes), assigned contractor **business name** (from `contractor_profiles`) once `assigned`, and fix proof (before/after photos + contractor closing notes) once `resolved`.

**Realtime:** client subscribes to `postgres_changes` on `grievances` (row id filter) and `status_history` (grievance_id filter). UI updates in **< 2 s** of DB commit, announced via `aria-live="polite"` region ("Status updated to In Progress"). No page refresh required.

**Privacy boundary:** citizens never see bid lists, bid notes, or other contractors. Citizens see only: status, timestamps, status-history notes, assigned contractor business name, and fix proof. **Phase 1 has NO internal/staff-only notes** (binding decision D-A in `design.md` §3): the schema has a single `status_history.notes` field with no visibility flag, so every note written to history is visible to every RLS-authorized viewer of that grievance — staff and contractors must write notes accordingly. An internal-note visibility model is `To Be Decided` (Phase 2).

**Notifications:** transactional email on `assigned` and on `resolved` (resolution email links to the detail page with fix proof).

### F-3. Municipal Triage Queue (Staff)

**Route:** `/dashboard/staff/queue`

**Inputs/Controls:**
- Filters (combinable, URL-persisted as search params): **zone** (multi-select), **category** (multi-select), **priority** (`low`/`medium`/`high`/`critical`, multi-select), **status** (multi-select, default `filed` + `triaged`).
- Sort: SLA urgency (default), newest, oldest.
- Text search over description (ILIKE, debounced 300 ms).

**SLA countdown timers:** each row shows a live countdown to its SLA deadline. SLA windows (Phase 1 defaults; municipal calibration `To Be Decided`): overall resolution target 72 h from `filed`; per-priority deadlines — `critical` 12 h, `high` 24 h, `medium` 48 h, `low` 72 h. Untriaged grievances (`priority IS NULL`) use the 72 h overall clock. Rows past deadline render the **Overdue (Rose/Destructive)** treatment and sort to top under SLA-urgency sort. Timers tick client-side each second from server timestamps (see `SlaCountdown` in `components.md` §6 and the SLA pattern in `design-system.md` §9).

**Triage actions (row drill-in → F-3a workbench at `/dashboard/staff/grievances/[id]`):**
1. Set `priority` (required to triage).
2. Transition `filed → triaged` (Server Action; writes `status_history` with staff id + optional note).
3. Proceed to contractor matching (F-4) and bid management (F-6).

**Realtime:** queue subscribes to `grievances` inserts/updates; new filings appear live with an `aria-live="polite"` announcement and a "New grievance" row highlight.

**Validation:** priority must be set before `triaged`; status transitions validated server-side against the forward-only state machine (invalid transition → typed error, no write).

### F-4. Contractor Auto-Suggestion Algorithm (Staff)

**Location:** Suggestion panel on `/dashboard/staff/grievances/[id]` (visible for `triaged` grievances).

**Algorithm (deterministic, Phase 1):**
1. Candidate set: `contractor_profiles` where `status = 'approved'` **AND** `trade_category_id = grievance.category_id` **AND** `grievance.zone = ANY(preferred_zones)`.
2. Ranking: (a) fewest active work orders (grievances `assigned`/`in_progress` where `assigned_contractor_id = contractor`), ascending; (b) tiebreak by earliest `approved_at`.
3. Output: top 5 suggestions with business name, license number, preferred zones, active work order count, and whether they have already bid on this grievance.

**Outputs/Actions:** staff may wait for bids from suggested contractors or award an existing bid (F-6). Phase 1 includes **no push "invite to bid" notification**; suggested contractors see the grievance organically in their opportunities feed once it is `triaged` (visibility is RLS-driven). Direct-invite notifications: `To Be Decided` (Phase 2 candidate).

**Empty result:** panel shows an explicit empty state ("No approved contractors match this trade and zone") with guidance to broaden via Admin contractor recruitment — never silently blank.

### F-5. Contractor Profile Onboarding & Verification Lifecycle

**Route:** `/dashboard/contractor/onboarding` (contractor) + `/admin/contractors` (admin review, F-8).

**Inputs (contractor profile form):**

| Field | Validation |
|---|---|
| `business_name` | Required; 2–120 chars. |
| `license_number` | Required; 4–60 chars; alphanumeric + `-`/`/`; uniqueness enforced (duplicate → inline error). License format rules per municipal licensing authority: `To Be Decided`; Phase 1 enforces shape + uniqueness only. |
| `trade_category_id` | Required; must exist in `categories` (trades mirror grievance categories 1:1 in Phase 1). |
| `preferred_zones` | Required; 1–10 zones; each from the controlled zone list. |

**Verification lifecycle:** `pending → approved` or `pending → rejected`.
- On submit: profile `status = 'pending'`; contractor dashboard shows a persistent **"Verification pending"** banner; opportunities/bidding are **locked**.
- Admin approves: `status = 'approved'`, `approved_by = admin id`, `approved_at = now()`; contractor notified by email; opportunities unlock.
- Admin rejects: `status = 'rejected'` with a required reason (stored; surfaced to the contractor); contractor may edit and resubmit, which returns the profile to `pending`.

**Gating rule (RLS + UI):** a contractor with no profile or non-`approved` profile cannot read any grievance or submit any bid.

### F-6. Competitive Bidding Engine

**Contractor side** (`/dashboard/contractor/opportunities/[id]`):
- Visible grievances: `status = 'triaged'` matching trade + zone (RLS), plus grievances already involving this contractor.
- Bid submission: `bid_notes` required, 10–1000 chars (scope/approach/timeline; **no monetary escrow — settlement off-platform**). One active bid per contractor per grievance (unique constraint); re-submission edits are not allowed after award decisions.
- Bid statuses: `submitted → awarded` or `submitted → rejected`.

**Staff side** (`/dashboard/staff/grievances/[id]`):
- Bid list for the grievance: contractor business name, trade, zones, bid notes, submitted time, auto-suggestion match indicator.
- **Award** (one bid): atomic Server Action — awarded bid → `awarded`; all other `submitted` bids on the grievance → `rejected`; grievance `status → 'assigned'`, `assigned_contractor_id` set; `status_history` row written; awarded contractor emailed; rejected bidders see realtime status update.
- **Reject** (individual bid): bid → `rejected` without affecting grievance status.

**Validation & integrity:** award is only valid on a `triaged` grievance with the target bid in `submitted`; concurrency guarded transactionally (second concurrent award fails with a typed conflict error surfaced as a toast + refreshed state).

### F-7. Work Order Execution & Fix Confirmation (Contractor)

**Route:** `/dashboard/contractor/work-orders/[id]`

**Flow:**
1. **Start Work:** on an `assigned` grievance, contractor triggers `assigned → in_progress` (Server Action; `status_history` written; citizen sees live update).
2. **Submit Fix Confirmation:** on an `in_progress` grievance:

| Field | Validation |
|---|---|
| `before_photos` | 1–3 images; same file rules as F-1; bucket `fix-photos`, path `fixes/{grievance_id}/before/...`. |
| `after_photos` | 1–3 images; path `fixes/{grievance_id}/after/...`. |
| `closing_notes` | Required; 20–1000 chars. |

3. Server Action transitions `in_progress → resolved`, appends fix photo paths to the grievance record's `photos_url` namespace convention (before/after paths are distinguishable by path prefix), writes `status_history` (notes = closing notes), and emails the citizen a **resolution notification** linking to the detail page.
4. Phase 1 resolution is contractor-asserted with photographic proof; a citizen confirmation/dispute step is `To Be Decided` (Phase 2 candidate).

**State transitions owned by contractor:** `assigned → in_progress → resolved` (only for grievances where `assigned_contractor_id = `their contractor profile; RLS-enforced).

### F-8. Admin Supervision & System Observability

**Routes:** `/admin`, `/admin/contractors`, `/admin/users`, `/admin/grievances`

- **Contractor verification queue:** list of `pending` profiles (business name, license, trade, zones, registrant email, submitted date); detail drawer; **Approve** / **Reject (reason required, 10–500 chars)** actions with confirmation dialogs; tabs for `approved` and `rejected` history with `approved_by`/`approved_at` audit fields.
- **User management:** searchable (name/email), paginated (25/page) list with role and `confirmed_at`. Phase 1: read + search only; account deactivation/role-change workflows `To Be Decided`.
- **SLA health metrics (`/admin`):** grievance counts by status; average `filed → resolved` duration (rolling 7/30 days) vs. 72 h target; overdue count by priority; average time-in-state per lifecycle stage; contractor response rate (OBJ-2 definition); pending verification count with oldest-pending age. All computed from `grievances` + `status_history` + `contractor_bids` (SQL views, see `architecture.md`).
- **Grievance oversight:** full read access to all grievances and histories (audit focus; admins use staff tooling conventions for any intervention — Phase 1 admin writes are limited to contractor verification and reference-data management).

---

## 6. Exhaustive UI State Specifications

Every data-bearing view **must** implement all four states. The table below is the product requirement; the authoritative per-route elaboration is `screen-specs.md` (§2–§7), state patterns are in `design-system.md` §8/§10 and `screen-specs.md` §7, and component-level state contracts are in `components.md`.

| View | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Citizen overview | Shimmer skeleton: 3 stat cards + 5 list rows | "No grievances yet" + illustration + "File a Grievance" CTA | Inline error card + Retry | Stats + recent list render |
| Citizen grievance list | Skeleton rows (×6) with badge placeholders | Per active filter: "No grievances match this filter" + clear-filter action; unfiltered: first-time empty state | Error card + Retry | List with status badges |
| Filing form (F-1) | Category/zone option skeletons; submit shows inline spinner + disabled state | n/a (form) | Field-level inline errors (`aria-describedby`); upload failures per-thumbnail with retry; submit failure toast preserving all input | Redirect + success toast + confirmation email |
| Citizen detail (F-2) | Skeleton: header, photo grid, 4 timeline rows | n/a (404 boundary if no access/row — never "forbidden" leak) | Error boundary card + Retry; realtime disconnect indicator with auto-reconnect notice | Live timeline; `aria-live` announcements on updates |
| Staff queue (F-3) | Skeleton table rows (×10) incl. countdown placeholders | "Queue clear 🎉 No grievances match current filters" + reset filters | Error card + Retry; stale-data banner if realtime drops | Live rows, countdowns, new-row highlight |
| Staff workbench | Section skeletons (detail / suggestions / bids) | Suggestions: F-4 empty state. Bids: "No bids yet — contractors matching this trade and zone can now see this grievance" | Transition conflict → toast + state refresh; generic → boundary | Updated status + history append |
| Contractor onboarding | Form option skeletons | n/a | Inline field errors; duplicate license inline error | Pending banner state |
| Opportunities feed | Skeleton cards (×6) | "No matching opportunities right now — you'll see grievances in your trade and zones as they're triaged" | Error card + Retry | Card feed, realtime inserts |
| Bids list | Skeleton rows | "No bids submitted yet" + browse CTA | Error card + Retry | Rows with live bid status badges |
| Work orders | Skeleton cards | "No active work orders" | Error card + Retry | Cards with stage actions |
| Fix confirmation form | Submit spinner; per-file upload progress | n/a | Per-file retry; inline errors; conflict toast | `resolved` confirmation screen + citizen email dispatched |
| Admin verification queue | Skeleton rows | "No pending verifications" | Action failure toast + row state refresh | Row moves to approved/rejected tab |
| Admin users | Skeleton table | "No users match your search" | Error card + Retry | Paginated table |
| Admin metrics | Metric-card + chart skeletons | "Not enough data yet" per widget | Per-widget error with retry (no full-page failure) | Live metric cards |
| Auth pages | Button spinner on submit | n/a | Inline errors; rate-limit lockout message with remaining-time; neutral messaging on `/forgot-password` | Redirect to role dashboard / confirmation screens |

**Global rules:** shimmer skeletons (never spinners) for page/section loads per `design-system.md` §8; all destructive/irreversible actions (award bid, reject profile, resolve) require an accessible confirmation dialog; all mutation errors are recoverable without data loss; realtime disconnection shows a non-blocking indicator and auto-resubscribes.

---

## 7. Acceptance Criteria & Definition of Done

### 7.1 Acceptance Criteria (AC-1 … AC-10)

| ID | Criterion | Verification |
|---|---|---|
| **AC-1** | A verified citizen can file a grievance with category, valid zone (autocomplete), 20–2000-char description, and 1–5 images (≤5 MB; WebP/JPEG/PNG) in `filed` status, and immediately view it on their dashboard. Invalid inputs are blocked client- **and** server-side with accessible inline errors. | E2E test (Phase 4/9); Zod schema tests. |
| **AC-2** | A citizen sees **only their own** grievances. Direct URL access to another citizen's grievance returns not-found (no data, no existence leak). RLS enforces this at the database layer even if application code is bypassed. | RLS policy tests; E2E negative tests. |
| **AC-3** | Staff can filter the triage queue by any combination of zone, category, priority, and status; each row shows a live SLA countdown; overdue rows show destructive styling and sort to top under SLA-urgency sort. | E2E filter-matrix test; timer unit tests. |
| **AC-4** | Staff can set priority and transition `filed → triaged`; every transition writes a `status_history` row with actor and timestamp; invalid transitions (e.g., `filed → resolved`) are rejected server-side with a typed error. | State-machine unit tests; E2E. |
| **AC-5** | The contractor auto-suggestion panel lists only `approved` contractors whose `trade_category_id` matches the grievance category and whose `preferred_zones` include the grievance zone, ranked by fewest active work orders then earliest approval; the no-match empty state renders when applicable. | Algorithm unit tests; E2E. |
| **AC-6** | Contractor verification lifecycle: new profiles are `pending` with bidding locked; admin approval sets `approved_by`/`approved_at` and unlocks opportunities; rejection requires a reason visible to the contractor, who can edit and resubmit back to `pending`. | E2E lifecycle test; RLS gating tests. |
| **AC-7** | An approved contractor sees only `triaged` grievances matching their trade **and** preferred zones (plus their own awarded ones); can submit exactly one bid (10–1000-char notes) per grievance. Staff award atomically: awarded bid `awarded`, sibling bids `rejected`, grievance `assigned` with `assigned_contractor_id` set; concurrent double-award is impossible. | RLS tests; transactional concurrency test; E2E. |
| **AC-8** | The assigned contractor can transition `assigned → in_progress` and submit fix confirmation (1–3 before + 1–3 after photos, 20–1000-char closing notes) transitioning to `resolved`; the citizen receives a resolution email and can view fix proof on the detail page. | E2E full-lifecycle test. |
| **AC-9** | Realtime: citizen detail, staff queue, and contractor bids/opportunities views reflect relevant DB changes in **< 2 s** without refresh; updates are announced via `aria-live="polite"`; subscriptions clean up on unmount and auto-reconnect after disconnects without duplicate events. | Latency instrumentation test; subscription unit tests; manual disconnect test. |
| **AC-10** | Admin observability: metrics dashboard renders grievances-by-status, average resolution time vs. 72 h, overdue counts, and contractor response rate from live data; user management supports search + pagination; the full platform passes WCAG 2.1 AA audit (contrast, focus, keyboard, screen reader) and rate limiting locks login after 5 failed attempts in 15 minutes. | Metrics SQL tests; axe + manual audit; rate-limit integration test. |

### 7.2 Definition of Done (release gate, per feature and for Phase 1 overall)

A feature/release is **Done** only when all of the following hold:

1. **Functional:** all mapped ACs pass automated tests (unit + integration + E2E) and manual verification.
2. **Security:** RLS policies exist and are tested for every touched table; no Supabase service-role key usage outside server-only modules; Zod validation on every mutation boundary (client and Server Action).
3. **States:** Loading / Empty / Error / Success implemented per §6 for every touched view.
4. **Accessibility:** zero serious/critical axe violations; keyboard-complete; focus management in dialogs; `aria-live` on realtime surfaces; 4.5:1 text contrast.
5. **Design fidelity:** matches `design-system.md` tokens/grids/status colors, `components.md` component contracts, and `screen-specs.md` route specifications exactly; satisfies the Design Acceptance Definition in `design.md` §4.
6. **Quality gates:** TypeScript strict mode clean; ESLint clean; no placeholder/stubbed logic; no console errors in happy paths.
7. **Performance:** realtime surfaces meet <2 s broadcast; filing and triage flows functional under 50 tickets/hour load test (Phase 9).
8. **Documentation:** env vars, migrations, and seed steps reflected in repo README; `status_history` audit trail verified for every lifecycle transition.
9. **Traceability:** each phase's Definition of Done in `phases.md` signed off via the `INSPECT → IMPLEMENT → TEST IMMEDIATELY → FIX → RE-VERIFY → PROCEED` loop.

---

## 8. Open Items — `To Be Decided`

| Item | Owner | Blocking? |
|---|---|---|
| Authoritative municipal zone list (seed content) | Municipal operations | Blocks production seed only; dev uses a placeholder zone seed. |
| Per-priority SLA window calibration (defaults: 12/24/48/72 h) | Municipal operations | No — defaults ship; configurable via reference data. |
| Staff/admin account provisioning workflow | Municipal IT | No — Phase 1 uses admin-executed provisioning/seed. |
| License number format validation rules | Licensing authority | No — shape + uniqueness enforced in Phase 1. |
| Off-platform contractor settlement process | Municipal finance | No — out of product scope by non-goal #3. |
| Citizen confirmation/dispute of resolution; grievance reopen flow | Product (Phase 2) | No. |
| Internal/staff-only status-history notes (visibility flag + policy + UI) — Phase 1 has none; all notes are visible to authorized viewers (decision D-A, `design.md` §3) | Product (Phase 2) | No. |
| Direct "invite to bid" contractor notifications | Product (Phase 2) | No. |
| Admin user deactivation / role-change workflows | Product + Municipal IT | No — Phase 1 is read + search. |
