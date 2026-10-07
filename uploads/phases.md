# phases.md — NagarSaathi 2-Hour Sprint Build Plan

**Version:** 2.0 — **HARD TIME CONSTRAINT: 120 minutes total build time.**
**Governing documents — the 9-file base rules canon (`design.md` §1):** `PRD.md` (requirements & AC-1…AC-10), `architecture.md` (schema, RLS, realtime, security), `design.md` (governance & binding decisions), and the five UI/UX rule files: `UX-Design-Brief.md`, `userflow.md`, `design-system.md` (tokens), `components.md` (component contracts), `screen-specs.md` (route-by-route specs). Per `design.md` §2.4, this plan may **defer** spec items under its time-box (every deferral is logged in the Deferral Register, naming the spec section/component deferred) but may never **change** a rule.
**Mode:** Hackathon-grade execution. Every phase is time-boxed in minutes. The full grievance lifecycle (`filed → triaged → assigned → in_progress → resolved`) across all four roles MUST work end-to-end at minute 120. Everything that does not serve that demo path is explicitly deferred (§ Deferral Register).

---

## 0. Sprint Execution Rules (Mandatory)

The development loop compresses to a per-phase micro-cycle — still the same shape, executed in minutes:

> **`INSPECT (30s) → IMPLEMENT → TEST IMMEDIATELY (smoke) → FIX → RE-VERIFY → PROCEED`**

