# NagarSaathi — Component Inventory

**Scope:** Reusable UI and domain components for Phase 1  
**Stack:** React · TypeScript · Tailwind CSS · shadcn/ui (Radix) · Lucide React · Framer Motion  
**Related:** `design-system.md`, `screen-specs.md`, `architecture.md` §7

---

## 1. Component conventions

- Shared visual tokens and states come from `design-system.md`; route-specific composition comes from `screen-specs.md`.
- Use shadcn/ui and Radix primitives for accessible interaction foundations. Domain components compose those primitives; avoid duplicating focus, dialog, select, accordion, and keyboard behavior.
- Separate informational badges from interactive filter chips. A display badge is never clickable; filters expose pressed/selected state and keyboard interaction.
- Every data-bearing component supports the states relevant to it: loading, empty, error, success. Mutations return typed results and map errors to field feedback or a recoverable toast.
- Every interactive target is at least 44×44px, except dense desktop-only table actions (36px control height is allowed where specified). Use visible `:focus-visible` treatment; never remove outlines without replacement.
- RLS controls data authorization. Client-side visibility is not an authorization mechanism.

Suggested project locations follow the technical blueprint: `components/ui`, `layout`, `grievances`, `forms`, `realtime`, `sla`, `staff`, `contractor`, `admin`, and `shared`.

## 2. Application shell and navigation

| Component | Responsibility and contract | Key behavior / accessibility |
|---|---|---|
| `SkipLink` | First focusable control; targets the page’s `<main>` landmark. | Visible on keyboard focus; target receives focus. |
| `PublicShell` | Public header, logo, Login/Register links, main, footer. | Contains no grievance data. Responsive header; logical heading order. |
| `AppShell` | Authenticated role shell; composes sidebar/drawer, top bar, page content, and toast/live regions. | Navigation is role-scoped; route changes focus the page `h1`; page title updates. |
| `Sidebar` | Desktop 240px role-scoped navigation. | 44px rows; active link uses teal fill/text and left accent; active state is programmatic. |
| `MobileNavSheet` | Mobile bottom-sheet navigation opened from the top bar. | Radix dialog/sheet semantics, focus trap, Escape/close behavior, safe-area padding. |
| `TopBar` | Page title, realtime connection state, user menu, mobile menu trigger. | Menu button has accessible name and 44px hit area; live state includes text, not just a dot. |
| `UserMenu` | Profile navigation and sign-out action. | Keyboard-operable menu; sign-out returns to public auth context. |
| `PageHeader` | One page `h1`, optional description, breadcrumbs/actions. | Single primary action at most; responsive wrapping. |
| `ConnectionIndicator` | `live` or `reconnecting` shell state. | Emerald + text for live; amber + “Reconnecting…” for interruption; state change announced once. |

## 3. Foundational UI components

| Component | Primitive / variants | Contract |
|---|---|---|
| `Button` | shadcn `Button`; primary, secondary, outline, destructive, ghost; `lg`, `md`, `sm`. | Loading preserves its label and sets `aria-busy`; disabled state includes a reason when needed. Destructive actions pair with confirmation. |
| `FormField` | Label + control + helper/error message. | Visible label; required communicated in label; helper/error IDs included in `aria-describedby`; invalid state sets `aria-invalid`. |
| `FormErrorSummary` | Alert block with count and anchor links. | Render for 3+ errors; on submit failure focus the first invalid field. |
| `ZoneAutocomplete` | Radix/shadcn `Popover` + `Command`. | Controlled municipal zone values only; type to filter; Up/Down/Enter/Escape; unmatched text is invalid. |
| `CategorySelect` | shadcn `Select`. | Lists configured category/trade name and one-line description. |
| `MultiSelectFilter` / `FilterChip` | Selectable filter control + outline toggle chip. | Supports multi-value selection; chip uses `aria-pressed`; chip remove action has a name. |
| `Dialog` / `ConfirmDialog` | Radix `Dialog` / `AlertDialog`. | Focus trap/return; title and description wired; least-destructive initial focus; destructive confirmation states the consequence. |
| `Accordion` | Radix accordion. | Native button/region semantics, `aria-expanded`, 44px minimum header. |
| `Tooltip` | Radix tooltip. | Supplemental only; never the sole way to access essential information. |
| `ToastRegion` | Sonner-style toast surface. | Success `role="status"`; error `role="alert"`; dismiss button; 5s default/8s error; bottom-right desktop, top mobile. |
| `Skeleton` | Geometry-matched slate blocks. | Shimmer for 1.4s; reduced motion becomes static; do not substitute a spinner for page/section loading. |
| `EmptyState` | Inline civic SVG, heading, sentence, optional one primary CTA. | Specific, constructive copy; artwork has alt/hidden semantics as appropriate. |
| `ErrorState` | Inline error card, brief recovery instruction, Retry when safe. | Do not expose raw database errors; preserve user work on recoverable mutations. |
| `Card` | Bordered surface with `elevation-1`; optional interactive elevation. | Interactive cards use a clear focus treatment and only one nested link/action pattern. |
| `DataTable` | Accessible table, sortable headers, responsive card transformation. | `aria-sort`; sticky desktop header; mobile row cards under 640px. |

