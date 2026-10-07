# NagarSaathi — UX Design Brief

**Product:** NagarSaathi (“Companion for Civic Change”)  
**Scope:** Phase 1 · Single municipal deployment · Responsive web  
**Status:** Derived UX brief for implementation  
**Inputs:** `PRD.md` v1.0, `design.md` v1.0, `architecture.md` v1.0

---

## 1. Executive summary

NagarSaathi makes a municipal grievance visible and accountable from the moment a citizen files it to the moment a contractor submits photographic proof of resolution. The experience joins four role-based workflows—citizen, municipal staff, contractor, and admin—on one auditable five-state lifecycle:

**Filed → Triaged → Assigned → In Progress → Resolved**

The UX should make three things immediately clear on every grievance surface: **what is its status, who owns the next action, and when is it due?** Citizens need a low-friction mobile filing and trustworthy tracking experience. Staff need a desktop-first triage workbench that exposes SLA risk and suitable contractors. Contractors need a relevant, mobile-capable opportunity and work-order flow. Admins need careful verification controls and a clear view of service health.

The product is a responsive web application, not a native app. Phase 1 is English-only, for one municipality, with controlled zone selection, private authenticated grievance data, email notifications, and no in-platform payments.

## 2. Product context and UX opportunity

### Problem

- Citizens file civic complaints without reliable visibility into what happens next.
- Staff face unprioritized queues and can miss SLA risk while matching work to contractors.
- Contractors encounter irrelevant work and unclear verification or award status.
- Fix claims lack consistent before/after evidence and a visible audit history.

### Opportunity

Replace opaque handoffs with a shared, role-appropriate record. Each participant sees the information and next action relevant to them; status changes update without a manual refresh; significant decisions have an attributable history; and resolution is supported by before/after photos.

### UX promise

- A citizen can file a complete grievance in under 3 minutes.
- The citizen can follow a five-state timeline and inspect resolution proof.
- Staff can triage by zone, category, priority, status, and SLA urgency, then dispatch from a relevant contractor/bid set.
- A verified contractor sees only matching opportunities and can submit proof from a phone or tablet.

## 3. Outcomes and success measures

| Outcome | Target | UX implication |
|---|---:|---|
| Faster grievance resolution | Average `filed` → `resolved` under 72 hours | Make ownership, priority, and remaining SLA visible; surface urgent work early. |
| Active contractor marketplace | More than 80% weekly response rate among eligible approved contractors | Keep matching rules legible; show only trade-and-zone-relevant opportunities. |
| Transparent status | DB commit → client-visible update under 2 seconds | Use realtime invalidation/re-fetch, visible connection state, and polite announcements. |
| Peak-load resilience | 50+ tickets/hour without filing or triage degradation | Preserve form input on recoverable failures; give queue operators compact, filterable views. |
| Accessible service | WCAG 2.1 AA across public and authenticated views | Keyboard-complete flows, clear labels/errors, high contrast, screen-reader status announcements. |
| Data isolation | Zero cross-role/citizen data leaks; RLS tests pass | Treat route guards as navigation only; database RLS remains the authorization boundary. |

Additional admin health indicators: median time-in-state, overdue count, contractor verification turnaround, and average bids per grievance.

## 4. Audiences and primary needs

| Audience | Context | Primary job | UX priority |
|---|---|---|---|
| **Citizen — Priya Sharma** | Mobile-first; files in a short break and checks status later | Submit a clear report with photos; know what is happening; see proof when fixed | Short single-column form, retained input on errors, readable timeline, clear email updates. |
| **Municipal staff — Ramesh Iyer** | Desktop, keyboard-heavy, works a high-volume municipal queue | Triage by urgency and jurisdiction; select a suitable contractor; avoid SLA surprises | Dense but legible queue, persistent filters, live SLA countdowns, focused workbench. |
| **Contractor — Suresh Patel** | Phone/tablet between field jobs | Get verified; see relevant jobs; bid; record work with photos | Trade/zone relevance, clear verification state, large touch targets, fast photo upload. |
| **Admin — Meera Krishnan** | Desktop, daily vetting and periodic leadership reporting | Verify contractors carefully; find users; understand SLA health | Review detail in context, reasoned decisions, auditable metrics, read-only user oversight. |

