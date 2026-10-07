# NagarSaathi — Screen Specifications

**Scope:** Phase 1 · Single municipal deployment · Responsive web  
**Source of truth:** Product behavior in `PRD.md`; security/data boundaries in `architecture.md`; visual and interaction tokens in `design-system.md`; reusable contracts in `components.md`.

---

## 1. Global screen contract

### Shells and access

- **Public shell:** logo, Login, Register, page content, footer. Public marketing pages contain no grievance data.
- **Authenticated shell:** role-scoped desktop sidebar (240px), top bar, realtime connection state, user menu; on mobile use top bar + bottom-sheet navigation. The first focusable element is Skip to main content.
- Middleware redirects unauthenticated visitors to login and wrong-role users to their own dashboard. RLS remains authoritative. Do not expose grievance details anonymously or reveal whether an inaccessible record exists; use not-found treatment.
- Authenticated routes are non-indexable. Public sitemap contains public routes only.

### Shared page behavior

- One H1 per page. Route changes set the document title and move focus to the new H1.
- Every data-bearing view implements loading, empty, error, and success states. Use geometry-matched skeletons for page/section loads; mutation actions may show an inline spinner.
- Mutations preserve input where recoverable, use accessible inline validation/toasts, and revalidate the relevant route/data after success.
- Realtime surfaces subscribe only where specified, re-fetch through authorized queries on change, auto-reconnect, and announce meaningful changes politely. A reconnecting indicator is non-blocking.
- Use relative timestamps under seven days and provide an absolute time in title/expanded detail. All buttons, rows that act as links, and icon actions meet 44×44px minimum touch size.
- Exact colors, typography, spacing, and responsive rules are in `design-system.md`; shared component behavior is in `components.md`.

### Global status and SLA rules

Canonical lifecycle: **Filed → Triaged → Assigned → In Progress → Resolved**. Transitions are forward-only and every transition writes an actor/timestamp to history. Staff sets priority before triage. SLA defaults: critical 12h, high 24h, medium 48h, low 72h; an untriaged grievance with no priority uses the 72h overall clock. Overdue rows use Rose treatment and rise to the top under SLA sort.

---

## 2. Public and authentication screens

### 2.1 Marketing landing

**Route:** `/` · **Audience:** public · **Goal:** explain the service and route the visitor to registration/login.

- **Layout/content:** public header with NagarSaathi identity and Login/Register links; hero with clear value proposition; concise role explanations for citizen, staff, contractor, and admin; CTA area; supporting product explanation and footer.
- **Actions:** Register and Login. Registration lets the visitor choose citizen or contractor only; staff/admin are provisioned outside public registration.
- **States:** public page load; generic not-found/error boundaries. Do not show grievances, counts, maps, or user-specific data.
- **Responsive/accessibility:** landing hero uses display typography; stack role content at mobile; metadata/Open Graph. Primary CTA is clear and keyboard reachable.

### 2.2 Login

**Route:** `/login` · **Audience:** public/authenticated redirect · **Goal:** sign in and reach the user’s own dashboard.

- **Fields:** email, password; visible labels; submit action; Forgot password link; Register link.
- **Behavior:** Supabase Auth PKCE; preserve a safe return path; on success route by role. Authenticated visitors are redirected to their role dashboard.
- **States:** idle, submit/loading, invalid credentials, unverified email guidance, rate-limited lockout with remaining-time guidance, success/redirect. Rate limit: five failed attempts within the specified 15-minute window per auth protection rules.
- **Privacy/accessibility:** errors are inline and announced; do not leak account existence. Route-specific page title.

### 2.3 Registration

**Route:** `/register` · **Audience:** public · **Goal:** create a citizen or contractor account.

- **Fields:** name, email, password, role choice (`citizen` or `contractor`); use shared auth schema for exact password constraints rather than inventing new ones here.
- **Behavior:** submit creates account and starts email verification. On success route to `/thank-you`. Contractor profile onboarding is a later authenticated step; role is not admin-editable from this form.
- **States:** idle/loading, field errors, duplicate/failed submission, success. Rate protection applies to registration.
- **Accessibility:** role choice has a visible label and clear selected state; errors associate to fields.

### 2.4 Email verification

**Route:** `/verify` (callback handled by `/auth/callback`) · **Goal:** complete or recover email verification.

- **Content:** success/failure/expired or pending state; explain next step; provide resend/recovery action where supported.
- **Behavior:** valid callback exchanges PKCE code and establishes session; redirect by role. Unverified sessions cannot mutate protected data.
- **States:** processing, verified success, invalid/expired link, resend result, retry guidance.

### 2.5 Forgot password