| Rule | Detail |
|---|---|
| **Time-box is law** | When a phase's box expires, ship what works, cut what doesn't (per that phase's "If running late" line), and move on. Never borrow time from later phases for polish. |
| **Smoke tests only** | No automated test suites during the sprint. "TEST IMMEDIATELY" = run the exact manual smoke check listed per phase in the browser/SQL editor. Full test suites are deferred. |
| **RLS is non-negotiable** | Security boundaries ship in Phase 1 with the schema. Scope cuts NEVER cut RLS — it is cheaper to ship policies with the DDL than to retrofit. |
| **No detours** | No kitchen-sink pages, no email templates, no load tests, no custom animations, no refactors. shadcn/ui defaults + the `design-system.md` §2 color tokens (core + lifecycle/urgency palettes) are "the design system" for the sprint. |
| **One throwaway account per role** | Create `citizen@test.in`, `staff@test.in`, `contractor@test.in`, `admin@test.in` early (Phase 3) and reuse them in every smoke check. Keep all four logged in across 4 browser profiles/incognito windows. |
| **Generate, don't hand-type** | Scaffold with `create-next-app`, `shadcn init/add`, and paste migrations/RLS verbatim from `architecture.md` §2–§3. The architecture doc is the source — do not re-derive anything. |
| **Commit at every phase gate** | One git commit per completed phase (instant rollback points). |

**Pre-sprint prerequisites (minute 0 — must already exist, not counted in the 120):** Supabase project created, GitHub repo created, Node + Supabase CLI installed, `architecture.md` open for copy-paste.

**Timeline overview:**

| Phase | Scope | Box | Clock |
|---|---|---|---|
| 1 | Scaffold + full DB migration + RLS + storage + seed | 15 min | 0:00–0:15 |
| 2 | Tokens + shadcn base + 4 shared components | 10 min | 0:15–0:25 |
| 3 | Auth (login/register) + middleware role guard | 15 min | 0:25–0:40 |
| 4 | Citizen: file grievance + list + detail/timeline | 20 min | 0:40–1:00 |
| 5 | Staff: queue + filters + triage + suggestions | 15 min | 1:00–1:15 |
| 6 | Contractor: onboarding, bids, award, fix confirmation | 25 min | 1:15–1:40 |
| 7 | Realtime subscriptions + SLA countdown | 10 min | 1:40–1:50 |
| 8 | Admin: verification queue + metrics cards | 7 min | 1:50–1:57 |
| 9 | Lightning QA pass (lifecycle smoke, role trespass) | 3 min | 1:57–2:00 |
| 10 | Deploy to Vercel | 0 min (runs during Phase 9) | — |

---

## Phase 1 — Scaffold + Database (15 min, 0:00–0:15)

**Objectives:** Running Next.js 15 app connected to Supabase with the COMPLETE schema, triggers, RLS policies, storage buckets, and seeds applied. This phase is the security foundation — nothing here gets cut.

**Dependencies:** Pre-sprint prerequisites.

**Subtasks:**
1. *(0–3 min)* `npx create-next-app@latest nagarsaathi --ts --tailwind --app --eslint` → `npm i @supabase/supabase-js @supabase/ssr react-hook-form zod @hookform/resolvers framer-motion lucide-react`. Fill `.env.local` (URL, anon key, service-role key).
2. *(3–10 min)* In the Supabase SQL editor, paste as ONE migration script (verbatim from `architecture.md` §2–§3, in this order): extensions + enums → `users`, `categories`, `zones`, `contractor_profiles`, `grievances`, `contractor_bids`, `status_history`, `login_attempts` → triggers (`handle_new_user`, `handle_user_confirmed`, `set_updated_at`, `enforce_grievance_transition`, `current_user_role`) → indexes → ALL RLS enables + policies → `award_bid` RPC, `get_assigned_contractor_name` RPC, `v_grievance_metrics` + `admin_get_metrics` RPC. Run once; fix any paste error immediately.
3. *(10–12 min)* Create private Storage buckets `grievance-photos` and `fix-photos` (5 MB limit, `image/webp,image/jpeg,image/png`) + paste the §3.1 object policies.
4. *(12–14 min)* Seed via SQL editor: 6 categories, 8 placeholder zones (production list remains `To Be Decided`).
5. *(14–15 min)* Create `lib/supabase/client.ts`, `server.ts`, `admin.ts` (`import "server-only"` first line) per `architecture.md` §7. Commit.

**Smoke check:** `select count(*) from categories;` → 6; `select count(*) from zones;` → 8; as `anon` role in SQL editor, `select * from grievances;` → 0 rows (RLS deny). `npm run dev` renders the default page.

**If running late:** skip `login_attempts` table + rate limiting entirely (accept Supabase Auth's built-in protections for the demo) and skip `v_grievance_metrics` (Phase 8 will do inline counts). Never skip RLS.

**DoD:** Migration ran clean, RLS deny confirmed, buckets exist, app boots.

---

## Phase 2 — Tokens + Base Components (10 min, 0:15–0:25)

**Objectives:** Just enough design system: status colors, app shell, and the 4 shared components every later phase needs. Token source: `design-system.md` §2–§7; component contracts: `components.md` §2–§3.

**Dependencies:** Phase 1.

**Subtasks:**
1. *(0–3 min)* `npx shadcn@latest init` then `add button input textarea select badge dialog table accordion skeleton sonner card tabs`.
2. *(3–5 min)* Add the six lifecycle/urgency token pairs from `design-system.md` §2.2 (plus the related status colors of §2.3: priority, bid, verification) as Tailwind utilities — or a single `STATUS_STYLES` record in `lib/utils.ts` mapping status → `bg/text/border/icon` classes. Set primary to teal-700 per `design-system.md` §2.1.
3. *(5–9 min)* Build 4 components only: `StatusBadge` (icon + label + color, all 6 states incl. Overdue), `EmptyState` (icon + headline + optional CTA — Lucide icon instead of custom SVG artwork), `AppShell` (simple sidebar with role-scoped links + topbar with sign-out; collapses to a top bar on mobile), `ConfirmDialog`.
4. *(9–10 min)* Root layout: Inter via `next/font`, `Toaster`, skip-link. Commit.

**Smoke check:** A scratch page renders all 6 `StatusBadge` variants with correct colors and visible focus rings on buttons.

**If running late:** drop `AppShell` sidebar to a plain horizontal nav; keep `StatusBadge` and `ConfirmDialog` (used by award/approve flows).

**DoD:** Status badges correct per `design-system.md` §2.2 and the `StatusBadge` contract in `components.md` §4; shell navigates; shadcn primitives installed.

---

## Phase 3 — Auth + Role Routing (15 min, 0:25–0:40)

**Objectives:** Register, login, logout, and bullet-proof role-prefix routing. Email flows are minimized for sprint speed.

**Dependencies:** Phases 1–2.

**Subtasks:**
1. *(0–2 min)* **Supabase dashboard: DISABLE "Confirm email"** for the sprint (re-enable post-demo — logged in Deferral Register). This removes `/verify`, `/thank-you`, and email latency from the critical path.
2. *(2–7 min)* `/login` + `/register` pages: RHF + Zod (email, password, name; register adds role select limited to `citizen`/`contractor`, passed as `raw_user_meta_data` so the Phase 1 trigger mirrors it). Server Actions `signIn`/`signUp`/`signOut` using the SSR cookie client (PKCE + HttpOnly handled by `@supabase/ssr`).
3. *(7–11 min)* `middleware.ts`: session refresh; unauthenticated → `/login`; role-prefix map (`citizen|staff|contractor → /dashboard/<role>`, `admin → /admin`); wrong role → redirect to own dashboard; authed users bounced off `/login`/`/register`.
4. *(11–14 min)* Create the 4 test accounts: register citizen + contractor through the UI; promote staff + admin by registering 2 more users then `update public.users set role='staff'|'admin' where email=...` in SQL editor (the sprint substitute for the provisioning workflow).
5. *(14–15 min)* Stub each role's dashboard index page ("Welcome, {role}"). Commit.

**Smoke check:** All 4 accounts log in and land on their own prefix; citizen manually visiting `/dashboard/staff` and `/admin` gets bounced to `/dashboard/citizen`; logout works.

**If running late:** cut `/forgot-password` + `/reset-password` (deferred) — login/register/logout + guard are the floor.

**DoD:** 4 working role accounts, role-guard matrix verified by hand.

---

## Phase 4 — Citizen Filing + Tracking (20 min, 0:40–1:00)

**Objectives:** AC-1 and AC-2 demo-ready: file a grievance with photos + zone + category; see it listed; open a live-ready detail page with a status timeline. Screen contracts: `screen-specs.md` §3.1–§3.4; flows: `userflow.md` §2.

**Dependencies:** Phases 1–3.

**Subtasks:**
1. *(0–3 min)* Zod schema `grievanceSchema` (category UUID, zone string validated against fetched zone list, description 20–2000, photos 1–5 / ≤5 MB / WebP-JPEG-PNG) — shared by form resolver and Server Action.
2. *(3–10 min)* `/dashboard/citizen/grievances/new`: category `Select`, zone `Select` (plain select of the 8 seeded zones — Command-autocomplete deferred; still a controlled list, satisfying the no-free-text rule), description textarea, **plain `<input type=file multiple accept=...>` with thumbnail previews** (drag-drop styling deferred). Upload direct-to-Storage from client (`grievances/{crypto.randomUUID()}/…` pre-generated id path), then `fileGrievance` Server Action: re-validate → insert `filed` row with `photos_url` → insert `status_history('filed')` → redirect.
3. *(10–14 min)* `/dashboard/citizen` + `/dashboard/citizen/grievances`: own grievances (RLS does the scoping), `StatusBadge`, newest-first, `EmptyState` + skeleton.
4. *(14–19 min)* `/dashboard/citizen/grievances/[id]`: header (category/zone/priority/status), photo grid via server-minted signed URLs, timeline from `status_history` (simple vertical list with status dots + timestamps + notes — accordion expansion deferred; all 5 pipeline steps shown with ghost states), assigned contractor name via `get_assigned_contractor_name` RPC, fix-proof section (renders when before/after paths exist). Foreign id → `notFound()`.
5. *(19–20 min)* Commit.

**Smoke check:** Citizen files a grievance with 2 photos in <2 min; it appears in list + detail with a "Filed" node. In a second browser, citizen B's URL-guess of that id → 404. Short description / 6 MB file rejected with inline errors.

**If running late:** cut photo lightbox and the overview stat cards; keep filing + list + detail + 404-isolation.

**DoD:** AC-1 happy path + validation negatives + AC-2 isolation verified by hand.

---

## Phase 5 — Staff Triage + Matching (15 min, 1:00–1:15)

**Objectives:** AC-3 (filters, static SLA display), AC-4 (priority + `filed→triaged`), AC-5 (auto-suggestions) demo-ready. Screen contracts: `screen-specs.md` §4.2–§4.3; flows: `userflow.md` §3.

**Dependencies:** Phase 4 (grievances exist).

**Subtasks:**
1. *(0–2 min)* `lib/sla.ts`: deadline (priority 12/24/48/72 h, null → 72 h), remaining-time formatter, overdue predicate. `lib/state-machine.ts`: `canTransition` forward-only map used by every transition action.
2. *(2–8 min)* `/dashboard/staff/queue`: table of all grievances (RLS grants staff full read) with columns status / category / zone / priority / SLA remaining (static text this phase, rose "OVERDUE" style when past) / filed-at. Filters as four `Select`s (zone, category, priority, status) held in URL search params; default `filed`+`triaged`. Search box deferred.
3. *(8–12 min)* `/dashboard/staff/grievances/[id]` workbench: detail + timeline (reuse Phase 4 components), priority `Select` + "Mark Triaged" button → `triageGrievance` action (guards `filed`, requires priority, writes history) ; bid-list panel placeholder section (filled Phase 6).
4. *(12–14 min)* Suggestion panel: query `contractor_profiles` where `status='approved' and trade_category_id=... and zone = any(preferred_zones)`, rank by active work-order count asc then `approved_at` asc, top 5; `EmptyState` for no match.
5. *(14–15 min)* Commit.

**Smoke check:** Staff filters by zone+priority and gets exact matches; triage without priority blocked; triage with priority flips badge to Triaged and adds a timeline row on the citizen's detail (after refresh — realtime comes in Phase 7); suggestion panel shows empty state (no approved contractors yet — correct at this point).

**If running late:** cut the staff overview page and `/dashboard/staff/contractors` directory; queue + workbench + suggestions are the floor.

**DoD:** AC-4 verified; AC-3 filter portion verified; AC-5 logic in place (fully verifiable after Phase 6 creates an approved contractor).

---

## Phase 6 — Contractor Lifecycle + Award + Fix Confirmation (25 min, 1:15–1:40)

**Objectives:** The longest box: AC-6, AC-7, AC-8. Onboarding → admin approval (minimal action) → scoped opportunities → bid → atomic award → start work → before/after fix confirmation → `resolved`. Screen contracts: `screen-specs.md` §5.1–§5.7, §6.2; flows: `userflow.md` §4–§5.

**Dependencies:** Phases 1–5.

**Subtasks:**
1. *(0–5 min)* `/dashboard/contractor/onboarding`: form (business name, license, trade `Select`, preferred zones multi-check) → `upsertContractorProfile` (→ `pending`; resubmit after reject → `pending`). Contractor dashboard shows pending/rejected banner; opportunities route renders a locked `EmptyState` unless `approved` (RLS enforces it regardless).
2. *(5–8 min)* Minimal admin approval NOW (so the pipeline unblocks; full admin UI in Phase 8): `approveContractor`/`rejectContractor` Server Actions + a bare `/admin/contractors` table (pending rows + Approve/Reject-with-reason via `ConfirmDialog`). Approve the test contractor (matching trade + zone of the Phase 4 grievance — choose deliberately).
3. *(8–13 min)* `/dashboard/contractor/opportunities` + `[id]`: list `triaged` grievances (RLS already scopes to trade+zone match); detail with bid form (`bid_notes` 10–1000) → `submitBid` (unique constraint → friendly "already bid" error). `/dashboard/contractor/bids` status list.
4. *(13–18 min)* Staff workbench bid panel: list bids with contractor business name + notes; **Award** via `award_bid` RPC through `awardBid` action with `ConfirmDialog` ("awards X and rejects N other bids") → bid `awarded`, siblings `rejected`, grievance `assigned` + `assigned_contractor_id`, history row. `rejectBid` for single bids.
5. *(18–24 min)* `/dashboard/contractor/work-orders` + `[id]`: assigned/in-progress grievances; **Start Work** → `startWork` (`assigned→in_progress`, history); **Fix confirmation form**: before photos (1–3) + after photos (1–3) via two file inputs → `fix-photos/fixes/{id}/before|after/…`, closing notes (20–1000) → `submitFixConfirmation` (`in_progress→resolved`, appends paths, history with notes). Citizen detail fix-proof section now renders real Before/After groups.
6. *(24–25 min)* Commit.

**Smoke check (THE money path):** With 4 windows open — contractor onboards → admin approves → contractor sees exactly the matching triaged grievance (and a second mismatched-zone grievance is NOT visible) → bids → staff awards (bid `awarded`, grievance `assigned`) → contractor starts work → submits 1 before + 1 after photo + notes → citizen detail shows **Resolved** with proof and a 5-row timeline `filed→triaged→assigned→in_progress→resolved`.

**If running late:** cut `rejectBid`, the bids-list page, and reject-profile resubmission UI (reject still works at DB level); the floor is onboard → approve → see → bid → award → start → resolve.

**DoD:** Full lifecycle verified end-to-end by hand; scoped visibility negative confirmed; award atomicity delegated to the RPC (already transactional from Phase 1).

---

## Phase 7 — Realtime + SLA Tickers (10 min, 1:40–1:50)

**Objectives:** The demo wow-factor and AC-9 core: live cross-role updates <2 s and ticking SLA countdowns. SLA/realtime patterns: `design-system.md` §9, `components.md` §6, `architecture.md` §5.

**Dependencies:** Phases 1–6.

**Subtasks:**
1. *(0–1 min)* Supabase dashboard: add `grievances`, `status_history`, `contractor_bids`, `contractor_profiles` to the Realtime publication.
2. *(1–5 min)* Minimal `hooks/use-realtime.ts`: `supabase.channel(name).on('postgres_changes', {…}, () => router.refresh()).subscribe()` with `removeChannel` in effect cleanup. **Strategy: every event triggers `router.refresh()`** — re-fetches RLS-scoped server data, which gives correctness + dedup for free (the §5.2 TTL-dedup cache and gap-healing refinements are deferred).
3. *(5–8 min)* Mount subscriptions: citizen detail (`grievances` id-filter + `status_history` grievance-filter), staff queue (`grievances` all), contractor bids/work-orders (`contractor_bids` + `grievances` contractor-filters), admin contractors (`contractor_profiles`). Add one polite `aria-live` region in the shell announcing "Updated just now" on refresh triggers.
4. *(8–10 min)* `SlaCountdown` client component on queue rows + workbench: `setInterval` 1 s, tabular-nums, amber ≤50% / rose ≤20% / rose OVERDUE badge past deadline (from `lib/sla.ts`). Commit.

**Smoke check:** Two windows: staff triages → citizen timeline updates without refresh (count seconds — must feel instant, <2 s); contractor bid appears on staff workbench live; award flips contractor's view live; queue countdowns visibly tick and an artificially backdated grievance (`update grievances set created_at = now() - interval '80 hours'` in SQL editor) shows OVERDUE styling.

**If running late:** keep citizen-detail + staff-queue subscriptions only (the demo narrative needs those two); static SLA text stays from Phase 5.

**DoD:** Cross-role live updates verified <2 s on the two primary surfaces minimum; unmount cleanup present; tickers tick.

---

## Phase 8 — Admin Center + Metrics (7 min, 1:50–1:57)

**Objectives:** AC-10 demo slice: real verification queue (upgrading Phase 6's bare table) and a metrics row. Screen contracts: `screen-specs.md` §6.1–§6.4.

**Dependencies:** Phases 1–7.

**Subtasks:**
1. *(0–3 min)* `/admin/contractors`: tabs Pending/Approved/Rejected, rows with business name/license/trade/zones, Approve + Reject-with-reason dialogs (already-built actions), realtime-refreshed.
2. *(3–5 min)* `/admin`: metric cards via `admin_get_metrics` RPC (or inline counts if the view was cut in Phase 1): counts per status, overdue count, pending verifications, resolved-under-72h indicator.
3. *(5–7 min)* `/admin/users`: simple table (name, email, role, created) with a client-side search input. `/admin/grievances`: reuse the staff queue table component read-only. Commit.

**Smoke check:** Metrics match reality (e.g., 1 resolved, 1 overdue backdated row); pending profile appears, approve moves it to the Approved tab live.

**If running late:** cut `/admin/users` and `/admin/grievances` (deferred); verification queue + metric cards are the floor.

**DoD:** Admin can run the verification lifecycle from a real UI; metrics render live data.

---

## Phase 9 — Lightning QA (3 min, 1:57–2:00)

**Objectives:** Final confidence pass on the exact demo script.

**Subtasks / Smoke script (run in order, all 4 windows):**
1. *(90 s)* Fresh lifecycle: citizen files (with photo) → appears live on staff queue → triage (priority high) → contractor sees it → bids → staff awards → start work → fix confirmation → citizen sees Resolved + before/after proof, 5 timeline rows.
2. *(45 s)* Negative sweep: citizen hits `/admin` → bounced; citizen B opens citizen A's grievance URL → 404; pending (register a 2nd) contractor's opportunities → empty/locked.
3. *(45 s)* Keyboard spot-check on filing form + award dialog (tab order, focus ring, Enter/Escape); fix anything broken ONLY if <2 min, else log it.

**DoD:** Demo script passes clean twice. **STOP CODING.**

---

## Phase 10 — Deploy (parallel, 0 min of the box)

Kick off at ~1:50 while Phase 8–9 run: push to GitHub → import to Vercel → set env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) → deploy → run the Phase 9 script once against the production URL. If the Vercel build fails with <5 min left, **demo from `npm run dev`** — a working local demo beats a broken deploy.

**DoD:** Live URL serving the lifecycle, or a deliberate local-demo fallback decision.

---

## Deferral Register (everything cut from the 2-hour box → post-sprint backlog)

All items remain fully specified in the 9-file canon (`PRD.md`, `architecture.md`, `design-system.md`, `components.md`, `screen-specs.md`, `userflow.md`, `UX-Design-Brief.md`) and are re-activated in priority order after the sprint:

| # | Deferred item | Source spec | Priority |
|---|---|---|---|
| D-1 | **Re-enable email confirmation** + `/verify`, `/thank-you`, `/forgot-password`, `/reset-password` flows | PRD §4.1 | P0 — before any real users |
| D-2 | Login rate limiting (`login_attempts`, 5/15 min) + CSP/security headers | architecture §8.1–8.2 | P0 — before any real users |
| D-3 | Transactional emails (filed/assigned/resolved/verification) via Resend | PRD F-1/F-6/F-7 | P1 |
| D-4 | Automated test suites: RLS matrix, state-machine units, Playwright E2E for AC-1…AC-10 | phases v1 Phases 1–9 | P1 |
| D-5 | Full WCAG 2.1 AA audit (axe + NVDA/VoiceOver + contrast + reduced-motion per `design-system.md` §12 verification protocol); sprint ships keyboard-usable shadcn defaults + focus rings + `aria-live` region only | design-system §12 | P1 |
| D-6 | Full-contract components per `components.md`: drag-drop `ImageDropzone` (per-file progress/retry, §5), `ZoneAutocomplete` (Popover+Command, §3 — sprint ships a controlled `Select`, decision D-B in `design.md` §3), `TimelineAccordion` expansion (§4), `PhotoLightbox` (§4), `QueueFilterToolbar` chips/search/sort (§6), `EmptyState` civic SVG artwork (design-system §10), Framer Motion polish (design-system §6) | components.md §3–§6 | P2 |
| D-7 | Realtime hardening: dedup TTL cache, gap-healing re-fetch on rejoin, `ConnectionIndicator` (components.md §2), scoped invalidation instead of `router.refresh()` | architecture §5.2 | P2 |
| D-8 | Load/security testing (50 tickets/hr, storage probes, header scans); latency instrumentation events | phases v1 Phase 9 | P2 |
| D-9 | Admin users/grievances oversight pages (if cut), staff overview + contractors directory, citizen stat cards, bids-list page | PRD §4 | P2 |
| D-10 | SEO: sitemap/robots/OG images; Vercel Analytics; landing page content | architecture §9 | P3 |
| D-11 | Production hardening: backups/PITR, rollback drill, runbook, real municipal zone list (`To Be Decided`), staff/admin provisioning workflow | phases v1 Phase 10 | P0 before municipal go-live |

**Non-negotiables that were NOT cut despite the clock:** full RLS on every table + storage policies (Phase 1), forward-only state-machine trigger, append-only `status_history` audit trail, Zod validation on both client and Server Actions, service-role isolation (`server-only`), role-guard middleware, 404-not-403 isolation, atomic `award_bid` RPC, and the complete 5-state lifecycle across all four roles.

---

## 2-Hour Traceability Matrix

| Acceptance Criterion | Demo-ready at | Status in sprint |
|---|---|---|
| AC-1 Grievance filing | Phase 4 (0:40–1:00) | ✅ Full (simplified upload UI) |
| AC-2 Citizen isolation (RLS) | Phases 1+4 | ✅ Full |
| AC-3 Filters + SLA countdowns | Phases 5+7 | ✅ Core (search box deferred) |
| AC-4 Priority + transitions + history | Phase 5 | ✅ Full |
| AC-5 Contractor auto-suggestion | Phase 5 (verified Phase 6) | ✅ Full |
| AC-6 Verification lifecycle | Phases 6+8 | ✅ Core (resubmit UI may be cut) |
| AC-7 Scoped visibility + atomic award | Phases 1+6 | ✅ Full |
| AC-8 Work orders + fix confirmation | Phase 6 | ✅ Full |
| AC-9 Realtime <2 s + cleanup | Phase 7 | ✅ Core (hardening → D-7) |
| AC-10 Admin observability + AA + rate limits | Phase 8 | ⚠️ Partial: metrics ✅, AA audit → D-5, rate limits → D-2 |