## 4. Grievance and status components

### `StatusBadge`

- **Input:** canonical grievance status; optional `sm` or `md` size.
- **Display:** lifecycle-specific icon + uppercase label + status-tint background/foreground/border. It is informational and non-interactive.
- **Mapping:** Filed/FileText; Triaged/ClipboardCheck; Assigned/UserCheck; In Progress/Hammer; Resolved/CheckCircle2. Overdue uses the separate SLA treatment.
- Do not use lifecycle colors for unrelated decoration or use color without icon and text.

### `PriorityChip`

- Outline-style, subordinate to the status badge. Values: low/slate, medium/amber, high/indigo, critical/rose. Display only unless paired with a dedicated priority selector.

### `BidStatusBadge` and `VerificationBadge`

- Bid states: submitted/slate, awarded/emerald, rejected/rose.
- Verification states: pending/amber, approved/emerald, rejected/rose.
- These remain text/icon encoded; do not imply that a bid state is a grievance lifecycle state.

### `GrievanceSummary` / `GrievanceCard`

- Shows category, zone, description excerpt, status, priority when set, relative time, and SLA when the viewer is a staff user or the screen calls for it.
- Citizen list/dashboard cards expose only the citizen’s own data. Contractor opportunity cards expose only RLS-eligible jobs. Staff/admin variants may show operational details.
- Mobile card stacks status/category, zone/time, SLA, then chevron/action. Description excerpts clamp to two lines on opportunity cards.

### `TimelineAccordion`

- **Input:** authorized `status_history` entries and current lifecycle state.
- Render all five lifecycle positions; completed/current entries use real status, future entries render as dashed ghost nodes. Emphasize the newest/current state.
- Each entry shows status badge, relative time (absolute timestamp on hover/expansion), and actor role. Expansion reveals permitted notes and associated photos.
- Resolved entry supports fix-proof thumbnails; clicking opens `PhotoLightbox`.
- Realtime additions are announced with `aria-live="polite"`; avoid announcing non-public/internal notes to citizens.
- Architecture note: the supplied database schema has a single history `notes` field and no visibility flag. Do not implement staff-only history notes in the citizen payload unless a visibility contract is added.

### `PhotoGrid` and `PhotoLightbox`

- `PhotoGrid` labels citizen uploads and separates “Before photos” from “After photos” for resolved work.
- `PhotoLightbox` is an accessible dialog with next/previous and close controls; focus stays within the dialog and returns to the trigger.
- Use meaningful alt text (e.g. “Grievance photo 2 of 4”, “Before photo 1”, “After photo 2”). Images use short-lived signed URLs; never assume a public bucket.
- Responsive grid; before/after groups sit side by side on desktop and stack on mobile.

## 5. Form and upload components

### `ImageDropzone`

- **Variants:** grievance upload (`1–5`) and fix confirmation (`before 1–3`, `after 1–3`).
- Dashed 2px border, minimum 160px high; button semantics; click/Enter/Space opens picker; drag-over uses teal tint/border.
- Accept WebP/JPEG/PNG, maximum 5 MB per file. Validate client-side for prompt feedback and enforce again server/storage-side.
- Each 96×96 thumbnail has filename, progress, completion, or error; retry/remove controls retain 44px hit areas. Invalid files receive a per-file reason; never silently drop them.
- Screen-reader label identifies the upload zone; list is described; upload outcomes use a polite live region.

### `TextAreaField` / `TextInputField`

- Used for description, bid notes, closing notes, rejection reason, and profile inputs.
- Show length guidance where constrained; trim/validate on the server as well as through the shared Zod schema.
- Do not put required labels or instructions only in placeholders.

### `SubmitBar`

- Optional sticky mobile action area for long filing/fix forms. Respects safe areas and does not cover fields or errors; primary button is at least 48px high.

## 6. SLA, queue, and staff components

### `SlaCountdown` / `OverdueBadge`