**Route:** `/forgot-password` · **Goal:** request recovery without disclosing whether an account exists.

- **Fields:** email; submit; back-to-login link.
- **Success copy:** neutral “If an account matches that address, we’ll send recovery instructions.” Do not vary copy based on account existence.
- **States:** idle/loading, invalid email, neutral success, rate-limited/error with recovery guidance.

### 2.6 Reset password

**Route:** `/reset-password` · **Goal:** set a new password from a valid recovery token.

- **Fields:** new password and confirmation (if the shared schema uses confirmation); submit.
- **States:** token checking, valid form, field validation, update success, expired/invalid token with link back to recovery.
- **Behavior:** token-gated. On success show confirmation and a login path; never treat an expired link as a generic server error.

### 2.7 Registration thank-you

**Route:** `/thank-you` · **Goal:** reassure a new registrant that email verification is next.

- **Content:** “Check your email to verify your account”, short spam-folder/retry guidance if applicable, Login/return link.
- **States:** static confirmation and accessible status semantics; no grievance data.

### 2.8 Not found

**Route:** `/404` and App Router `not-found.tsx` · **Goal:** recover from missing routes or inaccessible resources.

- **Content:** concise not-found message; return to public home or, when authenticated, the user’s role dashboard.
- **Security:** do not distinguish “does not exist” from “not allowed” for protected grievance records.

---

## 3. Citizen screens

### 3.1 Citizen overview

**Route:** `/dashboard/citizen` · **Goal:** see personal grievance status and begin filing.

- **Layout/content:** page header; summary cards for Open, In Progress, Resolved; primary “File a Grievance” CTA; five most recent own grievances with category, zone, status, and relative date.
- **Actions:** file a grievance; open a recent item; view full list.
- **Loading:** 3 statistic skeletons and 5 list-row skeletons. **Empty:** “No grievances yet” with civic artwork and File a Grievance CTA. **Error:** inline card + Retry. **Success:** cards and recent list.
- **Realtime:** citizen’s own list/overview can reflect owned grievance changes; use polite announcements and no full-page reload.
- **Privacy:** own records only, guaranteed by RLS.

### 3.2 My grievances

**Route:** `/dashboard/citizen/grievances` · **Goal:** browse and filter the citizen’s own submissions.

- **Layout/content:** page header, status filter, newest-first list with status badge, category, zone, time, and detail link.
- **Actions:** change status filter, clear active filter, open detail.
- **Loading:** 6 skeleton rows. **Empty filtered:** “No grievances match this filter” + clear-filter action. **Empty unfiltered:** first-time empty state with filing CTA. **Error:** retry card. **Success:** filtered own records.
- **Privacy:** do not allow staff/contractor or other-citizen data into this list.

### 3.3 File a grievance

**Route:** `/dashboard/citizen/grievances/new` · **Goal:** submit a complete, evidence-backed report.

- **Layout/content:** single-column form, max 640px; sections for issue details and photos; sticky mobile submit bar. Fields:
  - Category: required category selector.
  - Zone: required controlled autocomplete; value must be an exact configured zone.
  - Description: required, trimmed plain text, 20–2000 characters.
  - Photos: required 1–5 images; WebP/JPEG/PNG; max 5 MB each.
- **Actions:** add/remove/retry photos; submit. Disable duplicate submission during request.
- **Validation:** shared Zod schema on client and server. Show per-field and per-file errors; error summary for 3+ errors; focus first invalid control. Preserve other form values after upload/submit failure.
- **Loading:** category/zone option skeletons; inline submit loading state. **Error:** field-level errors, per-thumbnail upload retry, recoverable submission error. **Success:** insert as `filed`, append history, confirmation email post-commit, toast and redirect to detail.
- **Data:** `priority = NULL`; citizen ownership set server-side; object paths are private and use server-generated names.

### 3.4 Grievance detail and tracking

**Route:** `/dashboard/citizen/grievances/[id]` · **Goal:** understand progress and inspect evidence.

- **Layout order:** header with category, zone, current status, priority once set; filed-photo grid; assigned contractor business name once assigned; expandable five-step status timeline; resolved proof section with before/after groups and closing notes.
- **Actions:** expand/collapse history; open photo lightbox; return to list. There is no dispute/reopen action in Phase 1.
- **Loading:** header, photo grid, and timeline skeleton (four placeholder history rows). **Error:** retry card or not-found for absent/inaccessible row. **Success:** live status detail. Realtime disconnect shows a non-blocking reconnect indicator and auto-retry.
- **Realtime:** subscribe to the grievance row and its history; re-fetch via RLS on events; announce changes politely (e.g. “Status updated to In Progress”).
- **Privacy:** show only this citizen’s record, public status/history notes, assigned contractor business name, and proof. Never show bids, bid notes, other contractors, or staff-only content. The source schema currently lacks a history-note visibility field; confirm before creating any internal-note feature.