## 5. Experience scope

### Included in Phase 1

- Public marketing and account-access pages.
- Citizen filing, own-grievance list, live tracking, profile, and resolution proof.
- Staff overview, triage queue, grievance workbench, approved-contractor directory, and profile.
- Contractor profile onboarding/verification state, eligible opportunities, bids, awarded work orders, and fix confirmation.
- Admin metrics, contractor verification, read/search user management, grievance oversight, and profile.
- Supabase Auth email verification/reset, transactional email, private image storage, role-based routing/RLS, and realtime UI updates.

### Explicitly out of scope

- Native mobile applications; this is responsive web only.
- SMS, chat, or notification integrations beyond transactional email and Supabase Auth email.
- Payment, escrow, or settlement inside NagarSaathi; contractor settlement remains off-platform.
- Multi-city tenancy or complex jurisdiction hierarchy.
- GIS/map rendering; location is a controlled municipal-zone autocomplete.
- Public or anonymous access to grievance records.
- Additional languages, external integrations, or unapproved Phase 2 flows such as reopening/disputing a resolution or inviting contractors directly to bid.

## 6. Core experience model

### Lifecycle and ownership

| State | Primary owner / action | Citizen-facing meaning |
|---|---|---|
| `filed` | Citizen submits; staff reviews | Filed and awaiting municipal triage. |
| `triaged` | Staff assigns priority; matching contractors can view and bid | Reviewed and open for contractor bids. |
| `assigned` | Staff awards one submitted bid | A contractor has been selected. |
| `in_progress` | Assigned contractor starts work | Work is underway. |
| `resolved` | Assigned contractor submits required proof and notes | Work is marked complete; before/after proof is available. |

Transitions are forward-only. Every transition is recorded in `status_history`. Staff sets priority before moving `filed` to `triaged`. A bid award is atomic: one bid is awarded, other submitted bids are rejected, and the grievance becomes assigned. Phase 1 has no citizen dispute/reopen action.

### Role experience loops

- **Citizen:** File → track → receive assigned/resolved email → review fix proof.
- **Staff:** Monitor queue → filter/sort by urgency → set priority and triage → review matching contractors/bids → award/reject → monitor progress.
- **Contractor:** Register → verify email → submit profile → await admin decision → browse matching work → bid → start awarded work → submit before/after proof.
- **Admin:** Review pending contractor profiles → approve or reject with a reason → monitor service metrics → search users or inspect grievance history.

## 7. Information architecture summary

| Area | Routes |
|---|---|
| Public/auth | `/`, `/login`, `/register`, `/verify`, `/forgot-password`, `/reset-password`, `/thank-you`, `/404` |
| Citizen | `/dashboard/citizen`, `/dashboard/citizen/grievances`, `/dashboard/citizen/grievances/new`, `/dashboard/citizen/grievances/[id]`, `/dashboard/citizen/profile` |
| Staff | `/dashboard/staff`, `/dashboard/staff/queue`, `/dashboard/staff/grievances/[id]`, `/dashboard/staff/contractors`, `/dashboard/staff/profile` |
| Contractor | `/dashboard/contractor`, `/dashboard/contractor/onboarding`, `/dashboard/contractor/opportunities`, `/dashboard/contractor/opportunities/[id]`, `/dashboard/contractor/bids`, `/dashboard/contractor/work-orders`, `/dashboard/contractor/work-orders/[id]`, `/dashboard/contractor/profile` |
| Admin | `/admin`, `/admin/contractors`, `/admin/users`, `/admin/grievances`, `/admin/profile` |