- **Input:** server timestamp/deadline and drift-corrected client clock.
- Tabular numerals, fixed width, timer icon; under one hour may render minutes/seconds. Deadline is available as an absolute timestamp via tooltip/accessible text.
- Urgency: above 50% remaining = muted; at/below 50% = amber; at/below 20% = rose; overdue = solid rose badge and 3px rose row edge.
- Ticking visual text is `aria-hidden`; a visually-hidden live label updates only when urgency band changes. Never announce every second.

### `QueueFilterToolbar`

- Controlled combinable filters for zone/category/priority/status, debounced description search, sort selection, removable active chips, result count.
- Writes filters to URL search params. Default statuses: filed and triaged; default sort: SLA urgency.
- Result-count/filter changes are politely announced; clear-all is keyboard-accessible.

### `StaffQueueTable` / `QueueRow`

- Desktop table uses 48px rows and sticky sortable header; each row opens the grievance workbench with a visible row focus indicator.
- Include category, zone, status, priority, age/SLA, and identifying summary fields as specified by the route. Overdue rows sort first under urgency sorting.
- Realtime inserted/updated rows highlight briefly; mobile becomes stacked cards.

### `ContractorSuggestionPanel`

- Visible for a triaged grievance. Show up to five approved trade-and-zone matches, ranked by fewest active work orders then earliest approval.
- Each suggestion includes business name, license, preferred zones, active work-order count, and whether they have already bid.
- No-match state explicitly says no approved contractor matches this trade and zone. No “invite to bid” action in Phase 1.

### `BidList` / `BidRow`

- Staff workbench view includes contractor business name, trade, zones, notes, submitted time, and match indicator with award/reject actions.
- Contractor view shows only the current contractor’s own bids and their statuses. Realtime changes are reflected without refresh.
- Award action invokes a confirmation describing that other submitted bids will be rejected; conflicts refresh the latest state.

## 7. Contractor and admin components

| Component | Responsibility / behavior |
|---|---|
| `VerificationBanner` | Persistent pending/rejected/approved state on contractor surfaces; rejected state includes the reason and resubmission CTA. Pending/non-approved profiles cannot see opportunities or submit bids. |
| `OpportunityCard` | Category, zone, filed time, SLA state, description excerpt (2-line clamp), “View & Bid”; grid is 3/2/1 columns desktop/tablet/mobile. |
| `BidForm` | Required 10–1000-character notes; shows no monetary field; one bid per contractor per grievance. |
| `WorkOrderCard` | Awarded job summary and current state; “Start Work” or “Submit Fix Confirmation” only when valid for status/owner. |
| `FixConfirmationForm` | Separate before/after upload zones (1–3 each) and required 20–1000-character closing notes; per-file progress/retry; confirmation/error states. |
| `VerificationQueue` | Pending/approved/rejected tabs, submission details, searchable/scrollable list if required by volume; selecting a row opens detail context. |
| `ProfileReviewDrawer` | Business/license/trade/zones/registrant/submitted date; approval and reason-required rejection controls live in detail context only. |
| `VerificationDecisionDialog` | Accessible confirmation for approve or reject; reject collects 10–500-character reason and states the consequence. |
| `MetricsGrid` / `MetricCard` | Status counts, rolling resolution time vs target, overdue by priority, time-in-state, response rate, pending verification age. Each card/widget owns loading, empty, and error states. |
| `UsersTable` | Search name/email, 25-row pagination, name/email/role/confirmed date; read-only in Phase 1. |
| `GrievanceOversightList` | Admin read/audit view across all zones/statuses; detail drill-in is read-focused in Phase 1. |

## 8. Responsive and accessibility behavior checklist

- Breakpoints: `<640px` mobile cards/drawer; `640–1023px` tablet sheet or icon rail; `≥1024px` 240px sidebar and multi-column layouts.
- Touch targets: 44px minimum; 48px for large/mobile primary submit buttons. Dense 36px controls are desktop-table-only.
- All inputs have visible labels; errors and helper text are associated through `aria-describedby`; invalid fields use `aria-invalid`.
- One `h1` per route; landmarks include header, labeled navigation, main, footer; keyboard focus follows visual/logical order.
- Keyboard focus is a visible 2px ring with offset; dialogs trap and restore focus; Escape closes non-destructive dialogs.
- Realtime surfaces include polite live regions; toast roles distinguish status vs alert; notifications are throttled/coalesced.
- Reduced motion is honored. Skeletons become static and realtime highlights become a stable accent.
- Images have useful alt text; purely decorative SVG is hidden from assistive technology.
