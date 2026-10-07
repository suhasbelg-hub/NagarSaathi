# NagarSaathi — Design System

**Version:** 1.0 · Phase 1  
**Product:** Accessible civic grievance and contractor-dispatch web application  
**Implementation:** Tailwind CSS · shadcn/ui (Radix) · Lucide React · Framer Motion  
**Baseline:** Light theme; dark-mode shipping is undecided.  
**Source:** Consolidated from supplied `design.md`, aligned to `PRD.md` and `architecture.md`.

---

## 1. Design principles

1. **Transparent by default:** every grievance view answers “where is this, who owns it, when is it due?”
2. **High legibility and civic trust:** body text is at least 16px; contrast and restrained status color take precedence over decoration.
3. **Semantic color discipline:** lifecycle and SLA hues are reserved; brand/interactive color is a distinct teal.
4. **Low cognitive load:** one primary action per view; progressive disclosure for detail.
5. **Never color alone:** status uses color + icon + text label.
6. **Calm realtime:** updates appear without layout jank; counters do not pulse; screen-reader announcements are polite.
7. **Mobile-capable, desktop-optimized:** citizen/contractor workflows are mobile-first; staff/admin workflows are desktop-first but remain usable at 360px.

## 2. Color tokens

### 2.1 Core palette

| Token | Value | Use |
|---|---|---|
| `--primary` | Teal 700 · `#0F766E` | Brand, primary buttons, links, focus accents. |
| `--primary-hover` | Teal 800 · `#115E59` | Hover/active primary fill. |
| `--background` | White · `#FFFFFF` | Page background. |
| `--surface` | Slate 50 · `#F8FAFC` | App shell/card wells. |
| `--card` | White · `#FFFFFF` | Card surface. |
| `--foreground` | Slate 900 · `#0F172A` | Main text. |
| `--muted-foreground` | Slate 600 · `#475569` | Secondary text; do not use lighter gray for text. |
| `--border` | Slate 200 · `#E2E8F0` | Dividers, card/input outlines. |
| `--ring` | Teal 600 · `#0D9488` | Keyboard focus ring. |
| `--destructive` | Rose 600 · `#E11D48` | Destructive actions and errors. |

Teal is the brand/action hue and is intentionally distinct from lifecycle colors. Do not use lifecycle hues for decorative accents or generic primary buttons.

### 2.2 Lifecycle and urgency palette (reserved semantics)

| State | Background | Foreground | Solid | Border | Lucide icon |
|---|---|---|---|---|---|
| **Filed** | Slate 100 `#F1F5F9` | Slate 700 `#334155` | Slate 500 `#64748B` | Slate 300 `#CBD5E1` | `FileText` |
| **Triaged** | Amber 100 `#FEF3C7` | Amber 800 `#92400E` | Amber 500 `#F59E0B` | Amber 300 `#FCD34D` | `ClipboardCheck` |
| **Assigned** | Blue 100 `#DBEAFE` | Blue 800 `#1E40AF` | Blue 600 `#2563EB` | Blue 300 `#93C5FD` | `UserCheck` |
| **In Progress** | Indigo 100 `#E0E7FF` | Indigo 800 `#3730A3` | Indigo 600 `#4F46E5` | Indigo 300 `#A5B4FC` | `Hammer` |
| **Resolved** | Emerald 100 `#D1FAE5` | Emerald 800 `#065F46` | Emerald 600 `#059669` | Emerald 300 `#6EE7B7` | `CheckCircle2` |
| **Overdue / critical SLA** | Rose 100 `#FFE4E6` | Rose 800 `#9F1239` | Rose 600 `#E11D48` | Rose 300 `#FDA4AF` | `AlarmClock` |

Foreground-on-background pairings meet at least 4.5:1 contrast. Badges use background + foreground + 1px border and icon + label. The Rose family also marks destructive actions/errors; Amber can mark non-lifecycle warnings, but badge meanings remain specific.

### 2.3 Related status colors

- **Priority chips** are outline treatments, visually subordinate to status: low = slate, medium = amber, high = indigo, critical = rose.
- **Bid status:** submitted = slate, awarded = emerald, rejected = rose.
- **Contractor verification:** pending = amber, approved = emerald, rejected = rose.
- Never reuse an informational badge as an interactive filter. Interactive filters are outline chips with selected state and `aria-pressed`.

## 3. Typography

**Typeface:** Inter variable, self-hosted via `next/font`; fallback `system-ui, sans-serif`. Do not load fonts from an external CDN. Tabular numerals are mandatory for SLA timers, metrics, and numeric table columns.

| Style | Size / line height | Weight | Use |
|---|---:|---:|---|
| Display | 36 / 44px | 700 | Landing hero only. |
| H1 | 30 / 38px | 700 | One page title per route. |
| H2 | 24 / 32px | 600 | Section headings. |
| H3 | 20 / 28px | 600 | Card/dialog titles. |
| H4 | 18 / 26px | 600 | Subsections/table group headings. |
| Body | 16 / 24px | 400 | Default text and form controls. |
| Body strong | 16 / 24px | 600 | Labels and emphasis. |
| Small | 14 / 20px | 400 | Secondary metadata and table cells. |
| Caption | 12 / 16px | 500 | Timestamps. Badge text: 12px/600, uppercase, 0.04em tracking. |

