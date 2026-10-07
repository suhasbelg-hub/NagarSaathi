# design.md — NagarSaathi Design Governance & Document Canon

**Version:** 2.0 — governance document
**Status:** The detailed design-system content formerly in this file (v1.0) has been consolidated, refined, and superseded by the five dedicated UI/UX rule files listed below. This file now defines the **document canon, precedence order, and binding design decisions** for the project. It intentionally contains no duplicate token tables — duplication caused drift; the UX files are now the single source for UI/UX detail.

---

## 1. The 9-File Base Rules Canon

Every requirement, screen, component, token, schema, policy, and plan for NagarSaathi Phase 1 comes from exactly these nine files. Nothing outside them is a project rule. AI coding agents and engineers MUST load the relevant file(s) before implementing and MUST NOT invent behavior not found in them.

| # | File | Layer | Authoritative for |
|---|---|---|---|
| 1 | `PRD.md` | Product | Vision, objectives/metrics, personas, routes, feature behavior (F-1…F-8), UI-state requirements, acceptance criteria AC-1…AC-10, non-goals, `To Be Decided` register. |
| 2 | `architecture.md` | Technical | System diagram, PostgreSQL DDL, RLS + storage policies, Server Action catalog, realtime strategy, folder structure, security hardening, SEO/deploy. |
| 3 | `design.md` (this file) | Governance | Document precedence, binding cross-document decisions, change control. |
| 4 | `phases.md` | Plan | The 2-hour sprint roadmap, time-boxes, scope cuts, Deferral Register, traceability. |
| 5 | `UX-Design-Brief.md` | UX | Experience strategy: outcomes, audiences, experience scope, core experience model, UX principles, handoff/acceptance definition. |
| 6 | `userflow.md` | UX | Role journeys, flow diagrams, branch/edge handling, error-recovery map, cross-flow invariants. |
| 7 | `design-system.md` | UX | ALL visual tokens: color (core + lifecycle/urgency palettes), typography, spacing/radii/elevation, grid/breakpoints, motion, buttons, form/feedback patterns, status/timeline/SLA patterns, content standards, accessibility requirements. |
| 8 | `components.md` | UX | The reusable component inventory and per-component behavior/accessibility contracts (shell, foundational, grievance/status, form/upload, SLA/queue/staff, contractor/admin components). |
| 9 | `screen-specs.md` | UX | Route-by-route layout, content, actions, validation, loading/empty/error/success states, responsive, realtime, and privacy behavior for every screen. |

`playbook.md` is the **operator's execution guide** for the 2-person sprint team. It is not a rules file; it drives the nine files above and must never contradict them.

## 2. Precedence & Conflict Resolution

When two files appear to disagree, resolve in this order — and record the resolution in §3 of this file rather than silently patching:

1. **Security & data boundaries:** `architecture.md` (schema, RLS, storage, auth) always wins. UI never widens access that RLS denies.
2. **Product behavior & scope:** `PRD.md` wins (features, lifecycle rules, non-goals, acceptance criteria).
3. **UI/UX detail:** `screen-specs.md` (per-route) > `components.md` (per-component) > `design-system.md` (tokens/patterns) > `userflow.md` / `UX-Design-Brief.md` (journey/strategy context).
4. **Plan vs. spec:** `phases.md` may *defer* spec items under its time-box (each deferral must be in its Deferral Register, naming the spec section/component deferred) but may never *change* a rule.

Hard rules that no file may override: the five-state forward-only lifecycle (`filed → triaged → assigned → in_progress → resolved`), append-only `status_history`, RLS on every table, the reserved lifecycle/urgency color semantics, the Phase 1 non-goals (no native apps, SMS, payments, multi-city, maps, public grievance access, multi-language), WCAG 2.1 AA, and English-only Phase 1 content.

## 3. Binding Cross-Document Decisions (Resolved)

These resolve the discrepancies flagged by the UX files (`UX-Design-Brief.md` §10, `screen-specs.md` §8, `userflow.md` §2.2, `components.md` §4):

| # | Question raised | Binding Phase 1 decision |
|---|---|---|
| D-A | **Status-history note visibility** — PRD v1.0 mentioned "staff-internal notes," but the schema has a single `status_history.notes` field with no visibility flag. | **Phase 1 has NO internal/staff-only notes.** Every `status_history.notes` value is visible to every viewer authorized by RLS to read that history row (citizen-owner, assigned contractor, staff, admin). Actors must write notes accordingly. An internal-note visibility model (flag column + policy + UI) is `To Be Decided` for Phase 2. `PRD.md` F-2 has been corrected to match. Do not build a visibility feature. |
| D-B | **Zone selection control** | The product rule is a controlled municipal zone list — never free text, never maps. The target control is `ZoneAutocomplete` (Popover + Command) per `components.md` §3. The 2-hour sprint may ship a plain `Select` over the same controlled list as a registered deferral (`phases.md` D-6); both satisfy the controlled-list rule. |
| D-C | **SLA calibration** | Defaults are binding until the municipality recalibrates: critical 12 h, high 24 h, medium 48 h, low 72 h; `priority IS NULL` uses the 72 h overall clock. Identical in `PRD.md` F-3, `architecture.md` §2.5/lib/sla, `design-system.md` §9, `screen-specs.md` §1. |
| D-D | **Dark mode** | Light theme only ships in Phase 1. Dark-mode shipping remains undecided (`design-system.md` baseline). Do not implement a theme toggle. |
| D-E | **Staff/admin provisioning** | Public registration is citizen/contractor only. Staff/admin are provisioned server-side (seed/admin tooling; sprint uses SQL promotion per `playbook.md` Phase 3). Workflow formalization `To Be Decided`. |
| D-F | **Zone list content** | Development uses 8 placeholder zones; the authoritative municipal list is supplied before production seed (`To Be Decided`, blocks production cutover only). |
| D-G | **Phase 2 candidates stay out** | Resolution dispute/reopen, direct bid invitations, user deactivation/role-change — excluded everywhere in Phase 1; any UI affordance for them is a spec violation. |

## 4. Design Acceptance Definition

A screen or component is implementation-complete only when it satisfies, simultaneously:

1. Its route contract in `screen-specs.md` (access, layout, actions, validation, all four UI states, responsive, realtime, privacy).
2. Its component contracts in `components.md` (behavior + accessibility semantics).
3. The tokens and patterns of `design-system.md` (no ad-hoc colors, sizes, type, or motion; lifecycle hues reserved; 44px targets; 2px focus ring).
4. The journey expectations of `userflow.md` (entry points, branches, error recovery).
5. The product acceptance criteria it maps to in `PRD.md` (AC-1…AC-10) and the security invariants of `architecture.md`.

## 5. Change Control

- Any proposed deviation is raised against this file first; if accepted, the owning file is edited and the decision logged in §3. Never fork a rule locally in code or in `playbook.md`.
- New semantic colors, interaction patterns, components, or routes require updating the owning UX file — `design-system.md`, `components.md`, or `screen-specs.md` — in the same change.
- `phases.md` Deferral Register is the only legitimate list of "specified but not yet built" items; every deferral names the spec section or component it defers.