### 3.5 Citizen profile

**Route:** `/dashboard/citizen/profile` · **Goal:** review personal account details and update supported fields.

- **Content:** name (editable), email (read-only), password change/recovery entry point.
- **Actions:** save name via own-profile action; enter password flow. No role change or email edit unless auth requirements are separately defined.
- **States:** loading profile, inline validation/save error, success confirmation, retry. Only the signed-in profile is visible.

---

## 4. Staff screens

### 4.1 Staff operations overview

**Route:** `/dashboard/staff` · **Goal:** orient staff to queue health and urgent work.

- **Content:** counts by grievance status, overdue count, SLA-urgent shortlist with category/zone/status/countdown; links to queue/workbench.
- **Actions:** open a listed grievance or the full triage queue.
- **States:** metric and shortlist skeletons; useful empty state when no urgent items; retryable data error; live success view.

### 4.2 Triage queue

**Route:** `/dashboard/staff/queue` · **Goal:** find and process relevant grievances efficiently.

- **Layout:** pinned filter toolbar above full-width desktop table; active-filter chips; result count. Under 640px, each row becomes a stacked card.
- **Filters:** multi-select zone, category, priority (`low`, `medium`, `high`, `critical`), status. Defaults: `filed` + `triaged`. Persist filters in URL search params.
- **Search/sort:** description text search, 300ms debounce; SLA urgency default, newest, oldest. Overdue items rise to the top for SLA sorting.
- **Row content:** grievance reference/category, zone, state/priority, filed time, live SLA countdown, clear link to workbench. Sortable table headers use `aria-sort`.
- **Realtime:** subscribe to grievance insert/update; new rows appear without refresh, highlight briefly, and announce “New grievance added to queue.” Connection state remains visible.
- **Loading:** 10 table-row skeletons with countdown placeholders. **Empty:** “Queue clear — no grievances match current filters” + reset. **Error:** retry card and stale-data indicator if realtime drops. **Success:** live rows/count.

### 4.3 Grievance workbench

**Route:** `/dashboard/staff/grievances/[id]` · **Goal:** triage one grievance, review matching contractors/bids, and make an auditable dispatch decision.

- **Desktop layout:** two columns at ≥1024px: left grievance description/photos/timeline; right priority/transition panel, suggestion panel, bids. Single-column below 1024px.
- **For `filed`:** show grievance facts and photos; require priority selection; primary action transitions `filed → triaged` and appends history. Do not offer award before triage.
- **For `triaged`:** show up to five approved contractor suggestions (trade+zone match, fewest active work orders then earliest approval); each includes business name, license, zones, active work count, prior-bid indicator. Show bid list and allowed reject/award actions.
- **Award:** confirmation names winning contractor and states that other submitted bids will be rejected. On success show assigned state/history; email winner and citizen. On conflict show typed error and refresh latest state.
- **Bid list:** contractor name, trade, zones, bid notes, submission time, match indicator. Individual reject leaves grievance triaged.
- **Loading:** section skeletons for detail/suggestions/bids. **Empty:** explicit no-match panel; no-bids explanation. **Error:** retry or recoverable conflict toast with current state refresh. **Success:** current status and history append.
- **Realtime:** grievance and bid changes update without refresh. Staff must not see unapproved contractor suggestions.

### 4.4 Approved contractor directory

**Route:** `/dashboard/staff/contractors` · **Goal:** look up verified contractor coverage.

- **Content:** approved contractors only; business name, trade, preferred zones, active work-order count/context.
- **Behavior:** read-only reference directory; no profile approval action here. Link to related workbench if contextual.
- **States:** table/card skeleton; no approved contractors empty state; retryable error; success list. Responsive table-to-card behavior.

### 4.5 Staff profile

**Route:** `/dashboard/staff/profile` · **Goal:** manage own supported profile details.

- **Content/actions:** own name and account information; email read-only; supported name update and password entry point only. No role management.
- **States:** loading, inline errors, save success, retry.

---

## 5. Contractor screens

### 5.1 Contractor overview

**Route:** `/dashboard/contractor` · **Goal:** see verification status, bids, and active work.

- **Content:** persistent verification banner; active work orders; open bids; recent outcomes; clear next action.
- **Gating:** missing profile routes/forces onboarding; pending/rejected profiles cannot browse opportunities or bid. Rejected state surfaces the admin reason and resubmission CTA.
- **States:** card skeletons; no-work/bid empty states; retryable error; success dashboard. Realtime updates for relevant bids/work orders.