Minimum rendered size is 12px; all 12px text uses at least 600 weight and 4.5:1 contrast. Form fields remain at least 16px to prevent mobile browser zoom.

## 4. Spacing, shape, and elevation

### Spacing scale

Use a 4px base: **4, 8, 12, 16, 24, 32, 48, 64px**. Card padding: 24px desktop / 16px mobile. Section vertical rhythm: 32–48px.

### Radii

| Token | Value | Typical use |
|---|---:|---|
| `sm` | 6px | Inputs, chips. |
| `md` | 8px | Buttons, compact containers. |
| `lg` | 12px | Cards, dialogs, upload zone. |
| `full` | 9999px | Status badges, avatars. |

### Elevation

| Level | Treatment | Use |
|---|---|---|
| 0 | 1px border; no shadow | Table rows, list cards. |
| 1 | Border + `0 1px 2px rgb(15 23 42 / 0.06)` | Resting card. |
| 2 | `0 4px 12px rgb(15 23 42 / 0.10)` | Raised/hover card. |
| 3 | `0 12px 32px rgb(15 23 42 / 0.16)` | Dialogs, dropdowns, toasts. |

Elevation never replaces a border. Interactive cards transition elevation 1→2 on hover over 150ms ease.

## 5. Layout and responsive behavior

| Breakpoint | Columns | Gutter | Outer margin | Layout rules |
|---|---:|---:|---:|---|
| Mobile `<640px` | 4 | 12px | 16px | Single-column flow, top bar + bottom-sheet drawer, table rows become stacked cards. |
| Tablet `640–1023px` | 8 | 16px | 24px | Sidebar becomes icon rail or sheet; forms remain single column. |
| Desktop `≥1024px` | 12 | 24px | 32px | Content max-width 1200px, centered; 240px fixed sidebar; dense queues use full content width. |

- Minimum hit area: **44×44px** for buttons, links, row actions, upload controls, accordions, and icon buttons. Icon glyphs may be 20px but the hit area is padded.
- Desktop staff workbench becomes two columns at 1024px; below that it stacks. Opportunity grid: 3 columns desktop, 2 tablet, 1 mobile.
- Avoid horizontal page overflow at 320px and validate reflow at 200% zoom.

## 6. Motion

| Token | Timing/easing | Use |
|---|---|---|
| Fast | 150ms ease-out | Hover, press, badge transitions. |
| Base | 220ms ease-in-out | Accordion, drawer, dialog. |
| Slow | 350ms ease-in-out | Page transitions, skeleton-to-content crossfade. |
| Realtime highlight | Semantic tint fades over 1200ms | New/updated queue/feed rows. |

Respect `prefers-reduced-motion: reduce`: collapse transitions to opacity-only at ≤100ms; use static skeleton blocks and a static left-border accent for realtime highlighting for 3 seconds. No flashing above 3Hz.

## 7. Buttons and interaction states

Buttons use shadcn/ui variants. Radius `md`; label 16px/600 (`sm` 14px/600).

| Variant | Composition | Use |
|---|---|---|
| Primary | Teal 700 fill, white text; hover Teal 800; pressed scale 0.98 | One main action (File Grievance, Submit Bid, Approve). |
| Secondary | Slate 100 fill, Slate 900 text; hover Slate 200 | Supporting action. |
| Outline | Transparent, 1px border, Slate 900; hover Slate 50 | Filters, Cancel, neutral toggle. |
| Destructive | Rose 600 fill, white; hover Rose 700 | Reject or other destructive action; always confirm. |
| Ghost | Transparent, Slate 700; hover Slate 100 | Icon controls, row actions, chevrons. |

Sizes: `lg` 48px (primary form submit/mobile), `md` 44px (default), `sm` 36px (dense desktop table actions only). Every variant supports default, hover, focus-visible, active, loading, and disabled. Loading keeps the label, replaces the leading icon with a 16px spinner, sets `aria-busy="true"`, and prevents duplicate input. Disabled buttons do not rely on opacity alone; show why the action is unavailable.

## 8. Form and feedback patterns