All grievance reads require authentication and are scoped by RLS. A wrong-role route redirects to the user’s own dashboard; an inaccessible grievance should use a not-found experience rather than reveal its existence.

## 8. UX principles

1. **Transparent by default:** status, owner, and SLA state are visible at a glance.
2. **Legible and trustworthy:** body text is at least 16px; status is not communicated by color alone.
3. **Status colors stay semantic:** lifecycle/urgency hues are reserved; brand/primary actions use teal.
4. **One clear primary action:** use progressive disclosure rather than exposing every control at once.
5. **Calm realtime:** new information appears without layout jumps; announcements are polite and coalesced.
6. **Mobile-capable, desktop-optimized:** citizen/contractor tasks are mobile-first; staff/admin work surfaces are desktop-first but work at 360px.
7. **Recover without losing work:** field and upload errors explain the recovery action; mutation failures preserve form input where possible.

## 9. Layout, content, and accessibility direction

- **Breakpoints:** mobile `<640px` (4 columns), tablet `640–1023px` (8 columns), desktop `≥1024px` (12 columns, max content width 1200px). Desktop authenticated shell uses a 240px sidebar; mobile uses a top bar and bottom-sheet navigation.
- **Touch:** all interactive targets are at least 44×44px. Filing, bidding, and fix-confirmation forms use one column; desktop workbench becomes two columns at 1024px.
- **Language:** English for Phase 1. Sentence case, except canonical status badges, which are uppercase. Use relative dates under seven days and expose the absolute timestamp on hover/expansion; audit/history detail uses absolute dates.
- **Forms:** visible labels, helper text, field-linked errors, error summary for 3+ errors, focus the first invalid field. Required status is stated in the label, not by color alone.
- **Realtime:** show live/reconnecting state; announce meaningful changes with `aria-live="polite"`; throttle/coalesce to at most one announcement per 2 seconds per region. Do not announce SLA ticks every second.
- **Accessibility:** WCAG 2.1 AA; 4.5:1 text contrast, 3:1 non-text contrast, visible 2px focus ring, keyboard-complete interactions, reduced-motion support, image alt text, route focus to the new page heading.
- **Loading/empty/error/success:** every data-bearing view has all four states. Use geometry-matched shimmer skeletons for page/section loading, specific constructive empty copy, recoverable error UI, and clear success feedback.

## 10. Risks and decisions to resolve

| Item | UX/design impact | Current status |
|---|---|---|
| Authoritative municipal zone names | Determines autocomplete options and contractor coverage | Municipality to supply before production seed; development uses placeholder zones. |
| SLA calibration | Sets countdown deadlines and urgency | Defaults are critical 12h, high 24h, medium 48h, low 72h; municipality may calibrate. |
| Internal vs public history notes | Citizen detail must never expose staff-only notes | PRD describes internal-note visibility, but the architecture schema currently has one `status_history.notes` field and no visibility flag. Confirm whether Phase 1 needs an explicit visibility model; until then, do not create or expose staff-only notes through the citizen view. |
| Staff/admin account provisioning | Determines operational onboarding | Provisioned by municipal IT/admin tooling; public registration is citizen/contractor only. |
| Resolution dispute/reopen and direct bid invites | Could change lifecycle and notifications | Out of Phase 1; Phase 2 decision. |
| User deactivation/role changes | Admin user-management actions | Phase 1 is read/search only. |

## 11. Design handoff and acceptance

The companion files define implementation-ready details:

- `userflow.md` — role journeys, branches, and lifecycle handoffs.
- `components.md` — reusable component inventory and behavior contracts.
- `design-system.md` — tokens, visual rules, and accessibility patterns.
- `screen-specs.md` — route-by-route layout, content, actions, and states.

A screen is ready to implement when its access rules, primary action, validation, loading/empty/error/success states, responsive behavior, realtime behavior (where applicable), and accessibility semantics are covered. Phase 1 acceptance should be verified against PRD AC-1 through AC-10, RLS tests, and WCAG 2.1 AA checks.