### 5.2 Contractor onboarding/profile submission

**Route:** `/dashboard/contractor/onboarding` · **Goal:** submit or resubmit a trade/zone profile for verification.

- **Fields:** business name (2–120 chars), license number (4–60 chars; alphanumeric, `-`, `/`; unique), trade category, preferred zones (1–10 controlled values).
- **States:** no profile = editable form; pending = persistent verification state and no bid access; approved = read-only summary/profile access; rejected = display reason, edit and resubmit.
- **Actions:** submit sets status to pending; resubmission resets rejected profile to pending. Duplicate license is an inline field error.
- **Loading/error/success:** option skeletons; inline validation and action failure; pending confirmation. Verify server-side as well as client-side.

### 5.3 Opportunities feed

**Route:** `/dashboard/contractor/opportunities` · **Goal:** browse only eligible work.

- **Eligibility:** profile must be approved. Show triaged grievances that match both trade category and preferred zones, plus records already involving the contractor as permitted by RLS.
- **Layout:** cards in 3/2/1 columns across desktop/tablet/mobile. Each card: category, zone, filed time, SLA state where appropriate, two-line description excerpt, “View & Bid.”
- **Realtime:** event invalidates/re-fetches matching opportunities; polite announcement for meaningful new items.
- **States:** 6 card skeletons; empty text says matching opportunities appear as work is triaged; retryable error; success cards. If not approved, show gate/banner rather than an empty feed.

### 5.4 Opportunity detail and bid submission

**Route:** `/dashboard/contractor/opportunities/[id]` · **Goal:** inspect an eligible triaged grievance and submit one scoped bid.

- **Content:** category, zone, description, filed evidence, status and appropriate SLA context; bid form. No staff-only data or other contractors’ bids.
- **Bid field:** required `bid_notes`, 10–1000 characters, describing scope/approach/timeline. No monetary field/payment flow.
- **Actions:** submit exactly one bid per contractor/grievance. Existing bid state is displayed instead of a second submission; after award decisions, resubmission/edit is not allowed.
- **States:** detail/form loading, eligibility/not-found, field validation, action conflict or duplicate explanation, success confirmation and link to bids. If approval or grievance state changed, refresh and explain why bid is unavailable.

### 5.5 My bids

**Route:** `/dashboard/contractor/bids` · **Goal:** track decisions on the contractor’s own bids.

- **Content:** own bids only, status badge (`submitted`, `awarded`, `rejected`), grievance summary, submitted time; links to relevant opportunity/work order where allowed.
- **Realtime:** update bid status without refresh; announce award/rejection politely.
- **States:** row skeletons; “No bids submitted yet” + browse CTA; retryable error; success list.

### 5.6 Work orders list

**Route:** `/dashboard/contractor/work-orders` · **Goal:** manage awarded grievances assigned to this contractor.

- **Content:** assigned and in-progress work orders; category, zone, status, SLA, citizen-safe work detail, next action.
- **Actions:** for `assigned`, “Start Work”; for `in_progress`, “Submit Fix Confirmation.” Do not surface actions for another contractor’s work.
- **States:** card skeletons; “No active work orders”; retryable error; success list; realtime state changes.

### 5.7 Work-order execution

**Route:** `/dashboard/contractor/work-orders/[id]` · **Goal:** start assigned work and submit fix proof.

- **Content:** grievance summary/evidence, current status, timeline, execution controls.
- **Assigned state:** “Start Work” transitions to `in_progress` and appends history.
- **In-progress state:** fix form has Before photos (1–3), After photos (1–3), each WebP/JPEG/PNG ≤5MB, and required closing notes (20–1000 characters). Use sticky mobile submit bar where needed.
- **Success:** transition to resolved; append proof paths and closing notes to history; email citizen; show resolved confirmation/proof. Resolution is contractor-asserted in Phase 1.
- **States:** detail/form skeleton, per-file progress/retry, field errors, conflict refresh, submit loading, resolved confirmation. Assigned contractor ownership is enforced server-side.

### 5.8 Contractor profile

**Route:** `/dashboard/contractor/profile` · **Goal:** inspect account and verification summary.

- **Content:** name/email, business profile summary, trade/zones, license, verification status/reason as applicable; link to onboarding/resubmission when allowed.
- **Actions:** account name update; profile edit where state permits. Do not bypass admin verification through direct profile editing.
- **States:** loading, read/edit forms as allowed, validation/action errors, success.

---

## 6. Admin screens

### 6.1 Admin overview and metrics