- Forms are single-column, max-width 640px, grouped under H3 headings with 24px section spacing.
- Inputs are at least 44px high, 1px border, 6px radius, 12px horizontal padding. Labels are visible and sit 8px above controls. Placeholder is never the only label.
- Focus uses the global 2px teal ring. Error uses Rose 600 border and Rose 700 14px message with `AlertCircle`; message IDs are in `aria-describedby`, and the control sets `aria-invalid="true"`.
- On failed submit, focus first invalid field. With 3+ errors, show an error summary with count and links to fields. Required state is stated in label text.
- Zone autocomplete uses a controlled list in Popover + Command; keyboard support: Up/Down/Enter/Escape. Unmatched free text is invalid.
- Category/trade selection uses Select and includes category description.
- Upload zone: dashed 2px border, 12px radius, 160px minimum height, ImagePlus icon, “Drag photos here or browse”, and file constraints. Drag-over uses Teal 50 tint and primary border. Thumbnail is 96×96 with per-file progress, success/error, retry, and remove states.
- Toasts: bottom-right desktop/top mobile; elevation 3; default 5 seconds, error 8 seconds; always dismissible. Success uses `role="status"`, errors use `role="alert"`.
- Page/section loading uses layout-matched skeletons with a 1.4s shimmer, not a spinner. Mutation buttons may use inline loading.

## 9. Status, timeline, and SLA patterns

### Status badge

Pill with 28px `md` height (22px `sm` for dense tables), radius full, 12px/600 uppercase label, 16px leading icon, 1px semantic border. Status badge is informational only.

### Timeline

- Vertical 2px Slate 200 rail and 12px status-colored dot; newest/current status visually emphasized.
- Collapsed 44px minimum row: status badge, relative timestamp, actor role, chevron. Expanded panel: notes, absolute localized timestamp, associated thumbnails/lightbox.
- Show all five lifecycle positions, with future states as dashed ghost nodes. Use Radix Accordion semantics and polite live updates.

### SLA countdown

- Timer icon, tabular numerals, fixed-width time string, and accessible absolute deadline.
- More than 50% remaining: muted text. At/below 50%: Amber 700. At/below 20%: Rose 700 + AlarmClock. Overdue: solid Rose badge (“OVERDUE · …”) and 3px Rose 600 row edge.
- Visual per-second text is hidden from screen readers; an adjacent label announces only urgency-band changes. Use server timestamps/SLA window and drift-corrected client clock.

## 10. Cards, tables, navigation, and empty states

- Cards use 24px desktop/16px mobile padding, Slate 200 border, white surface. Interactive cards pair elevation 1→2 with 150ms transition.
- Desktop queue table: full width, 48px rows, sticky header, 14px cells, sortable headers with `aria-sort`; row hover Slate 50. Each row link has visible focus ring.
- Under 640px, queue rows become stacked cards: status/category, zone/relative time, SLA, chevron.
- Empty state uses embedded inline SVG (≤160px), civic line-art, Slate 300 strokes + one Teal 200 accent, no text baked into art; then heading, explanatory sentence, optional single primary CTA. Tone is constructive and specific.
- Skeleton blocks use Slate 200 and match final geometry to avoid layout shift.
- Desktop authenticated shell: 240px sidebar with 44px role links; active = Teal 50 background + Teal 700 text + 3px left accent. Top bar includes page title, connection indicator, and user menu. Mobile uses top bar and bottom-sheet drawer. “Skip to main content” is first focusable element.

## 11. Content standards

- Sentence case except uppercase canonical status badges.
- Canonical status labels: **Filed, Triaged, Assigned, In Progress, Resolved**; urgency label **Overdue**.
- Relative timestamps under 7 days (e.g. “3 h ago”) with absolute timestamp available on hover/expansion. History/audit detail uses absolute localized date/time.
- Errors state what happened and how to recover: “Couldn’t upload photo-3.jpg (6.2 MB). Maximum size is 5 MB — compress it and retry.”
- Empty-state language is constructive (“No grievances match this filter” + Clear filters), not blaming or vague.
- English only for Phase 1.

## 12. Accessibility requirements

- WCAG 2.1 AA. Text contrast ≥4.5:1; large bold text may use 3:1, but defined text tokens target 4.5:1. Non-text controls and state icons ≥3:1 against adjacent colors.
- Keyboard-complete flows, logical tab order, landmarks (`header`, labeled `nav`, `main`, `footer`), one H1, no skipped heading levels, skip link, and route-change focus to H1.
- Visible 2px `:focus-visible` outline using `--ring`, 2px offset; never remove focus indication without replacement.
- Every field error is programmatically associated; error summary links to fields; focus first invalid field.
- Realtime regions use `aria-live="polite"` and meaningful/coalesced announcements (maximum one per 2 seconds per region); connection changes announced once. Do not announce timer ticks per second.
- Images have meaningful alt text; decorative artwork is hidden from assistive technology.
- Radix dialogs trap focus, use `aria-labelledby`/`aria-describedby`, return focus, and close with Escape unless destructive confirmation rules disable overlay dismissal.
- Verification: automated axe checks across routes/mobile+desktop, keyboard pass per role, NVDA + VoiceOver on critical flows, contrast spot audit, 200% zoom and 320px reflow.

## 13. Implementation note

The supplied source file `design.md` is the design-system baseline. This file reorganizes those rules for handoff; if a future change appears to conflict, raise the discrepancy against the PRD and technical blueprint rather than silently introducing new semantic colors or interaction patterns.