**Route:** `/admin` · **Goal:** assess platform and SLA health.

- **Layout:** 12-column desktop grid, three metric cards across on desktop, with trend/visual widgets beneath; responsive stacked cards on narrow screens.
- **Metrics:** grievances by status; average `filed → resolved` time for rolling 7/30 days vs 72h target; overdue count/by priority; average time-in-state; contractor response rate; pending verification count and oldest pending age.
- **States:** each widget has independent skeleton, “Not enough data yet” empty, and retryable per-widget error. One metric failure must not blank the entire dashboard.
- **Behavior:** access is admin-only; show generated period and data context clearly. No unsupported chart claims or arbitrary units.

### 6.2 Contractor verification queue

**Route:** `/admin/contractors` · **Goal:** vet pending profiles and review prior decisions.

- **Layout/content:** tabs for Pending, Approved, Rejected; pending list shows business name, license, trade, zones, registrant email, submission date; selecting a row opens detail drawer/dialog.
- **Detail:** full profile information and audit fields (`approved_by`, `approved_at`, rejection reason as relevant). Keep approve/reject actions inside detail context.
- **Approve:** accessible confirmation; success moves row to approved, stores audit fields, emails contractor, unlocks eligibility.
- **Reject:** required 10–500 character reason; accessible confirmation; reason is shown to contractor; success moves row to rejected.
- **States:** row skeletons; “No pending verifications”; action failure toast + row refresh; success row moves to proper tab. Tabs remain keyboard accessible.

### 6.3 User management

**Route:** `/admin/users` · **Goal:** find and inspect application users.

- **Content:** searchable/paginated table, 25 users per page; name, email, role, `confirmed_at`.
- **Actions:** search by name/email, page navigation, inspect data. Phase 1 is read/search only: no deactivation or role-change control.
- **States:** table skeleton, “No users match your search,” retryable error, success results. Search/pagination state should remain usable on mobile (responsive rows/cards).

### 6.4 Grievance oversight

**Route:** `/admin/grievances` · **Goal:** audit all grievances across statuses/zones.

- **Content:** all-status/all-zone read-focused list with status, category, zone, priority, relevant timestamps; detail drill-in shows grievance, history, and evidence.
- **Actions:** inspect/filter/navigate as supported. Phase 1 admin grievance writes are limited; do not present a separate admin-only transition flow without product approval.
- **States:** table skeleton, useful empty state, retryable error, success. Protect signed photo URLs and apply admin authentication/RLS.

### 6.5 Admin profile

**Route:** `/admin/profile` · **Goal:** manage the admin’s supported own-profile details.

- **Content/actions:** own name/account info; email read-only; supported name update and password entry point. No role/deactivation action.
- **States:** loading, inline validation/save error, success confirmation.

---

## 7. Shared screen-state and responsive reference

| State | Pattern |
|---|---|
| Loading | Shimmer skeletons that match final page/section geometry; static blocks under reduced motion. Inline spinner only for a submitted mutation. |
| Empty | Specific, constructive copy and inline civic illustration; one clear next action where useful. Filtered empty state offers clear filters. |
| Error | Recoverable inline card/field message and Retry when safe; never expose raw SQL/Supabase errors. Mutation conflict refreshes authoritative state. |
| Success | Updated data/status, concise toast or confirmation, and relevant follow-up action. Emails are post-commit side effects. |
| Realtime disconnected | Non-blocking reconnect banner/indicator; auto-reconnect, one connection announcement, re-fetch on reconnect. |
| Mobile | 4-column grid, 16px margins, 12px gutters; one-column forms; bottom-sheet navigation; queue tables/cards; touch targets ≥44px. |
| Tablet | 8-column grid; side navigation may become an icon rail or sheet; forms remain single-column. |
| Desktop | 12-column grid, max width 1200px, 240px sidebar; staff workbench two-column; dense tables available. |

## 8. Cross-document implementation notes

1. **History-note visibility:** PRD requires citizens not to see staff-internal notes, but the supplied architecture schema has one `status_history.notes` field without a visibility flag. Do not include internal notes in citizen responses; resolve the data-contract question before implementing staff-only history notes.
2. **Zone list:** production zone names are municipal input; development seed zones are placeholders. UI must use the controlled list and must not add map/GIS controls.
3. **Open scope:** no citizen resolution confirmation/dispute/reopen flow, direct invitation to bid, payment/escrow, public grievance browsing, SMS, multi-language, multi-city, user deactivation, or role changes in Phase 1.
4. **Security:** photo storage is private; render short-lived signed URLs. All mutations validate server-side and repeat role/ownership checks; every touched data table remains RLS-protected.
